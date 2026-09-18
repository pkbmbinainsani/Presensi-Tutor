import { AttendanceRecord, Tutor, PKBMInfo, ClassLocation, ScheduleItem } from '../types';
import { INITIAL_TUTORS, PKBM_CONFIG, SAMPLE_ATTENDANCE_RECORDS, INITIAL_CLASS_LOCATIONS } from '../data/mockData';
import { parseScheduleCsv, generateScheduleTemplateCsv } from './csvScheduleParser';
import { getWibToday, normalizeDateString, getDayNameFromDateStr, getDateForDayInCurrentWeek } from './dateUtils';
import {
  fetchTutorsOnline,
  upsertTutorOnline,
  deleteTutorOnline,
  fetchLocationsOnline,
  upsertLocationOnline,
  deleteLocationOnline,
  fetchAttendanceOnline,
  insertAttendanceOnline,
  deleteAttendanceOnline,
  fetchPKBMInfoOnline,
  upsertPKBMInfoOnline,
  fetchSchedulesOnline,
  upsertScheduleOnline,
  saveAllSchedulesOnline,
  deleteScheduleOnline,
  clearAllSchedulesOnline
} from './supabase';

const STORAGE_KEYS = {
  ATTENDANCE: 'pkbm_bina_insani_attendance_v2',
  TUTORS: 'pkbm_bina_insani_tutors_v2',
  CONFIG: 'pkbm_bina_insani_config_v2',
  LOCATIONS: 'pkbm_bina_insani_locations_v2',
  SCHEDULES: 'pkbm_bina_insani_schedules_v1',
  SCHEDULES_INITIALIZED: 'pkbm_bina_insani_schedules_init_v1',
  DELETED_SCHEDULES: 'pkbm_bina_insani_deleted_schedules_tombstone_v1',
  ALL_SCHEDULES_CLEARED: 'pkbm_bina_insani_all_schedules_cleared_v1',
};

// Remove any lingering legacy dummy keys from older version v1
try {
  localStorage.removeItem('pkbm_bina_insani_attendance_v1');
  localStorage.removeItem('pkbm_bina_insani_tutors_v1');
  localStorage.removeItem('pkbm_bina_insani_locations_v1');
} catch (e) {
  // Ignore
}

// -------------------------------------------------------------------
// Synchronous Local Storage Access (Fast Read / Offline Cache)
// -------------------------------------------------------------------

// In-memory cache for base64 photos to prevent localStorage quota exhaustion (5MB limit)
const attendancePhotoCache = new Map<string, string>();

/**
 * Safely saves attendance records to localStorage.
 * If the payload exceeds the browser's 5MB localStorage quota (due to base64 images),
 * it stores a slimmed metadata cache without bulky data URLs, ensuring all attendance rows
 * are reliably preserved in local cache without crashing or throwing QuotaExceededError.
 */
export function saveAttendanceToLocalStorage(records: AttendanceRecord[]): void {
  // 1. Always update the in-memory photo cache so the current session keeps all photos
  records.forEach(r => {
    if (r.id && r.photoUrl) {
      attendancePhotoCache.set(r.id, r.photoUrl);
    }
  });

  try {
    // Attempt saving full records with photos
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
  } catch (quotaErr) {
    console.warn('localStorage quota exceeded for attendance records. Storing slim metadata cache (without bulky base64 data URLs) to preserve all rows reliably.');
    try {
      // Strip large photoUrl (> 500 chars, typical of base64 images) for the localStorage cache
      const slimRecords = records.map(r => ({
        ...r,
        photoUrl: r.photoUrl && r.photoUrl.length > 500 ? '' : r.photoUrl,
      }));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(slimRecords));
    } catch (innerErr) {
      console.warn('Could not write slim attendance cache to localStorage:', innerErr);
    }
  }
}

export function getAttendanceRecords(): AttendanceRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
      return [];
    }
    const records: AttendanceRecord[] = JSON.parse(data);
    // Strip out any legacy sample/dummy records
    const cleanRecords = records.filter(r => !r.id.startsWith('att-10') && !r.id.startsWith('att-dummy'));
    
    // Hydrate any missing photoUrl from in-memory cache if available
    const hydrated = cleanRecords.map(r => {
      if (!r.photoUrl && attendancePhotoCache.has(r.id)) {
        return { ...r, photoUrl: attendancePhotoCache.get(r.id)! };
      }
      return r;
    });

    if (cleanRecords.length !== records.length) {
      saveAttendanceToLocalStorage(cleanRecords);
    }
    return hydrated;
  } catch (error) {
    console.warn('Note reading attendance records cache:', error);
    return [];
  }
}

export function clearAllAttendanceRecords(): void {
  attendancePhotoCache.clear();
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
}

export function saveAttendanceRecord(newRecord: Omit<AttendanceRecord, 'id' | 'createdAt'>): AttendanceRecord {
  const records = getAttendanceRecords();
  const fullRecord: AttendanceRecord = {
    ...newRecord,
    id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    createdAt: new Date().toISOString()
  };
  if (fullRecord.photoUrl) {
    attendancePhotoCache.set(fullRecord.id, fullRecord.photoUrl);
  }
  const updated = [fullRecord, ...records];
  saveAttendanceToLocalStorage(updated);

  // Asynchronously send to Supabase online database
  insertAttendanceOnline(fullRecord).catch(err => {
    console.warn('Background Supabase insert attendance note:', err);
  });

  return fullRecord;
}

export function deleteAttendanceRecord(id: string): void {
  attendancePhotoCache.delete(id);
  const records = getAttendanceRecords();
  const updated = records.filter(r => r.id !== id);
  saveAttendanceToLocalStorage(updated);

  // Asynchronously remove from Supabase
  deleteAttendanceOnline(id).catch(err => {
    console.warn('Background Supabase delete attendance note:', err);
  });
}

export function getTutors(): Tutor[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TUTORS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.TUTORS, JSON.stringify(INITIAL_TUTORS));
      return INITIAL_TUTORS;
    }
    const parsed: Tutor[] = JSON.parse(data);
    // Filter out old dummy tutor IDs (tut-1 to tut-5, peg-1 to peg-3)
    const clean = parsed.filter(t => !['tut-1', 'tut-2', 'tut-3', 'tut-4', 'tut-5', 'peg-1', 'peg-2', 'peg-3'].includes(t.id));
    if (clean.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.TUTORS, JSON.stringify(clean));
    }
    return clean;
  } catch (error) {
    console.warn('Note reading tutors cache:', error);
    return INITIAL_TUTORS;
  }
}

export function saveTutor(tutor: Tutor): void {
  const tutors = getTutors();
  const existingIdx = tutors.findIndex(t => t.id === tutor.id);
  let updated: Tutor[];
  if (existingIdx >= 0) {
    updated = [...tutors];
    updated[existingIdx] = tutor;
  } else {
    updated = [...tutors, tutor];
  }
  localStorage.setItem(STORAGE_KEYS.TUTORS, JSON.stringify(updated));

  // Asynchronously upsert to Supabase
  upsertTutorOnline(tutor).catch(err => {
    console.warn('Background Supabase upsert tutor note:', err);
  });
}

export function deleteTutor(id: string): void {
  const tutors = getTutors();
  const updated = tutors.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEYS.TUTORS, JSON.stringify(updated));

  // Asynchronously delete from Supabase
  deleteTutorOnline(id).catch(err => {
    console.warn('Background Supabase delete tutor note:', err);
  });
}

export function getPKBMInfo(): PKBMInfo {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(PKBM_CONFIG));
      return PKBM_CONFIG;
    }
    const parsed: PKBMInfo = JSON.parse(data);

    // Sanitize any residual legacy dummy NIP values
    const dummyNips = [
      'NIY. 19740815 201001 1 001',
      'NIY/NIP. 19820512 201202 2 002',
      'ID Pegawai: 19900320 201803 2 003'
    ];
    let changed = false;
    if (parsed.foundationManagerNip && dummyNips.includes(parsed.foundationManagerNip)) {
      parsed.foundationManagerNip = '';
      changed = true;
    }
    if (parsed.headNip && dummyNips.includes(parsed.headNip)) {
      parsed.headNip = '';
      changed = true;
    }
    if (parsed.attendanceOfficerNip && dummyNips.includes(parsed.attendanceOfficerNip)) {
      parsed.attendanceOfficerNip = '';
      changed = true;
    }
    if (changed) {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(parsed));
    }

    return parsed;
  } catch (error) {
    return PKBM_CONFIG;
  }
}

export async function savePKBMInfo(info: PKBMInfo): Promise<boolean> {
  // Always save immediately to local cache
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(info));

  // Upsert to Supabase online database
  try {
    const success = await upsertPKBMInfoOnline(info);
    return success;
  } catch (err) {
    console.warn('Background Supabase upsert pkbm info note:', err);
    return false;
  }
}


// Distance calculation using Haversine formula in meters
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function getClassLocations(): ClassLocation[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(INITIAL_CLASS_LOCATIONS));
      return INITIAL_CLASS_LOCATIONS;
    }
    const parsed: ClassLocation[] = JSON.parse(data);
    // Filter out old dummy locations loc-3 to loc-9
    const clean = parsed.filter(l => !['loc-3', 'loc-4', 'loc-5', 'loc-6', 'loc-7', 'loc-8', 'loc-9'].includes(l.id));
    if (clean.length === 0) {
      localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(INITIAL_CLASS_LOCATIONS));
      return INITIAL_CLASS_LOCATIONS;
    }
    if (clean.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(clean));
    }
    return clean;
  } catch (error) {
    console.warn('Note reading class locations cache:', error);
    return INITIAL_CLASS_LOCATIONS;
  }
}

export function saveClassLocations(locations: ClassLocation[]): void {
  localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));

  // Asynchronously upsert to Supabase
  locations.forEach(loc => {
    upsertLocationOnline(loc).catch(err => {
      console.warn('Background Supabase upsert location note:', err);
    });
  });
}

export function deleteClassLocation(id: string): void {
  const locations = getClassLocations();
  const updated = locations.filter(l => l.id !== id);
  localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(updated));

  deleteLocationOnline(id).catch(err => {
    console.warn('Background Supabase delete location note:', err);
  });
}

// -------------------------------------------------------------------
// Jadwal Kegiatan Belajar Mengajar (KBM) Semester
// -------------------------------------------------------------------

export function makeScheduleSignature(item: { date?: string; timeStart?: string; subjectTitle?: string; classGroup?: string }): string {
  const d = (item.date || '').trim();
  const t = (item.timeStart || '').replace(/\s*WIB/i, '').trim();
  const s = (item.subjectTitle || '').toLowerCase().trim();
  const c = (item.classGroup || '').toLowerCase().trim();
  return `${d}|${t}|${s}|${c}`;
}

export function getDeletedScheduleSignatures(): Set<string> {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DELETED_SCHEDULES);
    if (!data) return new Set();
    const arr: string[] = JSON.parse(data);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    return new Set();
  }
}

export function addDeletedScheduleTombstone(
  id: string, 
  item?: { date?: string; timeStart?: string; subjectTitle?: string; classGroup?: string }
): void {
  try {
    const current = getDeletedScheduleSignatures();
    if (id && !id.startsWith('___')) {
      current.add(id);
    }
    if (item && item.date && item.subjectTitle) {
      const sig = makeScheduleSignature(item);
      current.add(sig);
      const coarseSig = `${(item.date || '').trim()}|${(item.subjectTitle || '').toLowerCase().trim()}|${(item.classGroup || '').toLowerCase().trim()}`;
      current.add(coarseSig);
    }
    const arr = Array.from(current).slice(-400);
    localStorage.setItem(STORAGE_KEYS.DELETED_SCHEDULES, JSON.stringify(arr));
  } catch (e) {
    console.warn('Note adding deleted schedule tombstone:', e);
  }
}

export function isScheduleDeletedTombstone(item: ScheduleItem): boolean {
  try {
    const current = getDeletedScheduleSignatures();
    if (item.id && current.has(item.id)) return true;
    const sig = makeScheduleSignature(item);
    if (current.has(sig)) return true;
    const coarseSig = `${(item.date || '').trim()}|${(item.subjectTitle || '').toLowerCase().trim()}|${(item.classGroup || '').toLowerCase().trim()}`;
    if (current.has(coarseSig)) return true;
    return false;
  } catch (e) {
    return false;
  }
}

export function clearDeletedScheduleTombstones(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.DELETED_SCHEDULES);
  } catch (e) {
    // Ignore
  }
}

export function removeDeletedScheduleTombstone(
  item: { id?: string; date?: string; timeStart?: string; subjectTitle?: string; classGroup?: string }
): void {
  try {
    const current = getDeletedScheduleSignatures();
    if (item.id) current.delete(item.id);
    if (item.date && item.subjectTitle) {
      current.delete(makeScheduleSignature(item));
      current.delete(`${(item.date || '').trim()}|${(item.subjectTitle || '').toLowerCase().trim()}|${(item.classGroup || '').toLowerCase().trim()}`);
    }
    localStorage.setItem(STORAGE_KEYS.DELETED_SCHEDULES, JSON.stringify(Array.from(current)));
  } catch (e) {
    // Ignore
  }
}

export function deduplicateSchedules(list: ScheduleItem[]): ScheduleItem[] {
  const seen = new Set<string>();
  const result: ScheduleItem[] = [];
  for (const item of list) {
    const k = `${item.date}|${item.timeStart}|${item.timeEnd}|${(item.subjectTitle || '').toLowerCase().trim()}|${(item.classGroup || '').toLowerCase().trim()}|${(item.tutorName || '').toLowerCase().trim()}`;
    if (!seen.has(k)) {
      seen.add(k);
      result.push(item);
    }
  }
  return result;
}

export function generateSampleSemesterSchedules(): ScheduleItem[] {
  const csv = generateScheduleTemplateCsv();
  const parsed = parseScheduleCsv(csv, getTutors());
  return deduplicateSchedules(parsed.items);
}

export function getSchedules(): ScheduleItem[] {
  try {
    const isAllCleared = localStorage.getItem(STORAGE_KEYS.ALL_SCHEDULES_CLEARED) === 'true';
    if (isAllCleared) {
      return [];
    }

    const data = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
    if (data === null) {
      const isInitialized = localStorage.getItem(STORAGE_KEYS.SCHEDULES_INITIALIZED) === 'true';
      if (isInitialized) {
        return [];
      }
      // Inisialisasi otomatis hanya jika belum pernah diinisialisasi sama sekali
      const defaultSchedules = generateSampleSemesterSchedules();
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(defaultSchedules));
      localStorage.setItem(STORAGE_KEYS.SCHEDULES_INITIALIZED, 'true');
      return defaultSchedules;
    }
    const parsed: ScheduleItem[] = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }

    let needsUpdate = false;
    const today = getWibToday();
    const validated = parsed.map(item => {
      let itemDate = item.date ? (normalizeDateString(item.date, item.dayOfWeek) || item.date) : '';
      if (!itemDate) {
        needsUpdate = true;
        itemDate = item.dayOfWeek ? getDateForDayInCurrentWeek(item.dayOfWeek) : today;
      }

      const trueDay = getDayNameFromDateStr(itemDate);
      if (item.date !== itemDate || item.dayOfWeek !== trueDay) {
        needsUpdate = true;
        return {
          ...item,
          date: itemDate,
          dayOfWeek: trueDay
        };
      }
      return item;
    });

    // Singkirkan jadwal yang sudah dihapus oleh pengguna
    const aliveItems = validated.filter(item => !isScheduleDeletedTombstone(item));
    if (aliveItems.length !== validated.length) {
      needsUpdate = true;
    }

    const deduplicated = deduplicateSchedules(aliveItems);
    if (needsUpdate || deduplicated.length !== validated.length) {
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(deduplicated));
    }
    return deduplicated;
  } catch (error) {
    console.warn('Note reading schedules cache:', error);
    return [];
  }
}

export function saveSchedules(schedules: ScheduleItem[]): void {
  localStorage.removeItem(STORAGE_KEYS.ALL_SCHEDULES_CLEARED);
  const deduplicated = deduplicateSchedules(schedules);
  localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(deduplicated));
  localStorage.setItem(STORAGE_KEYS.SCHEDULES_INITIALIZED, 'true');
  saveAllSchedulesOnline(deduplicated, true).catch(err => {
    console.warn('Sync error saveAllSchedulesOnline:', err);
  });
}

export function addScheduleItem(item: Omit<ScheduleItem, 'id'>): ScheduleItem {
  localStorage.removeItem(STORAGE_KEYS.ALL_SCHEDULES_CLEARED);
  removeDeletedScheduleTombstone(item);

  const schedules = getSchedules();
  const newItem: ScheduleItem = {
    ...item,
    id: `sch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
  };
  const updated = deduplicateSchedules([newItem, ...schedules]);
  localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(updated));
  localStorage.setItem(STORAGE_KEYS.SCHEDULES_INITIALIZED, 'true');
  upsertScheduleOnline(newItem).catch(err => {
    console.warn('Sync error upsertScheduleOnline:', err);
  });
  return newItem;
}

export function updateScheduleItem(item: ScheduleItem): void {
  localStorage.removeItem(STORAGE_KEYS.ALL_SCHEDULES_CLEARED);
  removeDeletedScheduleTombstone(item);

  const schedules = getSchedules();
  const idx = schedules.findIndex(s => s.id === item.id);
  if (idx !== -1) {
    const updated = [...schedules];
    updated[idx] = item;
    const cleanUpdated = deduplicateSchedules(updated);
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(cleanUpdated));
    localStorage.setItem(STORAGE_KEYS.SCHEDULES_INITIALIZED, 'true');
    upsertScheduleOnline(item).catch(err => {
      console.warn('Sync error upsertScheduleOnline:', err);
    });
  }
}

export async function deleteScheduleItem(
  id: string,
  matchFilter?: { date?: string; timeStart?: string; subjectTitle?: string; classGroup?: string; tutorName?: string }
): Promise<boolean> {
  const schedules = getSchedules();
  const targetItem = schedules.find(s => s.id === id);

  const targetDate = matchFilter?.date || targetItem?.date;
  const targetTime = matchFilter?.timeStart || targetItem?.timeStart;
  const targetTitle = matchFilter?.subjectTitle || targetItem?.subjectTitle;
  const targetClass = matchFilter?.classGroup || targetItem?.classGroup;

  // 1. Simpan tombstone permanen agar jadwal ini tidak bisa kembali lagi
  addDeletedScheduleTombstone(id, {
    date: targetDate,
    timeStart: targetTime,
    subjectTitle: targetTitle,
    classGroup: targetClass,
  });

  // 2. Hapus dari daftar lokal (termasuk jika ada baris kembar identik)
  const updated = schedules.filter(s => {
    if (s.id === id) return false;
    if (targetDate && targetTitle && s.date === targetDate && s.subjectTitle.toLowerCase().trim() === targetTitle.toLowerCase().trim()) {
      const timeMatches = !targetTime || s.timeStart.replace(/\s*WIB/i, '').trim() === targetTime.replace(/\s*WIB/i, '').trim();
      const classMatches = !targetClass || s.classGroup.toLowerCase().trim() === targetClass.toLowerCase().trim();
      if (timeMatches && classMatches) return false;
    }
    return true;
  });

  localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(updated));
  localStorage.setItem(STORAGE_KEYS.SCHEDULES_INITIALIZED, 'true');

  const filter = matchFilter || (targetItem ? {
    date: targetItem.date,
    timeStart: targetItem.timeStart,
    subjectTitle: targetItem.subjectTitle,
    classGroup: targetItem.classGroup,
    tutorName: targetItem.tutorName,
  } : undefined);

  // 3. Hapus spesifik di database online Supabase
  const ok = await deleteScheduleOnline(id, filter);

  // 4. Pastikan Supabase membersihkan seluruh ID usang yang sudah dihapus
  saveAllSchedulesOnline(updated, true).catch(err => {
    console.warn('Sync error saveAllSchedulesOnline after delete:', err);
  });

  return ok;
}

export async function clearAllSchedules(): Promise<boolean> {
  localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.SCHEDULES_INITIALIZED, 'true');
  localStorage.setItem(STORAGE_KEYS.ALL_SCHEDULES_CLEARED, 'true');
  clearDeletedScheduleTombstones();
  return await clearAllSchedulesOnline();
}

export function resetToDefaultData(): void {
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.TUTORS, JSON.stringify(INITIAL_TUTORS));
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(PKBM_CONFIG));
  localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(INITIAL_CLASS_LOCATIONS));
  localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(generateSampleSemesterSchedules()));
}

// -------------------------------------------------------------------
// Full Sync with Supabase (Used on boot, refresh, and realtime events)
// -------------------------------------------------------------------
export async function syncAllWithSupabase(): Promise<{
  tutors: Tutor[];
  locations: ClassLocation[];
  attendance: AttendanceRecord[];
  pkbmInfo: PKBMInfo;
  schedules: ScheduleItem[];
  source: 'supabase' | 'cache';
}> {
  try {
    const [onlineTutors, onlineLocs, onlineAtt, onlineInfo, onlineSchedules] = await Promise.all([
      fetchTutorsOnline(),
      fetchLocationsOnline(),
      fetchAttendanceOnline(),
      fetchPKBMInfoOnline(),
      fetchSchedulesOnline(),
    ]);

    let loadedTutors = getTutors();
    let loadedLocs = getClassLocations();
    let loadedAtt = getAttendanceRecords();
    let loadedInfo = getPKBMInfo();
    let loadedSchedules = getSchedules();
    let usedOnline = false;

    if (onlineTutors !== null) {
      loadedTutors = onlineTutors;
      try {
        localStorage.setItem(STORAGE_KEYS.TUTORS, JSON.stringify(onlineTutors));
      } catch (err) {
        console.warn('Could not cache tutors to localStorage:', err);
      }
      usedOnline = true;
    }

    if (onlineLocs !== null) {
      if (onlineLocs.length > 0) {
        loadedLocs = onlineLocs;
        try {
          localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(onlineLocs));
        } catch (err) {
          console.warn('Could not cache locations to localStorage:', err);
        }
        usedOnline = true;
      }
    }

    if (onlineAtt !== null) {
      loadedAtt = onlineAtt;
      // Populate memory cache with full high-res photos
      onlineAtt.forEach(r => {
        if (r.id && r.photoUrl) {
          attendancePhotoCache.set(r.id, r.photoUrl);
        }
      });
      // Safely persist to local cache without crashing on 5MB quota
      try {
        saveAttendanceToLocalStorage(onlineAtt);
      } catch (err) {
        console.warn('Could not cache attendance to localStorage:', err);
      }
      usedOnline = true;
    }

    if (onlineInfo !== null) {
      loadedInfo = onlineInfo;
      try {
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(onlineInfo));
      } catch (err) {
        console.warn('Could not cache config to localStorage:', err);
      }
      usedOnline = true;
    } else {
      // If table has not yet been seeded in Supabase, auto-seed default PKBM config online
      upsertPKBMInfoOnline(loadedInfo).catch(err => {
        console.warn('Auto-seed pkbm_info note:', err);
      });
    }

    if (onlineSchedules !== null) {
      const isAllCleared = localStorage.getItem(STORAGE_KEYS.ALL_SCHEDULES_CLEARED) === 'true';
      if (isAllCleared) {
        if (onlineSchedules.length > 0) {
          clearAllSchedulesOnline().catch(err => console.warn('Purge cleared schedules online:', err));
        }
        loadedSchedules = [];
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.SCHEDULES_INITIALIZED, 'true');
      } else {
        // Singkirkan jadwal yang sudah dihapus oleh pengguna (tombstone)
        const deadIds: string[] = [];
        const aliveOnline = onlineSchedules.filter(item => {
          if (isScheduleDeletedTombstone(item)) {
            deadIds.push(item.id);
            return false;
          }
          return true;
        });

        // Hapus sisa record di Supabase secara asinkron agar database bersih
        if (deadIds.length > 0) {
          for (const deadId of deadIds) {
            deleteScheduleOnline(deadId).catch(err => console.warn('Auto-clean tombstoned online schedule:', err));
          }
        }

        const deduplicated = deduplicateSchedules(aliveOnline);
        loadedSchedules = deduplicated;
        try {
          localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(deduplicated));
          localStorage.setItem(STORAGE_KEYS.SCHEDULES_INITIALIZED, 'true');
        } catch (err) {
          console.warn('Could not cache schedules to localStorage:', err);
        }
      }
      usedOnline = true;
    }

    return {
      tutors: loadedTutors,
      locations: loadedLocs,
      attendance: loadedAtt,
      pkbmInfo: loadedInfo,
      schedules: loadedSchedules,
      source: usedOnline ? 'supabase' : 'cache',
    };
  } catch (err) {
    console.warn('Sync all with Supabase error:', err);
    return {
      tutors: getTutors(),
      locations: getClassLocations(),
      attendance: getAttendanceRecords(),
      pkbmInfo: getPKBMInfo(),
      schedules: getSchedules(),
      source: 'cache',
    };
  }
}

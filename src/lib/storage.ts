import { AttendanceRecord, Tutor, PKBMInfo, ClassLocation, ScheduleItem } from '../types';
import { INITIAL_TUTORS, PKBM_CONFIG, SAMPLE_ATTENDANCE_RECORDS, INITIAL_CLASS_LOCATIONS } from '../data/mockData';
import { parseScheduleCsv, generateScheduleTemplateCsv } from './csvScheduleParser';
import { getWibToday } from './dateUtils';
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
    if (cleanRecords.length !== records.length) {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(cleanRecords));
    }
    return cleanRecords;
  } catch (error) {
    console.warn('Note reading attendance records cache:', error);
    return [];
  }
}

export function clearAllAttendanceRecords(): void {
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
}

export function saveAttendanceRecord(newRecord: Omit<AttendanceRecord, 'id' | 'createdAt'>): AttendanceRecord {
  const records = getAttendanceRecords();
  const fullRecord: AttendanceRecord = {
    ...newRecord,
    id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    createdAt: new Date().toISOString()
  };
  const updated = [fullRecord, ...records];
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));

  // Asynchronously send to Supabase online database
  insertAttendanceOnline(fullRecord).catch(err => {
    console.warn('Background Supabase insert attendance note:', err);
  });

  return fullRecord;
}

export function deleteAttendanceRecord(id: string): void {
  const records = getAttendanceRecords();
  const updated = records.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));

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

export function generateSampleSemesterSchedules(): ScheduleItem[] {
  const csv = generateScheduleTemplateCsv();
  const parsed = parseScheduleCsv(csv, getTutors());
  return parsed.items;
}

export function getSchedules(): ScheduleItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
    if (!data) {
      // Inisialisasi otomatis dengan contoh jadwal semester resmi PKBM Bina Insani
      const defaultSchedules = generateSampleSemesterSchedules();
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(defaultSchedules));
      return defaultSchedules;
    }
    const parsed: ScheduleItem[] = JSON.parse(data);
    let needsUpdate = false;
    const today = getWibToday();
    const validated = parsed.map(item => {
      if (!item.date) {
        needsUpdate = true;
        return {
          ...item,
          date: today
        };
      }
      return item;
    });
    if (needsUpdate) {
      saveSchedules(validated);
    }
    return validated;
  } catch (error) {
    console.warn('Note reading schedules cache:', error);
    return [];
  }
}

export function saveSchedules(schedules: ScheduleItem[]): void {
  localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  saveAllSchedulesOnline(schedules, true).catch(err => {
    console.warn('Sync error saveAllSchedulesOnline:', err);
  });
}

export function addScheduleItem(item: Omit<ScheduleItem, 'id'>): ScheduleItem {
  const schedules = getSchedules();
  const newItem: ScheduleItem = {
    ...item,
    id: `sch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
  };
  const updated = [newItem, ...schedules];
  localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(updated));
  upsertScheduleOnline(newItem).catch(err => {
    console.warn('Sync error upsertScheduleOnline:', err);
  });
  return newItem;
}

export function updateScheduleItem(item: ScheduleItem): void {
  const schedules = getSchedules();
  const idx = schedules.findIndex(s => s.id === item.id);
  if (idx !== -1) {
    const updated = [...schedules];
    updated[idx] = item;
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(updated));
    upsertScheduleOnline(item).catch(err => {
      console.warn('Sync error upsertScheduleOnline:', err);
    });
  }
}

export function deleteScheduleItem(id: string): void {
  const schedules = getSchedules();
  const updated = schedules.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(updated));
  deleteScheduleOnline(id).catch(err => {
    console.warn('Sync error deleteScheduleOnline:', err);
  });
}

export function clearAllSchedules(): void {
  localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify([]));
  clearAllSchedulesOnline().catch(err => {
    console.warn('Sync error clearAllSchedulesOnline:', err);
  });
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
      localStorage.setItem(STORAGE_KEYS.TUTORS, JSON.stringify(onlineTutors));
      usedOnline = true;
    }

    if (onlineLocs !== null) {
      if (onlineLocs.length > 0) {
        loadedLocs = onlineLocs;
        localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(onlineLocs));
        usedOnline = true;
      }
    }

    if (onlineAtt !== null) {
      loadedAtt = onlineAtt;
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(onlineAtt));
      usedOnline = true;
    }

    if (onlineInfo !== null) {
      loadedInfo = onlineInfo;
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(onlineInfo));
      usedOnline = true;
    } else {
      // If table has not yet been seeded in Supabase, auto-seed default PKBM config online
      upsertPKBMInfoOnline(loadedInfo).catch(err => {
        console.warn('Auto-seed pkbm_info note:', err);
      });
    }

    if (onlineSchedules !== null) {
      if (onlineSchedules.length > 0) {
        loadedSchedules = onlineSchedules;
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(onlineSchedules));
        usedOnline = true;
      } else if (onlineSchedules.length === 0 && loadedSchedules.length > 0) {
        // Table exists but is empty online, auto-upload current local schedules
        saveAllSchedulesOnline(loadedSchedules, false).catch(err => {
          console.warn('Auto-upload schedules to Supabase note:', err);
        });
      } else {
        loadedSchedules = [];
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify([]));
        usedOnline = true;
      }
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

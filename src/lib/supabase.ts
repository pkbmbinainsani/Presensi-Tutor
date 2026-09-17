import { createClient } from '@supabase/supabase-js';
import { AttendanceRecord, Tutor, PKBMInfo, ClassLocation, ScheduleItem, DayOfWeek } from '../types';
import { getWibDate, getWibTimeWithSuffix, formatTimeWibDisplay, getWibToday, getDayNameFromDateStr } from './dateUtils';

export const SUPABASE_URL = 'https://bjekrnawldsnbhtfelzk.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_PVBfQ9AcrdsDY6py_6syBg_JihWcuVU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
});

export interface SupabaseHealthStatus {
  connected: boolean;
  checkedAt: string;
  tables: {
    tutors: boolean;
    class_locations: boolean;
    attendance_records: boolean;
    pkbm_info: boolean;
    schedules: boolean;
  };
  missingTables: string[];
  error?: string;
}

// Global registry of tables missing from Supabase schema cache
export const missingTablesSet = new Set<string>();

export function handleTableError(operation: string, tableName: string, error: any) {
  const isSchemaMissing = 
    error?.code === 'PGRST205' || 
    error?.code === '42P01' || 
    (typeof error?.message === 'string' && (
      error.message.toLowerCase().includes('schema cache') || 
      error.message.toLowerCase().includes('does not exist') ||
      error.message.toLowerCase().includes('relation')
    ));

  if (isSchemaMissing) {
    missingTablesSet.add(tableName);
    console.warn(`[Supabase Offline-First] Tabel '${tableName}' belum terdaftar di schema cache Supabase (${error?.code || 'PGRST205'}). Operasi '${operation}' dialihkan aman ke penyimpanan lokal.`);
  } else {
    console.warn(`[Supabase Note] Operasi '${operation}' pada tabel '${tableName}':`, error?.message || error);
  }
}

// -------------------------------------------------------------
// Health / Schema Cache Check
// -------------------------------------------------------------
export async function checkSupabaseHealth(): Promise<SupabaseHealthStatus> {
  const result: SupabaseHealthStatus = {
    connected: false,
    checkedAt: new Date().toISOString(),
    tables: {
      tutors: false,
      class_locations: false,
      attendance_records: false,
      pkbm_info: false,
      schedules: false,
    },
    missingTables: [],
  };

  try {
    const [tutorsRes, locRes, attRes, pkbmRes, schRes] = await Promise.all([
      supabase.from('tutors').select('id').limit(1),
      supabase.from('class_locations').select('id').limit(1),
      supabase.from('attendance_records').select('id').limit(1),
      supabase.from('pkbm_info').select('id').limit(1),
      supabase.from('schedules').select('id').limit(1),
    ]);

    result.tables.tutors = !tutorsRes.error;
    result.tables.class_locations = !locRes.error;
    result.tables.attendance_records = !attRes.error;
    result.tables.pkbm_info = !pkbmRes.error;
    result.tables.schedules = !schRes.error;

    if (!result.tables.tutors) {
      result.missingTables.push('tutors');
      missingTablesSet.add('tutors');
    } else {
      missingTablesSet.delete('tutors');
    }

    if (!result.tables.class_locations) {
      result.missingTables.push('class_locations');
      missingTablesSet.add('class_locations');
    } else {
      missingTablesSet.delete('class_locations');
    }

    if (!result.tables.attendance_records) {
      result.missingTables.push('attendance_records');
      missingTablesSet.add('attendance_records');
    } else {
      missingTablesSet.delete('attendance_records');
    }

    if (!result.tables.pkbm_info) {
      result.missingTables.push('pkbm_info');
      missingTablesSet.add('pkbm_info');
    } else {
      missingTablesSet.delete('pkbm_info');
    }

    if (!result.tables.schedules) {
      result.missingTables.push('schedules');
      missingTablesSet.add('schedules');
    } else {
      missingTablesSet.delete('schedules');
    }

    // Endpoint is reached and responding if we got any query response (even PGRST205 schema cache notification)
    result.connected = true;
  } catch (err: any) {
    result.connected = false;
    result.error = err?.message || 'Gagal terhubung ke endpoint Supabase';
  }

  return result;
}

// -------------------------------------------------------------
// Transformers (Database snake_case <-> TypeScript camelCase)
// -------------------------------------------------------------
export function transformTutorFromDb(row: any): Tutor {
  return {
    id: row.id,
    name: row.name,
    nipCode: row.nip_code || '',
    specialization: row.specialization || '',
    phone: row.phone || '',
    pin: row.pin || '1234',
    roleType: row.role_type || 'tutor',
    position: row.position || '',
    avatarUrl: row.avatar_url,
    active: row.active ?? true,
  };
}

export function transformTutorToDb(tutor: Tutor): any {
  return {
    id: tutor.id,
    name: tutor.name,
    nip_code: tutor.nipCode || '',
    specialization: tutor.specialization || '',
    phone: tutor.phone || '',
    pin: tutor.pin || '1234',
    role_type: tutor.roleType || 'tutor',
    position: tutor.position || '',
    avatar_url: tutor.avatarUrl || null,
    active: tutor.active ?? true,
  };
}

export function transformLocationFromDb(row: any): ClassLocation {
  return {
    id: row.id,
    name: row.name,
    address: row.address || '',
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    radiusMeters: Number(row.radius_meters) || 300,
    isMainBranch: Boolean(row.is_main_branch),
    notes: row.notes || '',
    active: row.active ?? true,
  };
}

export function transformLocationToDb(loc: ClassLocation): any {
  return {
    id: loc.id,
    name: loc.name,
    address: loc.address || '',
    latitude: loc.latitude,
    longitude: loc.longitude,
    radius_meters: loc.radiusMeters || 300,
    is_main_branch: Boolean(loc.isMainBranch),
    notes: loc.notes || '',
    active: loc.active ?? true,
  };
}

export function transformAttendanceFromDb(row: any): AttendanceRecord {
  // Jika kolom date kosong atau berformat UTC, selaraskan ke WIB (Asia/Jakarta)
  const resolvedDate = row.date 
    ? getWibDate(row.date) 
    : (row.created_at ? getWibDate(row.created_at) : getWibToday());

  // Pastikan waktu memiliki label WIB yang seragam
  const resolvedTimeStart = row.time_start 
    ? formatTimeWibDisplay(row.time_start) 
    : (row.created_at ? getWibTimeWithSuffix(row.created_at) : '07:30 WIB');

  const resolvedTimeEnd = row.time_end 
    ? formatTimeWibDisplay(row.time_end) 
    : resolvedTimeStart;

  return {
    id: row.id,
    tutorId: row.tutor_id || '',
    tutorName: row.tutor_name || '',
    program: row.program || 'Paket C (Setara SMA)',
    subjectTitle: row.subject_title || '',
    classGroup: row.class_group || '',
    date: resolvedDate,
    timeStart: resolvedTimeStart,
    timeEnd: resolvedTimeEnd,
    studentCount: Number(row.student_count) || 0,
    activityNotes: row.activity_notes || '',
    photoUrl: row.photo_url || '',
    location: row.location || {
      latitude: 0,
      longitude: 0,
      accuracy: 0,
      timestamp: row.created_at || new Date().toISOString(),
    },
    status: row.status || 'Hadir Valid',
    dutyType: row.duty_type || 'Reguler',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function transformAttendanceToDb(record: AttendanceRecord): any {
  return {
    id: record.id,
    tutor_id: record.tutorId,
    tutor_name: record.tutorName,
    program: record.program,
    subject_title: record.subjectTitle,
    class_group: record.classGroup,
    date: getWibDate(record.date || new Date()),
    time_start: formatTimeWibDisplay(record.timeStart),
    time_end: formatTimeWibDisplay(record.timeEnd || record.timeStart),
    student_count: record.studentCount,
    activity_notes: record.activityNotes,
    photo_url: record.photoUrl,
    location: record.location,
    status: record.status,
    duty_type: record.dutyType || 'Reguler',
    created_at: record.createdAt || new Date().toISOString(),
  };
}

export function transformPKBMInfoFromDb(row: any): PKBMInfo {
  return {
    name: row.name,
    npsn: row.npsn || '',
    address: row.address || '',
    subDistrict: row.sub_district || '',
    regency: row.regency || '',
    province: row.province || '',
    postalCode: row.postal_code || '',
    phone: row.phone || '',
    email: row.email || '',
    logoUrl: row.logo_url || '/logo.svg',
    faviconUrl: row.favicon_url || row.logo_url || '/favicon.svg',
    useLogoAsFavicon: row.use_logo_as_favicon !== undefined ? Boolean(row.use_logo_as_favicon) : true,
    foundationManagerName: row.foundation_manager_name || '',
    foundationManagerTitle: row.foundation_manager_title || '',
    foundationManagerNip: (row.foundation_manager_nip === 'NIY. 19740815 201001 1 001' ? '' : row.foundation_manager_nip) || '',
    headName: row.head_name || '',
    headNip: (row.head_nip === 'NIY/NIP. 19820512 201202 2 002' ? '' : row.head_nip) || '',
    attendanceOfficerName: row.attendance_officer_name || '',
    attendanceOfficerNip: (row.attendance_officer_nip === 'ID Pegawai: 19900320 201803 2 003' ? '' : row.attendance_officer_nip) || '',
    centerCoordinates: row.center_coordinates || { latitude: -7.21854, longitude: 110.33402 },
    allowedRadiusMeters: Number(row.allowed_radius_meters) || 300,
  };
}

export function transformPKBMInfoToDb(info: PKBMInfo): any {
  return {
    id: 'main',
    name: info.name,
    npsn: info.npsn,
    address: info.address,
    sub_district: info.subDistrict,
    regency: info.regency,
    province: info.province,
    postal_code: info.postalCode,
    phone: info.phone,
    email: info.email,
    logo_url: info.logoUrl || '/logo.svg',
    favicon_url: info.faviconUrl || info.logoUrl || '/favicon.svg',
    use_logo_as_favicon: info.useLogoAsFavicon !== undefined ? info.useLogoAsFavicon : true,
    foundation_manager_name: info.foundationManagerName || '',
    foundation_manager_title: info.foundationManagerTitle || '',
    foundation_manager_nip: info.foundationManagerNip || '',
    head_name: info.headName || '',
    head_nip: info.headNip || '',
    attendance_officer_name: info.attendanceOfficerName || '',
    attendance_officer_nip: info.attendanceOfficerNip || '',
    center_coordinates: info.centerCoordinates,
    allowed_radius_meters: info.allowedRadiusMeters || 300,
    updated_at: new Date().toISOString(),
  };
}

export function transformScheduleFromDb(row: any): ScheduleItem {
  const dateVal = row.date ? getWibDate(row.date) : getWibToday();
  const dayOfWeekVal = (row.day_of_week as DayOfWeek) || getDayNameFromDateStr(dateVal);

  return {
    id: row.id,
    date: dateVal,
    dayOfWeek: dayOfWeekVal,
    timeStart: formatTimeWibDisplay(row.time_start || '08:00'),
    timeEnd: formatTimeWibDisplay(row.time_end || '09:30'),
    program: row.program || 'Paket C (Setara SMA)',
    subjectTitle: row.subject_title || '',
    classGroup: row.class_group || '',
    tutorId: row.tutor_id || undefined,
    tutorName: row.tutor_name || '',
    room: row.room || '',
    semester: row.semester || 'Semester Ganjil 2026/2027',
    academicYear: row.academic_year || '2026/2027',
    notes: row.notes || undefined,
  };
}

export function transformScheduleToDb(item: ScheduleItem): any {
  const dateStr = item.date ? getWibDate(item.date) : getWibToday();
  return {
    id: item.id,
    date: dateStr,
    day_of_week: item.dayOfWeek || getDayNameFromDateStr(dateStr),
    time_start: formatTimeWibDisplay(item.timeStart),
    time_end: formatTimeWibDisplay(item.timeEnd),
    program: item.program,
    subject_title: item.subjectTitle,
    class_group: item.classGroup,
    tutor_id: item.tutorId || null,
    tutor_name: item.tutorName,
    room: item.room || null,
    semester: item.semester || 'Semester Ganjil 2026/2027',
    academic_year: item.academicYear || '2026/2027',
    notes: item.notes || null,
  };
}

// -------------------------------------------------------------
// Online CRUD Functions (with error handling & fallback)
// -------------------------------------------------------------

// Tutors
export async function fetchTutorsOnline(): Promise<Tutor[] | null> {
  try {
    const { data, error } = await supabase
      .from('tutors')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      handleTableError('fetch tutors', 'tutors', error);
      return null;
    }
    missingTablesSet.delete('tutors');
    return (data || []).map(transformTutorFromDb);
  } catch (e) {
    handleTableError('fetch tutors exception', 'tutors', e);
    return null;
  }
}

export async function upsertTutorOnline(tutor: Tutor): Promise<boolean> {
  try {
    const payload = transformTutorToDb(tutor);
    const { error } = await supabase.from('tutors').upsert(payload);
    if (error) {
      handleTableError('upsert tutor', 'tutors', error);
      return false;
    }
    missingTablesSet.delete('tutors');
    return true;
  } catch (e) {
    handleTableError('upsert tutor exception', 'tutors', e);
    return false;
  }
}

export async function deleteTutorOnline(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('tutors').delete().eq('id', id);
    if (error) {
      handleTableError('delete tutor', 'tutors', error);
      return false;
    }
    missingTablesSet.delete('tutors');
    return true;
  } catch (e) {
    handleTableError('delete tutor exception', 'tutors', e);
    return false;
  }
}

// Class Locations
export async function fetchLocationsOnline(): Promise<ClassLocation[] | null> {
  try {
    const { data, error } = await supabase
      .from('class_locations')
      .select('*')
      .order('is_main_branch', { ascending: false });

    if (error) {
      handleTableError('fetch locations', 'class_locations', error);
      return null;
    }
    missingTablesSet.delete('class_locations');
    return (data || []).map(transformLocationFromDb);
  } catch (e) {
    handleTableError('fetch locations exception', 'class_locations', e);
    return null;
  }
}

export async function upsertLocationOnline(loc: ClassLocation): Promise<boolean> {
  try {
    const payload = transformLocationToDb(loc);
    const { error } = await supabase.from('class_locations').upsert(payload);
    if (error) {
      handleTableError('upsert location', 'class_locations', error);
      return false;
    }
    missingTablesSet.delete('class_locations');
    return true;
  } catch (e) {
    handleTableError('upsert location exception', 'class_locations', e);
    return false;
  }
}

export async function deleteLocationOnline(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('class_locations').delete().eq('id', id);
    if (error) {
      handleTableError('delete location', 'class_locations', error);
      return false;
    }
    missingTablesSet.delete('class_locations');
    return true;
  } catch (e) {
    handleTableError('delete location exception', 'class_locations', e);
    return false;
  }
}

// Attendance Records
export async function fetchAttendanceOnline(): Promise<AttendanceRecord[] | null> {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .order('date', { ascending: false })
      .order('time_start', { ascending: false });

    if (error) {
      handleTableError('fetch attendance', 'attendance_records', error);
      return null;
    }
    missingTablesSet.delete('attendance_records');
    return (data || []).map(transformAttendanceFromDb);
  } catch (e) {
    handleTableError('fetch attendance exception', 'attendance_records', e);
    return null;
  }
}

export async function insertAttendanceOnline(record: AttendanceRecord): Promise<boolean> {
  try {
    const payload = transformAttendanceToDb(record);
    const { error } = await supabase.from('attendance_records').insert([payload]);
    if (error) {
      handleTableError('insert attendance', 'attendance_records', error);
      return false;
    }
    missingTablesSet.delete('attendance_records');
    return true;
  } catch (e) {
    handleTableError('insert attendance exception', 'attendance_records', e);
    return false;
  }
}

export async function deleteAttendanceOnline(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('attendance_records').delete().eq('id', id);
    if (error) {
      handleTableError('delete attendance', 'attendance_records', error);
      return false;
    }
    missingTablesSet.delete('attendance_records');
    return true;
  } catch (e) {
    handleTableError('delete attendance exception', 'attendance_records', e);
    return false;
  }
}

// PKBM Info
export async function fetchPKBMInfoOnline(): Promise<PKBMInfo | null> {
  try {
    const { data, error } = await supabase
      .from('pkbm_info')
      .select('*')
      .eq('id', 'main')
      .maybeSingle();

    if (error) {
      handleTableError('fetch pkbm_info', 'pkbm_info', error);
      return null;
    }
    if (!data) return null;
    missingTablesSet.delete('pkbm_info');
    return transformPKBMInfoFromDb(data);
  } catch (e) {
    handleTableError('fetch pkbm_info exception', 'pkbm_info', e);
    return null;
  }
}

export async function upsertPKBMInfoOnline(info: PKBMInfo): Promise<boolean> {
  try {
    const payload = transformPKBMInfoToDb(info);
    let { error } = await supabase.from('pkbm_info').upsert(payload);
    
    // Fallback: If older Supabase schema doesn't have favicon columns yet, retry without them
    if (error && (
      error.message?.toLowerCase().includes('favicon') || 
      error.details?.toLowerCase().includes('favicon') ||
      error.message?.toLowerCase().includes('column')
    )) {
      const fallbackPayload = { ...payload };
      delete (fallbackPayload as any).favicon_url;
      delete (fallbackPayload as any).use_logo_as_favicon;
      const retry = await supabase.from('pkbm_info').upsert(fallbackPayload);
      error = retry.error;
    }

    if (error) {
      handleTableError('upsert pkbm_info', 'pkbm_info', error);
      return false;
    }
    missingTablesSet.delete('pkbm_info');
    return true;
  } catch (e) {
    handleTableError('upsert pkbm_info exception', 'pkbm_info', e);
    return false;
  }
}

// -------------------------------------------------------------
// Schedules (Jadwal KBM 1 Semester Berbasis Tanggal)
// -------------------------------------------------------------
export async function fetchSchedulesOnline(): Promise<ScheduleItem[] | null> {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('date', { ascending: true })
      .order('time_start', { ascending: true });

    if (error) {
      handleTableError('fetch schedules', 'schedules', error);
      return null;
    }
    missingTablesSet.delete('schedules');
    return (data || []).map(transformScheduleFromDb);
  } catch (e) {
    handleTableError('fetch schedules exception', 'schedules', e);
    return null;
  }
}

export async function upsertScheduleOnline(item: ScheduleItem): Promise<boolean> {
  try {
    const payload = transformScheduleToDb(item);
    const { error } = await supabase.from('schedules').upsert(payload);
    if (error) {
      handleTableError('upsert schedule', 'schedules', error);
      return false;
    }
    missingTablesSet.delete('schedules');
    return true;
  } catch (e) {
    handleTableError('upsert schedule exception', 'schedules', e);
    return false;
  }
}

export async function saveAllSchedulesOnline(schedules: ScheduleItem[], replace: boolean = true): Promise<boolean> {
  try {
    if (replace) {
      // Hapus seluruh row terlebih dahulu agar sinkron bersih dengan data terbaru
      const { error: delError } = await supabase
        .from('schedules')
        .delete()
        .neq('id', '___non_existent_schedule_dummy_key___');
      
      if (delError) {
        handleTableError('replace delete schedules', 'schedules', delError);
        // Lanjutkan mencoba upsert/insert
      }
    }

    if (schedules.length === 0) {
      missingTablesSet.delete('schedules');
      return true;
    }

    // Insert / Upsert batch (pecah menjadi chunk maks 50 per batch untuk efisiensi)
    const chunkSize = 50;
    for (let i = 0; i < schedules.length; i += chunkSize) {
      const chunk = schedules.slice(i, i + chunkSize).map(transformScheduleToDb);
      const { error: insertError } = await supabase
        .from('schedules')
        .upsert(chunk, { onConflict: 'id' });

      if (insertError) {
        handleTableError('save batch schedules', 'schedules', insertError);
        return false;
      }
    }

    missingTablesSet.delete('schedules');
    return true;
  } catch (e) {
    handleTableError('save all schedules exception', 'schedules', e);
    return false;
  }
}

export async function deleteScheduleOnline(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) {
      handleTableError('delete schedule', 'schedules', error);
      return false;
    }
    missingTablesSet.delete('schedules');
    return true;
  } catch (e) {
    handleTableError('delete schedule exception', 'schedules', e);
    return false;
  }
}

export async function clearAllSchedulesOnline(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .neq('id', '___non_existent_schedule_dummy_key___');

    if (error) {
      handleTableError('clear all schedules', 'schedules', error);
      return false;
    }
    missingTablesSet.delete('schedules');
    return true;
  } catch (e) {
    handleTableError('clear all schedules exception', 'schedules', e);
    return false;
  }
}

// -------------------------------------------------------------
// Realtime Changes Listener
// -------------------------------------------------------------
export function subscribeToSupabaseChanges(onChange: (table: string) => void): () => void {
  try {
    const channel = supabase
      .channel('pkbm-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        onChange('attendance_records');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tutors' }, () => {
        onChange('tutors');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_locations' }, () => {
        onChange('class_locations');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pkbm_info' }, () => {
        onChange('pkbm_info');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => {
        onChange('schedules');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return () => {};
  }
}

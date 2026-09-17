/**
 * Utilitas Penanggalan & Waktu Indonesia Barat (WIB - UTC+7 / Asia/Jakarta)
 * 
 * PKBM Bina Insani Sumowono berada di zona Waktu Indonesia Barat (WIB / UTC+7).
 * Modul ini memastikan sinkronisasi antara server database online Supabase (yang berjalan dalam UTC)
 * dengan waktu presensi lokal tutor di Indonesia tanpa ada pergeseran hari atau selisih jam.
 */

export const TIMEZONE_WIB = 'Asia/Jakarta';

export const BULAN_INDO = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
] as const;

export const BULAN_INDO_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
] as const;

export const HARI_INDO = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
] as const;

export interface WibDateParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const padZero = (n: number): string => String(n).padStart(2, '0');

/**
 * Mendapatkan komponen tanggal & waktu sekarang dalam zona waktu Asia/Jakarta (WIB / UTC+7)
 */
export function getWibDateParts(input: Date | string | number = new Date()): WibDateParts {
  const date = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;
  
  // Jika input invalid date, fallback ke waktu sekarang
  const validDate = isNaN(date.getTime()) ? new Date() : date;

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_WIB,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  }).formatToParts(validDate);

  const findVal = (type: string) => {
    const p = parts.find(part => part.type === type);
    return p ? parseInt(p.value, 10) : 0;
  };

  return {
    year: findVal('year') || validDate.getFullYear(),
    month: findVal('month') || (validDate.getMonth() + 1),
    day: findVal('day') || validDate.getDate(),
    hour: findVal('hour'),
    minute: findVal('minute'),
    second: findVal('second')
  };
}

/**
 * Mendapatkan tanggal hari ini dalam format YYYY-MM-DD sesuai zona WIB (Asia/Jakarta).
 * Mencegah bug toISOString().split('T')[0] yang mundur 1 hari antara pukul 00:00 - 06:59 WIB.
 */
export function getWibToday(): string {
  const { year, month, day } = getWibDateParts();
  return `${year}-${padZero(month)}-${padZero(day)}`;
}

/**
 * Mengonversi objek Date / string timestamp (termasuk UTC dari Supabase) menjadi string tanggal YYYY-MM-DD dalam WIB.
 */
export function getWibDate(input: Date | string | number = new Date()): string {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    // Sudah dalam format YYYY-MM-DD
    return input.trim();
  }
  const { year, month, day } = getWibDateParts(input);
  return `${year}-${padZero(month)}-${padZero(day)}`;
}

/**
 * Mendapatkan waktu sekarang dalam format HH:mm atau HH:mm:ss dalam zona WIB.
 */
export function getWibTime(input: Date | string | number = new Date(), withSeconds: boolean = false): string {
  const { hour, minute, second } = getWibDateParts(input);
  return withSeconds
    ? `${padZero(hour)}:${padZero(minute)}:${padZero(second)}`
    : `${padZero(hour)}:${padZero(minute)}`;
}

/**
 * Mendapatkan waktu terformat lengkap dengan label WIB (contoh: '07:30 WIB' atau '07:30:45 WIB')
 */
export function getWibTimeWithSuffix(input: Date | string | number = new Date(), withSeconds: boolean = false): string {
  return `${getWibTime(input, withSeconds)} WIB`;
}

/**
 * Memastikan string waktu memiliki label WIB yang seragam (misal '07:30' -> '07:30 WIB')
 */
export function formatTimeWibDisplay(timeStr?: string): string {
  if (!timeStr) return '-';
  const clean = timeStr.trim();
  if (clean.toUpperCase().includes('WIB')) return clean;
  return `${clean} WIB`;
}

/**
 * Format tanggal Indonesia secara deterministik tanpa terpengaruh pergeseran zona waktu lokal browser.
 * Format 'withDay': "Jumat, 11 September 2026"
 * Format 'long': "11 September 2026"
 * Format 'short': "11 Sep 2026"
 */
export function formatWibDateIndo(
  dateInput?: Date | string | number | null,
  style: 'long' | 'short' | 'withDay' = 'long'
): string {
  if (!dateInput) return '-';

  let year: number;
  let month: number;
  let day: number;

  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput.trim())) {
    const parts = dateInput.trim().split('T')[0].split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    const p = getWibDateParts(dateInput);
    year = p.year;
    month = p.month;
    day = p.day;
  }

  // Gunakan jam 12:00 siang lokal untuk mencari nama hari secara aman dari pergeseran zona waktu
  const safeDate = new Date(year, month - 1, day, 12, 0, 0);
  const dayName = HARI_INDO[safeDate.getDay()];
  const monthName = style === 'short' ? BULAN_INDO_SHORT[month - 1] : BULAN_INDO[month - 1];

  if (style === 'withDay') {
    return `${dayName}, ${day} ${monthName} ${year}`;
  }
  return `${day} ${monthName} ${year}`;
}

/**
 * Format tanggal & jam gabungan dalam WIB (contoh: '11 Sep 2026, 07:30 WIB')
 */
export function formatWibDateTimeIndo(input: Date | string | number = new Date()): string {
  const dateStr = formatWibDateIndo(input, 'short');
  const timeStr = getWibTimeWithSuffix(input);
  return `${dateStr}, ${timeStr}`;
}

/**
 * Mengecek apakah tanggal tertentu (YYYY-MM-DD) adalah hari ini di zona WIB.
 */
export function isTodayWib(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return getWibDate(dateStr) === getWibToday();
}

export type WibPresetType = 'today' | 'last7Days' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear' | 'all';

/**
 * Menghitung rentang tanggal preset (Hari Ini, 7 Hari Terakhir, Bulan Ini, Bulan Lalu, 3 Bulan, Tahun Ini) murni dalam zona WIB.
 */
export function getWibPresetRange(preset: WibPresetType): { startDate: string; endDate: string } {
  const { year, month, day } = getWibDateParts();
  const todayStr = `${year}-${padZero(month)}-${padZero(day)}`;

  if (preset === 'today') {
    return { startDate: todayStr, endDate: todayStr };
  }

  if (preset === 'last7Days') {
    // 6 days before today in local date
    const d = new Date(year, month - 1, day - 6);
    const startStr = `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
    return { startDate: startStr, endDate: todayStr };
  }

  if (preset === 'thisMonth') {
    const lastDayNum = new Date(year, month, 0).getDate();
    return {
      startDate: `${year}-${padZero(month)}-01`,
      endDate: `${year}-${padZero(month)}-${padZero(lastDayNum)}`
    };
  }

  if (preset === 'lastMonth') {
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth < 1) {
      prevYear -= 1;
      prevMonth = 12;
    }
    const lastDayNum = new Date(prevYear, prevMonth, 0).getDate();
    return {
      startDate: `${prevYear}-${padZero(prevMonth)}-01`,
      endDate: `${prevYear}-${padZero(prevMonth)}-${padZero(lastDayNum)}`
    };
  }

  if (preset === 'last3Months') {
    let startYear = year;
    let startMonth = month - 2;
    if (startMonth < 1) {
      startYear -= 1;
      startMonth += 12;
    }
    const lastDayNum = new Date(year, month, 0).getDate();
    return {
      startDate: `${startYear}-${padZero(startMonth)}-01`,
      endDate: `${year}-${padZero(month)}-${padZero(lastDayNum)}`
    };
  }

  if (preset === 'thisYear') {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    };
  }

  return { startDate: '', endDate: '' };
}

/**
 * Normalisasi format string tanggal menjadi YYYY-MM-DD
 * Mendukung format: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD
 */
export function normalizeDateString(raw: string): string | null {
  if (!raw) return null;
  const clean = raw.trim();

  // Pattern YYYY-MM-DD atau YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(clean)) {
    const [y, m, d] = clean.split(/[-/]/).map(Number);
    return `${y}-${padZero(m)}-${padZero(d)}`;
  }

  // Pattern DD-MM-YYYY atau DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split(/[-/]/).map(Number);
    return `${y}-${padZero(m)}-${padZero(d)}`;
  }

  return null;
}

/**
 * Dapatkan nama hari bahasa Indonesia (Senin - Minggu) dari string tanggal YYYY-MM-DD
 */
export function getDayNameFromDateStr(dateStr: string): 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu' {
  if (!dateStr) return 'Senin';
  const norm = normalizeDateString(dateStr);
  if (!norm) return 'Senin';
  const [y, m, d] = norm.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  return (HARI_INDO[dateObj.getDay()] || 'Senin') as any;
}


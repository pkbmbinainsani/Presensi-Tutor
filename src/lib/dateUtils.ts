/**
 * Utilitas Penanggalan & Waktu Indonesia Barat (WIB - UTC+7 / Asia/Jakarta)
 * 
 * PKBM Bina Insani Sumowono berada di zona Waktu Indonesia Barat (WIB / UTC+7).
 * Modul ini memastikan sinkronisasi antara server database online Supabase (yang berjalan dalam UTC)
 * dengan waktu presensi lokal tutor di Indonesia tanpa ada pergeseran hari atau selisih jam.
 */

import { DayOfWeek } from '../types';

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
 * Normalisasi nama hari dari berbagai variasi penulisan bahasa Indonesia maupun Inggris
 */
export function normalizeDayOfWeek(raw?: string | null): DayOfWeek | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase();

  if (clean.includes('senin') || clean === 'sen' || clean === 'monday' || clean === 'mon' || clean === '1') {
    return 'Senin';
  }
  if (clean.includes('selasa') || clean === 'sel' || clean === 'tuesday' || clean === 'tue' || clean === '2') {
    return 'Selasa';
  }
  if (clean.includes('rabu') || clean === 'rab' || clean === 'wednesday' || clean === 'wed' || clean === '3') {
    return 'Rabu';
  }
  if (clean.includes('kamis') || clean === 'kam' || clean === 'thursday' || clean === 'thu' || clean === '4') {
    return 'Kamis';
  }
  if (clean.includes('jumat') || clean.includes("jum'at") || clean === 'jum' || clean === 'friday' || clean === 'fri' || clean === '5') {
    return 'Jumat';
  }
  if (clean.includes('sabtu') || clean === 'sab' || clean === 'saturday' || clean === 'sat' || clean === '6') {
    return 'Sabtu';
  }
  if (clean.includes('minggu') || clean.includes('ahad') || clean === 'min' || clean === 'sunday' || clean === 'sun' || clean === '7' || clean === '0') {
    return 'Minggu';
  }

  return null;
}

/**
 * Peta nama-nama bulan dalam bahasa Indonesia & Inggris untuk parsing tanggal teks
 */
const MONTH_MAP: Record<string, number> = {
  januari: 1, jan: 1, january: 1,
  februari: 2, pebruari: 2, feb: 2, peb: 2, february: 2,
  maret: 3, mar: 3, march: 3,
  april: 4, apr: 4,
  mei: 5, may: 5,
  juni: 6, jun: 6, june: 6,
  juli: 7, jul: 7, july: 7,
  agustus: 8, ags: 8, agu: 8, aug: 8, august: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, oct: 10, october: 10,
  november: 11, nopember: 11, nov: 11, nop: 11,
  desember: 12, des: 12, dec: 12, december: 12
};

/**
 * Normalisasi format string tanggal menjadi YYYY-MM-DD
 * Mendukung format:
 * - YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
 * - DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY (format standar Indonesia/Excel)
 * - MM/DD/YYYY, M/D/YYYY (format Google Sheets / Excel US)
 * - DD-MM-YY, DD/MM/YY, DD.MM.YY (tahun 2 digit)
 * - Format teks nama bulan: "17 September 2026", "17-Sep-2026", "17/Sep/2026", "September 17, 2026"
 * - String tanggal dengan prefix nama hari: "Kamis, 17/09/2026", "Senin, 14-09-2026"
 * - Excel Serial Date Number (contoh: 46282)
 * - String tanggal dengan timestamp atau ISO format
 */
export function normalizeDateString(raw: string | number | null | undefined, expectedDay?: string | null): string | null {
  if (raw === null || raw === undefined) return null;
  let clean = String(raw).trim();
  if (!clean) return null;

  // Hapus karakter BOM dan zero-width space yang sering muncul dari file CSV Excel
  clean = clean.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

  // 1. Bersihkan prefix nama hari jika ada di kolom tanggal (misal: "Kamis, 17/09/2026")
  clean = clean.replace(/^(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|ahad|monday|tuesday|wednesday|thursday|friday|saturday|sunday)[,\s:]+/i, '').trim();

  // 2. Bersihkan timestamp trailing (misal: "2026-09-17 00:00:00" atau "17/09/2026 08:00" atau "2026-09-17T00:00:00.000Z")
  clean = clean.replace(/[T\s].*$/, '').trim();

  // 3. Excel serial number: jika berupa bilangan bulat antara 35000 dan 65000 (rentang tahun 1995-2077)
  if (/^\d{5}$/.test(clean)) {
    const num = Number(clean);
    if (num >= 35000 && num <= 65000) {
      // Excel epoch 1899-12-30
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const targetDate = new Date(excelEpoch.getTime() + num * 86400 * 1000);
      const y = targetDate.getUTCFullYear();
      const m = padZero(targetDate.getUTCMonth() + 1);
      const d = padZero(targetDate.getUTCDate());
      return `${y}-${m}-${d}`;
    }
  }

  // 4. Cek apakah memuat nama bulan dalam teks (contoh: "17 September 2026", "17-Sep-2026", "17 Sep 26")
  const textMonthRegex = /^(\d{1,2})[-/\s.]([a-zA-Z]{3,12})[-/\s.](\d{2,4})$/;
  const matchText = clean.match(textMonthRegex);
  if (matchText) {
    const d = Number(matchText[1]);
    const mStr = matchText[2].toLowerCase();
    let y = Number(matchText[3]);
    if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;

    const m = MONTH_MAP[mStr];
    if (m && d >= 1 && d <= 31) {
      return `${y}-${padZero(m)}-${padZero(d)}`;
    }
  }

  // Cek pattern format US dengan nama bulan di depan: "September 17, 2026"
  const textMonthUSRegex = /^([a-zA-Z]{3,12})[-/\s.](\d{1,2})[,\s-]+(\d{2,4})$/;
  const matchTextUS = clean.match(textMonthUSRegex);
  if (matchTextUS) {
    const mStr = matchTextUS[1].toLowerCase();
    const d = Number(matchTextUS[2]);
    let y = Number(matchTextUS[3]);
    if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;

    const m = MONTH_MAP[mStr];
    if (m && d >= 1 && d <= 31) {
      return `${y}-${padZero(m)}-${padZero(d)}`;
    }
  }

  // 5. Pattern YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(clean)) {
    const [y, m, d] = clean.split(/[-/.]/).map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${padZero(m)}-${padZero(d)}`;
    }
  }

  // 6. Pattern numerik 3 bagian dipisahkan titik, garis miring, atau strip
  // Contoh: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, MM/DD/YYYY, DD-MM-YY
  const parts = clean.split(/[-/.]/);
  if (parts.length === 3 && parts.every(p => /^\d+$/.test(p))) {
    const p1 = Number(parts[0]);
    const p2 = Number(parts[1]);
    let p3 = Number(parts[2]);

    // Jika p1 adalah tahun 4 digit (contoh: 2026/9/17)
    if (parts[0].length === 4) {
      const y = p1;
      const m = p2;
      const d = p3;
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${y}-${padZero(m)}-${padZero(d)}`;
      }
    }

    // Jika tahun 2 digit (contoh: 26 -> 2026)
    if (p3 < 100) {
      p3 = p3 < 50 ? 2000 + p3 : 1900 + p3;
    }

    const y = p3;

    // Disambiguasi nilai p1 dan p2 (mana Hari, mana Bulan):
    // Kasus A: p1 > 12 -> Pasti p1 adalah Hari, p2 adalah Bulan (contoh: 17/09/2026)
    if (p1 > 12 && p2 <= 12) {
      const d = p1;
      const m = p2;
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return `${y}-${padZero(m)}-${padZero(d)}`;
      }
    }

    // Kasus B: p2 > 12 -> Pasti p1 adalah Bulan, p2 adalah Hari (contoh: 09/17/2026 - format US Google Sheets/Excel)
    if (p2 > 12 && p1 <= 12) {
      const m = p1;
      const d = p2;
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return `${y}-${padZero(m)}-${padZero(d)}`;
      }
    }

    // Kasus C: Keduanya <= 12 (contoh: 05/09/2026 vs 09/05/2026)
    if (p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 12) {
      if (expectedDay) {
        const normExp = normalizeDayOfWeek(expectedDay);
        if (normExp) {
          // Opsi 1: p1 = Hari, p2 = Bulan (format Indonesia DD/MM/YYYY)
          const dt1 = new Date(y, p2 - 1, p1, 12, 0, 0);
          const dayName1 = HARI_INDO[dt1.getDay()];

          // Opsi 2: p1 = Bulan, p2 = Hari (format US MM/DD/YYYY)
          const dt2 = new Date(y, p1 - 1, p2, 12, 0, 0);
          const dayName2 = HARI_INDO[dt2.getDay()];

          if (dayName1 === normExp && dayName2 !== normExp) {
            return `${y}-${padZero(p2)}-${padZero(p1)}`;
          }
          if (dayName2 === normExp && dayName1 !== normExp) {
            return `${y}-${padZero(p1)}-${padZero(p2)}`;
          }
        }
      }

      // Default Indonesia: p1 = Hari, p2 = Bulan (DD/MM/YYYY)
      return `${y}-${padZero(p2)}-${padZero(p1)}`;
    }
  }

  return null;
}

/**
 * Dapatkan nama hari bahasa Indonesia (Senin - Minggu) dari string tanggal YYYY-MM-DD
 */
export function getDayNameFromDateStr(dateStr: string): DayOfWeek {
  if (!dateStr) return 'Senin';
  const norm = normalizeDateString(dateStr);
  if (!norm) return 'Senin';
  const [y, m, d] = norm.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  return (HARI_INDO[dateObj.getDay()] || 'Senin') as DayOfWeek;
}

/**
 * Dapatkan tanggal YYYY-MM-DD dari hari tertentu di pekan ini (Senin - Minggu)
 * Berguna saat file CSV hanya mencantumkan kolom "Hari" tanpa kolom tanggal spesifik.
 */
export function getDateForDayInCurrentWeek(targetDay: DayOfWeek, refDate: Date = new Date()): string {
  const dayIndexMap: Record<DayOfWeek, number> = {
    'Senin': 1,
    'Selasa': 2,
    'Rabu': 3,
    'Kamis': 4,
    'Jumat': 5,
    'Sabtu': 6,
    'Minggu': 7
  };

  const targetIdx = dayIndexMap[targetDay] || 1;
  const currentDayOfWeek = refDate.getDay(); // 0 = Minggu, 1 = Senin, ...
  const currentIdx = currentDayOfWeek === 0 ? 7 : currentDayOfWeek;

  const diffDays = targetIdx - currentIdx;
  const resultDate = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + diffDays, 12, 0, 0);

  const yr = resultDate.getFullYear();
  const mo = padZero(resultDate.getMonth() + 1);
  const da = padZero(resultDate.getDate());
  return `${yr}-${mo}-${da}`;
}


import { ScheduleItem, DayOfWeek, ProgramType, Tutor } from '../types';
import { 
  normalizeDateString, 
  getDayNameFromDateStr, 
  getWibToday, 
  normalizeDayOfWeek, 
  getDateForDayInCurrentWeek 
} from './dateUtils';

// Re-export untuk kompatibilitas modul lain
export { normalizeDayOfWeek };

export const VALID_DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

/**
 * Normalisasi format jam HH:mm (contoh: 8.00 -> 08:00, 8:30 -> 08:30, 08:00 WIB -> 08:00)
 */
export function normalizeTime(raw: string): string {
  if (!raw) return '08:00';
  let clean = raw.trim().replace(/\./g, ':');
  // Hapus karakter non-digit dan non-colon (termasuk "WIB")
  clean = clean.replace(/[^0-9:]/g, '');

  if (/^\d{1,2}:\d{2}$/.test(clean)) {
    const [h, m] = clean.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }

  if (/^\d{1,2}$/.test(clean)) {
    return `${clean.padStart(2, '0')}:00`;
  }

  if (/^\d{4}$/.test(clean)) {
    return `${clean.substring(0, 2)}:${clean.substring(2, 4)}`;
  }

  return '08:00';
}

/**
 * Tambah menit ke format string jam "HH:mm"
 */
export function addMinutesToTime(timeStr: string, minutes: number = 90): string {
  const norm = normalizeTime(timeStr) || '08:00';
  const [h, m] = norm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

/**
 * Normalisasi nama program PKBM
 */
export function normalizeProgram(raw: string): ProgramType {
  if (!raw) return 'Paket C (Setara SMA)';
  const lower = raw.trim().toLowerCase();

  if (lower.includes('paket c') || lower.includes('sma') || lower === 'c') {
    return 'Paket C (Setara SMA)';
  }
  if (lower.includes('paket b') || lower.includes('smp') || lower === 'b') {
    return 'Paket B (Setara SMP)';
  }
  if (lower.includes('paket a') || lower.includes('sd') || lower === 'a') {
    return 'Paket A (Setara SD)';
  }
  if (lower.includes('paud') || lower.includes('tk') || lower.includes('kb')) {
    return 'PAUD Bina Insani';
  }
  if (lower.includes('kf') || lower.includes('keaksaraan')) {
    return 'Keaksaraan Fungsional (KF)';
  }
  if (lower.includes('kursus') || lower.includes('vokasi') || lower.includes('keterampilan') || lower.includes('pelatihan')) {
    return 'Kursus & Keterampilan / Vokasi';
  }

  return 'Paket C (Setara SMA)';
}

/**
 * Parser baris CSV yang menangani kutipan ganda (RFC 4180 compliant)
 */
export function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++; // lewati kutipan kedua
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Mendeteksi delimiter yang paling dominan di baris-baris awal (koma, titik-koma, atau tab)
 */
export function detectDelimiter(text: string): string {
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0).slice(0, 5);
  let semicolons = 0;
  let commas = 0;
  let tabs = 0;

  for (const line of lines) {
    semicolons += (line.match(/;/g) || []).length;
    commas += (line.match(/,/g) || []).length;
    tabs += (line.match(/\t/g) || []).length;
  }

  if (semicolons >= commas && semicolons >= tabs && semicolons > 0) return ';';
  if (tabs > commas && tabs > semicolons) return '\t';
  return ',';
}

export interface ParseScheduleResult {
  items: ScheduleItem[];
  errors: string[];
  warnings: string[];
  totalRows: number;
  validRows: number;
}

/**
 * Membaca dan memvalidasi teks file CSV jadwal semester
 */
export function parseScheduleCsv(csvText: string, availableTutors: Tutor[] = []): ParseScheduleResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const items: ScheduleItem[] = [];

  if (!csvText || !csvText.trim()) {
    errors.push('File CSV kosong atau tidak memiliki data.');
    return { items, errors, warnings, totalRows: 0, validRows: 0 };
  }

  // Bersihkan karakter BOM jika ada
  const cleanCsvText = csvText.replace(/^\uFEFF/, '').trim();
  const delimiter = detectDelimiter(cleanCsvText);
  const rawLines = cleanCsvText.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);

  if (rawLines.length < 2) {
    errors.push('File CSV harus memuat minimal baris judul kolom (header) dan 1 baris data jadwal.');
    return { items, errors, warnings, totalRows: 0, validRows: 0 };
  }

  // Cari baris header yang sesungguhnya (bisa di baris 0, 1, atau 2 jika ada judul banner di baris atas)
  let headerRowIndex = 0;
  let headerCells: string[] = [];
  const knownHeaderKeywords = ['tanggal', 'tgl', 'hari', 'jam', 'waktu', 'pukul', 'mapel', 'mata_pelajaran', 'pelajaran', 'tutor', 'guru', 'pengajar', 'kelas', 'program', 'jenjang', 'ruang', 'lokasi'];

  for (let r = 0; r < Math.min(rawLines.length, 4); r++) {
    const parsedLine = parseCsvLine(rawLines[r], delimiter).map(h => 
      h.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    );
    const matchCount = parsedLine.filter(cell => 
      knownHeaderKeywords.some(kw => cell === kw || cell.includes(kw))
    ).length;

    if (matchCount >= 2) {
      headerRowIndex = r;
      headerCells = parsedLine;
      break;
    }
  }

  if (headerCells.length === 0) {
    headerRowIndex = 0;
    headerCells = parseCsvLine(rawLines[0], delimiter).map(h => 
      h.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    );
  }

  // Cari indeks kolom berdasarkan sinonim umum (utamakan exact match sebelum includes)
  const findCol = (candidates: string[]): number => {
    // 1. Exact match
    for (const c of candidates) {
      const idx = headerCells.findIndex(h => h === c);
      if (idx !== -1) return idx;
    }
    // 2. Includes match
    for (const c of candidates) {
      const idx = headerCells.findIndex(h => h.includes(c));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const dateIdx = findCol(['tanggal', 'tgl', 'date', 'waktu_pelaksanaan', 'tgl_kbm', 'tgl_belajar', 'tanggal_kbm', 'hari_tanggal', 'hari_tgl']);
  const dayIdx = findCol(['hari', 'day', 'hari_belajar', 'hari_mengajar', 'hari_kbm']);
  const timeStartIdx = findCol(['jam_mulai', 'waktu_mulai', 'mulai', 'start_time', 'start', 'jam_ke', 'jam_awal', 'pukul_mulai']);
  const timeEndIdx = findCol(['jam_selesai', 'waktu_selesai', 'selesai', 'end_time', 'end', 'jam_akhir', 'pukul_selesai']);
  const combinedTimeIdx = findCol(['jam', 'waktu', 'pukul', 'waktu_kbm', 'jam_kbm', 'jam_pelajaran', 'jam_belajar']);
  const programIdx = findCol(['program', 'jenjang', 'paket', 'tingkat', 'pendidikan', 'jurusan']);
  const classIdx = findCol(['kelas', 'rombel', 'kelompok', 'class_group', 'class', 'kelompok_belajar', 'tingkat_kelas']);
  const subjectIdx = findCol(['mata_pelajaran', 'mapel', 'subject', 'kegiatan', 'materi', 'nama_pelajaran', 'mata_kuliah', 'pelajaran', 'materi_pembelajaran', 'kurikulum']);
  const tutorIdx = findCol(['nama_tutor', 'tutor', 'guru', 'pengajar', 'instruktur', 'tutor_name', 'nama_guru', 'nama_pengajar', 'pendidik']);
  const roomIdx = findCol(['ruang', 'lokasi', 'tempat', 'room', 'pos_belajar', 'tempat_kegiatan', 'gedung', 'ruang_kelas', 'ruangan']);
  const semesterIdx = findCol(['semester', 'tahun_ajaran', 'ta', 'periode', 'smt']);
  const notesIdx = findCol(['keterangan', 'catatan', 'notes', 'topik', 'deskripsi', 'ket', 'info', 'silabus']);

  if (dateIdx === -1 && dayIdx === -1) {
    warnings.push('Kolom "Tanggal" atau "Hari" tidak terdeteksi secara otomatis di baris judul.');
  }
  if (subjectIdx === -1 && programIdx === -1) {
    errors.push('Kolom "Mata Pelajaran" atau "Program" wajib ada di baris judul (header) CSV.');
    return { items, errors, warnings, totalRows: rawLines.length - (headerRowIndex + 1), validRows: 0 };
  }

  let totalRows = 0;

  for (let i = headerRowIndex + 1; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;
    totalRows++;

    const cells = parseCsvLine(line, delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());

    // Ambil nilai per kolom dengan proteksi indeks
    let rawDate = dateIdx !== -1 ? cells[dateIdx] || '' : '';
    let rawDay = dayIdx !== -1 ? cells[dayIdx] || '' : '';

    // Deteksi jika hari & tanggal tergabung dalam satu kolom (contoh: "Kamis, 17/09/2026")
    if (dateIdx === dayIdx && rawDate) {
      const dayMatch = rawDate.match(/^(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|ahad|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      if (dayMatch) {
        rawDay = dayMatch[1];
      }
    } else if (!rawDay && rawDate) {
      const dayMatch = rawDate.match(/^(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|ahad|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      if (dayMatch) {
        rawDay = dayMatch[1];
      }
    }

    const normalizedExpectedDay = normalizeDayOfWeek(rawDay);

    // Normalisasi tanggal dengan bantuan expectedDay untuk mendisambiguasi format DD/MM vs MM/DD
    const normalizedDate = normalizeDateString(rawDate, normalizedExpectedDay);

    let date: string;
    let dayOfWeek: DayOfWeek;

    if (normalizedDate) {
      date = normalizedDate;
      const calendarDay = getDayNameFromDateStr(normalizedDate);

      // Jika user menyediakan nama hari, cek kesesuaiannya dengan kalender
      if (normalizedExpectedDay && normalizedExpectedDay !== calendarDay) {
        dayOfWeek = calendarDay;
      } else {
        dayOfWeek = calendarDay;
      }
    } else if (normalizedExpectedDay) {
      // Jika kolom tanggal kosong namun nama hari terisi (jadwal berulang mingguan):
      // Petakan ke tanggal riil pekan ini agar tanggal dan harinya cocok 100%
      dayOfWeek = normalizedExpectedDay;
      date = getDateForDayInCurrentWeek(normalizedExpectedDay);
    } else {
      // Fallback aman jika tanggal maupun hari tidak dapat dibaca
      dayOfWeek = 'Senin';
      date = getDateForDayInCurrentWeek('Senin');
      warnings.push(`Baris ${i + 1}: Tanggal dan hari tidak terdeteksi. Dialihkan ke Senin pekan ini (${date}).`);
    }

    // Parsing Waktu Mulai & Selesai
    let timeStart = '08:00';
    let timeEnd = '09:30';

    const rawStart = timeStartIdx !== -1 ? cells[timeStartIdx] || '' : '';
    const rawEnd = timeEndIdx !== -1 ? cells[timeEndIdx] || '' : '';
    const rawCombinedTime = combinedTimeIdx !== -1 ? cells[combinedTimeIdx] || '' : '';

    if (rawStart) {
      timeStart = normalizeTime(rawStart);
      if (rawEnd) {
        timeEnd = normalizeTime(rawEnd);
      } else {
        timeEnd = addMinutesToTime(timeStart, 90);
      }
    } else if (rawCombinedTime) {
      // Membaca rentang waktu seperti "08:00 - 09:30", "08.00-09.30", "08:00 s/d 09:30"
      const timeParts = rawCombinedTime.split(/\s*(?:-|–|—|s\/d|s\.d|sampai|to)\s*/i);
      if (timeParts.length >= 2) {
        timeStart = normalizeTime(timeParts[0]);
        timeEnd = normalizeTime(timeParts[1]);
      } else {
        timeStart = normalizeTime(rawCombinedTime);
        timeEnd = addMinutesToTime(timeStart, 90);
      }
    }

    const rawProg = programIdx !== -1 ? cells[programIdx] || '' : '';
    const rawClass = classIdx !== -1 ? cells[classIdx] || '' : '';
    const rawSubj = subjectIdx !== -1 ? cells[subjectIdx] || '' : '';
    const rawTutor = tutorIdx !== -1 ? cells[tutorIdx] || '' : '';
    const rawRoom = roomIdx !== -1 ? cells[roomIdx] || '' : '';
    const rawSem = semesterIdx !== -1 ? cells[semesterIdx] || '' : '';
    const rawNotes = notesIdx !== -1 ? cells[notesIdx] || '' : '';

    const program = normalizeProgram(rawProg);
    const subjectTitle = rawSubj.trim() || 'Pembelajaran Tematik / Keaksaraan';
    const classGroup = rawClass.trim() || 'Gedung Utama PKBM';
    const tutorName = rawTutor.trim() || 'Tutor PKBM Bina Insani';
    const room = rawRoom.trim() || 'Gedung Utama PKBM';
    const semester = rawSem.trim() || 'Semester Ganjil 2026/2027';
    const notes = rawNotes.trim();

    // Cocokkan ID tutor jika terdaftar
    const matchedTutor = availableTutors.find(t => 
      t.name.toLowerCase() === tutorName.toLowerCase() ||
      t.name.toLowerCase().includes(tutorName.toLowerCase()) ||
      tutorName.toLowerCase().includes(t.name.toLowerCase()) ||
      (t.nipCode && t.nipCode === tutorName)
    );

    const item: ScheduleItem = {
      id: `sch-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      date,
      dayOfWeek,
      timeStart,
      timeEnd,
      program,
      subjectTitle,
      classGroup,
      tutorId: matchedTutor?.id,
      tutorName: matchedTutor?.name || tutorName,
      room,
      semester,
      notes: notes || undefined
    };

    items.push(item);
  }

  return {
    items,
    errors,
    warnings,
    totalRows,
    validRows: items.length
  };
}

/**
 * Menghasilkan file template CSV contoh 1 semester berbasis tanggal untuk diunduh pengelola/admin
 */
export function generateScheduleTemplateCsv(): string {
  const headers = [
    'Tanggal',
    'Hari',
    'Jam_Mulai',
    'Jam_Selesai',
    'Program',
    'Kelas',
    'Mata_Pelajaran',
    'Nama_Tutor',
    'Ruang_Lokasi',
    'Semester',
    'Keterangan'
  ];

  const today = getWibToday(); // e.g. "2026-09-17"
  const [y, m, d] = today.split('-').map(Number);

  // Helper membuat tanggal offset
  const formatDateOffset = (offsetDays: number): string => {
    const target = new Date(y, m - 1, d + offsetDays, 12, 0, 0);
    const yr = target.getFullYear();
    const mo = String(target.getMonth() + 1).padStart(2, '0');
    const da = String(target.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  const rows = [
    // Hari Ini
    [today, getDayNameFromDateStr(today), '08:00', '09:30', 'Paket C (Setara SMA)', 'Kelas 10', 'Bahasa Indonesia', 'Lailatul Arifah, S.H., M.Pd.', 'Gedung Utama PKBM', 'Semester Ganjil 2026/2027', 'Pertemuan Modul 1 - Teks Laporan Hasil Observasi'],
    [today, getDayNameFromDateStr(today), '09:45', '11:15', 'Paket C (Setara SMA)', 'Kelas 10', 'Matematika', 'Nunung Khoiriyah', 'Gedung Utama PKBM', 'Semester Ganjil 2026/2027', 'Eksponen dan Logaritma Dasar'],
    [today, getDayNameFromDateStr(today), '13:00', '14:30', 'Kursus & Keterampilan / Vokasi', 'Kelas Vokasi Komputer', 'Literasi Komputer & Perkantoran', 'H. Sugeng Wahyudi, S.E.', 'Laboratorium Komputer', 'Semester Ganjil 2026/2027', 'Praktik Ms Word & Excel Administrasi Usaha'],

    // Sesi Pekan 1 (Contoh Hari Sabtu & Minggu mendatang)
    [formatDateOffset(2), getDayNameFromDateStr(formatDateOffset(2)), '08:00', '10:00', 'Paket C (Setara SMA)', 'Kelas 11 & 12', 'Informatika & Pemrograman', 'Tutor PKBM Bina Insani', 'Laboratorium Komputer', 'Semester Ganjil 2026/2027', 'Pengenalan Algoritma & Keamanan Berinternet'],
    [formatDateOffset(3), getDayNameFromDateStr(formatDateOffset(3)), '08:30', '10:30', 'Paket C (Setara SMA)', 'Kelas 12', 'Pendalaman Materi Asesmen / Ujian', 'Lailatul Arifah, S.H., M.Pd.', 'Gedung Utama PKBM', 'Semester Ganjil 2026/2027', 'Latihan Soal Literasi & Numerasi'],
    [formatDateOffset(3), getDayNameFromDateStr(formatDateOffset(3)), '10:45', '12:15', 'Paket A (Setara SD)', 'Kelas 5 & 6', 'Pembelajaran Tematik Terpadu', 'Nunung Khoiriyah', 'Gedung Utama PKBM', 'Semester Ganjil 2026/2027', 'Tema Lingkungan Sehat dan Rukun Warga'],

    // Sesi Pekan 2 (Jadwal Tanggal Berbeda)
    [formatDateOffset(7), getDayNameFromDateStr(formatDateOffset(7)), '08:00', '09:30', 'Paket B (Setara SMP)', 'Kelas 7', 'Bahasa Indonesia', 'Lailatul Arifah, S.H., M.Pd.', 'Gedung Utama PKBM', 'Semester Ganjil 2026/2027', 'Teks Deskripsi dan Cerita Fantasi'],
    [formatDateOffset(7), getDayNameFromDateStr(formatDateOffset(7)), '09:45', '11:15', 'Paket B (Setara SMP)', 'Kelas 7', 'Matematika', 'Nunung Khoiriyah', 'Gedung Utama PKBM', 'Semester Ganjil 2026/2027', 'Bilangan Bulat dan Pecahan Terapan'],
    [formatDateOffset(8), getDayNameFromDateStr(formatDateOffset(8)), '13:00', '15:00', 'Keaksaraan Fungsional (KF)', 'Warga Belajar Dusun Ngadikerso', 'Literasi Membaca & Menghitung', 'Nunung Khoiriyah', 'Pos Belajar Dusun Ngadikerso', 'Semester Ganjil 2026/2027', 'Membaca Nota Pasar & Tanda Tangan Mandiri'],
    [formatDateOffset(9), getDayNameFromDateStr(formatDateOffset(9)), '09:30', '11:00', 'PAUD Bina Insani', 'Kelompok A & B', 'Karakter & Literasi Anak Usia Dini', 'Tutor PAUD Bina Insani', 'Ruang Bermain PAUD', 'Semester Ganjil 2026/2027', 'Mengenal Warna, Angka, dan Motorik Halus'],

    // Sesi Pekan 3 (Jadwal Modul Lanjutan)
    [formatDateOffset(14), getDayNameFromDateStr(formatDateOffset(14)), '08:00', '09:30', 'Paket C (Setara SMA)', 'Kelas 12', 'Ekonomi', 'H. Sugeng Wahyudi, S.E.', 'Gedung Utama PKBM', 'Semester Ganjil 2026/2027', 'Akuntansi Keuangan & Usaha Kecil'],
    [formatDateOffset(14), getDayNameFromDateStr(formatDateOffset(14)), '09:45', '11:15', 'Paket C (Setara SMA)', 'Kelas 12', 'Geografi', 'Tutor PKBM Bina Insani', 'Gedung Utama PKBM', 'Semester Ganjil 2026/2027', 'Pemanfaatan Peta & Penginderaan Jauh'],
    [formatDateOffset(16), getDayNameFromDateStr(formatDateOffset(16)), '13:30', '15:30', 'Kursus & Keterampilan / Vokasi', 'Kelompok Ibu Produktif', 'Kewirausahaan Olahan Hasil Pertanian', 'H. Sugeng Wahyudi, S.E.', 'Aula Serbaguna PKBM', 'Semester Ganjil 2026/2027', 'Pembuatan Keripik Sayur & Pengemasan'],

    // Sesi Pekan 4 (Pendalaman Semester)
    [formatDateOffset(21), getDayNameFromDateStr(formatDateOffset(21)), '08:00', '09:30', 'Paket C (Setara SMA)', 'Kelas 11', 'Bahasa Inggris', 'Tutor PKBM Bina Insani', 'Gedung Utama PKBM', 'Semester Ganjil 2026/2027', 'Expressing Opinion & Formal Letters'],
    [formatDateOffset(21), getDayNameFromDateStr(formatDateOffset(21)), '09:45', '11:15', 'Paket C (Setara SMA)', 'Kelas 11', 'Sosiologi', 'Lailatul Arifah, S.H., M.Pd.', 'Gedung Utama PKBM', 'Semester Ganjil 2026/2027', 'Kelompok Sosial di Masyarakat Pedesaan'],
    [formatDateOffset(23), getDayNameFromDateStr(formatDateOffset(23)), '08:00', '10:00', 'Paket C (Setara SMA)', 'Kelas 10', 'Pendidikan Pancasila', 'Lailatul Arifah, S.H., M.Pd.', 'Gedung Utama PKBM', 'Semester Ganjil 2026/2027', 'Penerapan Nilai Pancasila dalam Keluarga']
  ];

  const csvRows = [
    headers.join(','),
    ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
  ];

  return '\uFEFF' + csvRows.join('\r\n');
}

/**
 * Ekspor daftar jadwal saat ini menjadi string CSV berbasis tanggal
 */
export function exportSchedulesToCsv(items: ScheduleItem[]): string {
  const headers = [
    'Tanggal',
    'Hari',
    'Jam_Mulai',
    'Jam_Selesai',
    'Program',
    'Kelas',
    'Mata_Pelajaran',
    'Nama_Tutor',
    'Ruang_Lokasi',
    'Semester',
    'Keterangan'
  ];

  const rows = items.map(item => [
    item.date || '',
    item.dayOfWeek,
    item.timeStart,
    item.timeEnd,
    item.program,
    item.classGroup,
    item.subjectTitle,
    item.tutorName,
    item.room || 'Gedung Utama PKBM',
    item.semester || 'Semester Ganjil 2026/2027',
    item.notes || ''
  ]);

  const csvRows = [
    headers.join(','),
    ...rows.map(row => row.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(','))
  ];

  return '\uFEFF' + csvRows.join('\r\n');
}

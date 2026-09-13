import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  CalendarRange, 
  Clock, 
  Users, 
  BookOpen, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  FileSpreadsheet, 
  Printer, 
  Eye, 
  CheckCircle2, 
  Sparkles, 
  PlusCircle, 
  Filter, 
  Layers, 
  GraduationCap,
  CalendarCheck,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AttendanceRecord, UserSession, Tutor, PKBMInfo, ProgramType } from '../types';
import { getWibToday, getWibPresetRange, formatWibDateIndo, formatTimeWibDisplay, WibPresetType } from '../lib/dateUtils';
import { PhotoWatermarkModal } from './PhotoWatermarkModal';

interface TutorRekapitulasiViewProps {
  currentUser: UserSession;
  allRecords: AttendanceRecord[];
  tutorProfile?: Tutor | null;
  pkbmInfo?: PKBMInfo;
  onNavigateToPresensi?: () => void;
}

export const TutorRekapitulasiView: React.FC<TutorRekapitulasiViewProps> = ({
  currentUser,
  allRecords,
  tutorProfile,
  pkbmInfo,
  onNavigateToPresensi
}) => {
  const todayStr = useMemo(() => getWibToday(), []);
  
  // Default range: This Month
  const defaultMonthRange = useMemo(() => getWibPresetRange('thisMonth'), []);

  const [activePreset, setActivePreset] = useState<WibPresetType>('thisMonth');
  const [startDate, setStartDate] = useState<string>(defaultMonthRange.startDate);
  const [endDate, setEndDate] = useState<string>(defaultMonthRange.endDate);
  const [programFilter, setProgramFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Modal for photo inspection
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<AttendanceRecord | null>(null);

  // Filter only records that belong to this tutor
  const myRecords = useMemo(() => {
    return allRecords.filter(r => {
      if (currentUser.tutorId && r.tutorId) {
        return r.tutorId === currentUser.tutorId;
      }
      return r.tutorName.toLowerCase().trim() === currentUser.name.toLowerCase().trim();
    });
  }, [allRecords, currentUser]);

  // Handle Preset Button Click
  const handleSelectPreset = (preset: WibPresetType) => {
    setActivePreset(preset);
    const range = getWibPresetRange(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  // Custom date input change triggers activePreset -> 'custom'
  const handleCustomStartDate = (val: string) => {
    setStartDate(val);
    setActivePreset('all'); // Custom range
  };

  const handleCustomEndDate = (val: string) => {
    setEndDate(val);
    setActivePreset('all'); // Custom range
  };

  // Filtered by date duration & search/program criteria
  const filteredRecords = useMemo(() => {
    return myRecords.filter(record => {
      // Date duration filter
      if (startDate && record.date < startDate) return false;
      if (endDate && record.date > endDate) return false;

      // Program filter
      if (programFilter !== 'ALL' && record.program !== programFilter) {
        return false;
      }

      // Status Geofence filter
      if (statusFilter === 'VALID' && !record.location.isWithinRadius) {
        return false;
      }
      if (statusFilter === 'OUTSIDE' && record.location.isWithinRadius) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchSubject = record.subjectTitle.toLowerCase().includes(query);
        const matchClass = record.classGroup.toLowerCase().includes(query);
        const matchNotes = (record.activityNotes || '').toLowerCase().includes(query);
        const matchLocation = (record.location.matchedLocationName || '').toLowerCase().includes(query);
        if (!matchSubject && !matchClass && !matchNotes && !matchLocation) {
          return false;
        }
      }

      return true;
    });
  }, [myRecords, startDate, endDate, programFilter, statusFilter, searchTerm]);

  // KPI calculations
  const totalKegiatan = filteredRecords.length;
  const totalWB = filteredRecords.reduce((acc, curr) => acc + (curr.studentCount || 0), 0);
  const avgWB = totalKegiatan > 0 ? Math.round(totalWB / totalKegiatan) : 0;
  
  // Total teaching minutes calculated from timeStart to timeEnd
  const totalMinutes = useMemo(() => {
    return filteredRecords.reduce((sum, r) => {
      if (!r.timeStart || !r.timeEnd) return sum;
      const [sh, sm] = r.timeStart.split(':').map(Number);
      const [eh, em] = r.timeEnd.split(':').map(Number);
      if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return sum;
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      return sum + (diff > 0 ? diff : 0);
    }, 0);
  }, [filteredRecords]);

  const hoursDisplay = useMemo(() => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0 && mins === 0) return '0 Jam';
    if (mins === 0) return `${hours} Jam`;
    return `${hours} Jam ${mins} Menit`;
  }, [totalMinutes]);

  const totalValidGps = filteredRecords.filter(r => r.location.isWithinRadius).length;
  const gpsComplianceRate = totalKegiatan > 0 
    ? Math.round((totalValidGps / totalKegiatan) * 100) 
    : 100;

  // Program breakdown
  const programBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      counts[r.program] = (counts[r.program] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredRecords]);

  // Location breakdown
  const locationBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const locName = r.location.matchedLocationName || 'Titik Lokasi PKBM';
      counts[locName] = (counts[locName] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredRecords]);

  // Friendly date range badge label
  const periodLabel = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === todayStr && endDate === todayStr) {
        return `Hari Ini (${formatWibDateIndo(todayStr, 'short')})`;
      }
      if (startDate === endDate) {
        return `Tanggal ${formatWibDateIndo(startDate, 'long')}`;
      }
      return `${formatWibDateIndo(startDate, 'short')} s.d. ${formatWibDateIndo(endDate, 'short')}`;
    }
    if (startDate) return `Sejak ${formatWibDateIndo(startDate, 'long')}`;
    if (endDate) return `Sampai ${formatWibDateIndo(endDate, 'long')}`;
    return 'Semua Riwayat Kegiatan';
  }, [startDate, endDate, todayStr]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert('Tidak ada data kegiatan pada rentang tanggal ini untuk diekspor.');
      return;
    }

    const titleRows = [
      ["REKAPITULASI KEGIATAN PEMBELAJARAN & PRESENSI MANDIRI TUTOR"],
      [pkbmInfo?.name || "PKBM BINA INSANI SUMOWONO"],
      [`NPSN: ${pkbmInfo?.npsn || 'P9948443'} | Alamat: ${pkbmInfo?.address || 'Sumowono, Kab. Semarang'}`],
      [],
      ["NAMA TUTOR", currentUser.name],
      ["NIP / KODE ID", currentUser.nipCode || tutorProfile?.nipCode || "-"],
      ["BIDANG / SPESIALISASI", tutorProfile?.specialization || "Tutor Pendidikan Kesetaraan"],
      ["PERIODE KEGIATAN", periodLabel],
      ["TANGGAL CETAK / UNDUH", `${formatWibDateIndo(todayStr, 'long')} (WIB)`],
      [],
      [
        "NO",
        "TANGGAL",
        "JAM MULAI",
        "JAM SELESAI",
        "DURASI (JAM)",
        "PROGRAM KESETARAAN",
        "MATA PELAJARAN / MODUL",
        "KELOMPOK / KELAS",
        "JUMLAH WB HADIR",
        "TITIK LOKASI / POS",
        "STATUS GEOFENCE",
        "URAIAN MATERI / CATATAN"
      ]
    ];

    filteredRecords.forEach((r, idx) => {
      let durationStr = '-';
      if (r.timeStart && r.timeEnd) {
        const [sh, sm] = r.timeStart.split(':').map(Number);
        const [eh, em] = r.timeEnd.split(':').map(Number);
        if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
          const diff = (eh * 60 + em) - (sh * 60 + sm);
          if (diff > 0) {
            const h = Math.floor(diff / 60);
            const m = diff % 60;
            durationStr = m > 0 ? `${h}j ${m}m` : `${h} Jam`;
          }
        }
      }

      titleRows.push([
        (idx + 1) as any,
        r.date,
        formatTimeWibDisplay(r.timeStart),
        formatTimeWibDisplay(r.timeEnd),
        durationStr,
        r.program,
        r.subjectTitle,
        r.classGroup,
        r.studentCount || 0,
        r.location.matchedLocationName || 'Titik Terdaftar',
        r.location.isWithinRadius ? 'Dalam Radius (Valid)' : 'Luar Radius',
        r.activityNotes || '-'
      ]);
    });

    // Summary Rows
    titleRows.push([]);
    titleRows.push([
      "TOTAL KEGIATAN",
      `${totalKegiatan} Sesi`,
      "",
      "TOTAL WAKTU",
      hoursDisplay,
      "",
      "TOTAL WB TERLAYANI",
      `${totalWB} Orang WB`,
      "",
      "VALIDITAS GPS",
      `${gpsComplianceRate}% Terverifikasi`
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(titleRows);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 },  // No
      { wch: 14 }, // Tanggal
      { wch: 12 }, // Jam Mulai
      { wch: 12 }, // Jam Selesai
      { wch: 14 }, // Durasi
      { wch: 25 }, // Program
      { wch: 26 }, // Mapel
      { wch: 20 }, // Kelompok
      { wch: 16 }, // WB Hadir
      { wch: 28 }, // Lokasi
      { wch: 20 }, // Status Geofence
      { wch: 45 }, // Catatan
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Tutor");
    const safeTutorName = currentUser.name.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `Rekap_Kegiatan_Tutor_${safeTutorName}_${startDate || 'awal'}_sd_${endDate || 'akhir'}.xlsx`);
  };

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Tutor Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-blue-800/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4 sm:gap-5">
          {currentUser.avatarUrl ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-md shrink-0">
              <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-400/20 text-amber-300 border-2 border-amber-400/40 flex items-center justify-center font-black text-2xl shadow-md shrink-0">
              <GraduationCap className="w-9 h-9" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-400 text-slate-950 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <CalendarCheck className="w-3 h-3" />
                Rekapitulasi Kegiatan Tutor
              </span>
              {tutorProfile?.nipCode && (
                <span className="text-xs text-blue-200 font-mono bg-blue-900/60 px-2 py-0.5 rounded border border-blue-600/40">
                  NIP: {tutorProfile.nipCode}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              {currentUser.name}
            </h2>
            <p className="text-xs sm:text-sm text-blue-200 mt-0.5">
              {tutorProfile?.specialization || 'Tutor Pendidikan Kesetaraan & Pemberdayaan Masyarakat'} • PKBM Bina Insani Sumowono
            </p>
          </div>
        </div>

        {/* Action Buttons: Export & Tambah Presensi */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-start md:justify-end flex-wrap print:hidden">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-2 border border-emerald-400/40"
            title="Download Spreadsheet Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>Unduh Excel (.xlsx)</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs sm:text-sm font-bold border border-slate-700 shadow transition flex items-center gap-1.5"
            title="Cetak Laporan / Simpan PDF"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>Cetak / PDF</span>
          </button>

          {onNavigateToPresensi && (
            <button
              onClick={onNavigateToPresensi}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-1.5 border border-blue-400/50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Input Presensi</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Date Duration Filter Control Box */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 print:hidden">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                Filter Rentang Tanggal Kegiatan
              </h3>
              <p className="text-xs text-slate-500">
                Pilih periode tanggal kegiatan pembelajaran yang ingin Anda rekapitulasi.
              </p>
            </div>
          </div>

          {/* Active Period Badge */}
          <div className="flex items-center gap-2 bg-blue-50/80 text-blue-900 border border-blue-200/80 px-3.5 py-1.5 rounded-xl text-xs font-bold">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Periode Aktif: <strong>{periodLabel}</strong></span>
          </div>
        </div>

        {/* Quick Presets Row */}
        <div>
          <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
            Pilihan Periode Cepat:
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectPreset('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                activePreset === 'today' && startDate === todayStr && endDate === todayStr
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('last7Days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                activePreset === 'last7Days'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              7 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('thisMonth')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                activePreset === 'thisMonth'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('lastMonth')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                activePreset === 'lastMonth'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              Bulan Lalu
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('last3Months')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                activePreset === 'last3Months'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              3 Bulan Terakhir
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('thisYear')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                activePreset === 'thisYear'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              Tahun Ini
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                activePreset === 'all' && !startDate && !endDate
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              Semua Riwayat
            </button>
          </div>
        </div>

        {/* Date Inputs & Secondary Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {/* Start Date */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
              Tanggal Mulai
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
              Tanggal Selesai
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* Program Filter */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
              Program Kesetaraan
            </label>
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="ALL">Semua Program</option>
              <option value="Paket A (Setara SD)">Paket A (SD)</option>
              <option value="Paket B (Setara SMP)">Paket B (SMP)</option>
              <option value="Paket C (Setara SMA)">Paket C (SMA)</option>
              <option value="Keaksaraan Fungsional (KF)">Keaksaraan (KF)</option>
              <option value="PAUD Bina Insani">PAUD</option>
              <option value="Kursus & Keterampilan / Vokasi">Vokasi / Kursus</option>
            </select>
          </div>

          {/* Status GPS Filter */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
              Verifikasi Titik
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="ALL">Semua Titik Presensi</option>
              <option value="VALID">Radius Valid Resmi</option>
              <option value="OUTSIDE">Luar Radius</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
              Cari Mapel / Materi
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari mata pelajaran..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>
        </div>

      </div>

      {/* 3. KPI / Summary Cards for the Filtered Duration */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Kegiatan Dilaksanakan */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Total Kegiatan
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {totalKegiatan}
              </span>
              <span className="text-xs font-bold text-slate-500">Sesi</span>
            </div>
          </div>
        </div>

        {/* Total WB Terlayani */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Warga Belajar
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {totalWB}
              </span>
              <span className="text-xs font-bold text-slate-500">Hadir</span>
            </div>
            {totalKegiatan > 0 && (
              <p className="text-[10px] text-slate-400">Rata-rata {avgWB} WB / sesi</p>
            )}
          </div>
        </div>

        {/* Total Jam Mengajar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Total Jam Mengajar
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-black text-slate-900 truncate">
                {hoursDisplay}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Dari akumulasi jam sesi</p>
          </div>
        </div>

        {/* GPS Geofence Compliance */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Keabsahan Titik GPS
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {gpsComplianceRate}%
              </span>
              <span className="text-xs font-bold text-slate-500">Valid</span>
            </div>
            <p className="text-[10px] text-slate-400">{totalValidGps} dari {totalKegiatan} sesi</p>
          </div>
        </div>

      </div>

      {/* 4. Mini Breakdown Rows: Program & Lokasi */}
      {totalKegiatan > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Program Distribution */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Distribusi Program Kesetaraan</span>
            </h4>
            <div className="space-y-2">
              {programBreakdown.map(([progName, count]) => {
                const percent = Math.round((count / totalKegiatan) * 100);
                return (
                  <div key={progName} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span className="truncate pr-2">{progName}</span>
                      <span className="text-blue-600 font-extrabold">{count} Sesi ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Location Distribution */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Titik Lokasi Pembelajaran</span>
            </h4>
            <div className="space-y-2">
              {locationBreakdown.map(([locName, count]) => {
                const percent = Math.round((count / totalKegiatan) * 100);
                return (
                  <div key={locName} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span className="truncate pr-2">{locName}</span>
                      <span className="text-emerald-700 font-extrabold">{count} Sesi ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* 5. Detailed Activity List Table & Mobile Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        
        {/* Table Title Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <span>Daftar Kegiatan Pembelajaran</span>
              <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-extrabold">
                {filteredRecords.length} Data
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Riwayat lengkap pembelajaran mandiri pada rentang: {periodLabel}
            </p>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Zona Waktu: <strong>WIB (UTC+7)</strong>
          </div>
        </div>

        {/* Empty State */}
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl mx-auto flex items-center justify-center text-slate-400 border border-slate-200">
              <CalendarRange className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 text-base">
                Tidak Ada Kegiatan Ditemukan
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Tidak ada data presensi pembelajaran dalam rentang tanggal <strong>{periodLabel}</strong>. 
                Cobalah memilih tombol preset periode lain atau rekam presensi baru.
              </p>
            </div>
            {onNavigateToPresensi && (
              <button
                onClick={onNavigateToPresensi}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Input Presensi Hari Ini</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100/80 text-slate-700 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 text-center w-12">No</th>
                    <th className="py-3.5 px-4">Tanggal &amp; Waktu (WIB)</th>
                    <th className="py-3.5 px-4">Program &amp; Tingkat</th>
                    <th className="py-3.5 px-4">Mata Pelajaran &amp; Materi</th>
                    <th className="py-3.5 px-4">Lokasi &amp; Radius</th>
                    <th className="py-3.5 px-4 text-center">WB Hadir</th>
                    <th className="py-3.5 px-4 text-center">Foto Kegiatan</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredRecords.map((r, idx) => {
                    const isWithin = r.location.isWithinRadius;
                    return (
                      <tr key={r.id} className="hover:bg-blue-50/40 transition-colors">
                        {/* No */}
                        <td className="py-3.5 px-4 text-center text-slate-400 font-bold">
                          {idx + 1}
                        </td>

                        {/* Tanggal & Waktu */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-extrabold text-slate-900">
                            {formatWibDateIndo(r.date, 'short')}
                          </div>
                          <div className="text-[11px] text-blue-600 font-bold flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeWibDisplay(r.timeStart)} - {formatTimeWibDisplay(r.timeEnd)}</span>
                          </div>
                        </td>

                        {/* Program & Tingkat */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 mb-1">
                            {r.program}
                          </span>
                          <div className="text-slate-800 font-bold text-xs">
                            {r.classGroup}
                          </div>
                        </td>

                        {/* Mapel & Materi */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-extrabold text-slate-900">
                            {r.subjectTitle}
                          </div>
                          <p className="text-slate-500 text-[11px] line-clamp-2 mt-0.5">
                            {r.activityNotes || '-'}
                          </p>
                        </td>

                        {/* Lokasi & Radius */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{r.location.matchedLocationName || 'Titik PKBM'}</span>
                          </div>
                          <div className="text-[10px] mt-0.5">
                            {isWithin ? (
                              <span className="text-emerald-600 font-bold">
                                Radius Valid ({r.location.distanceToCenterMeters || 0}m)
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold">
                                Luar Radius ({r.location.distanceToCenterMeters || 0}m)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* WB Hadir */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-black text-slate-900 text-sm bg-slate-100 px-2.5 py-1 rounded-xl">
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                            <span>{r.studentCount || 0}</span>
                          </span>
                        </td>

                        {/* Foto Kegiatan Thumbnail */}
                        <td className="py-3.5 px-4 text-center">
                          {r.photoUrl ? (
                            <button
                              type="button"
                              onClick={() => setSelectedRecordForModal(r)}
                              className="group relative inline-block rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:ring-2 hover:ring-blue-500 transition"
                              title="Klik untuk melihat foto ber-watermark GPS"
                            >
                              <img
                                src={r.photoUrl}
                                alt="Dokumentasi"
                                className="w-12 h-12 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Tanpa Foto</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${
                            isWithin 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isWithin ? (
                              <>
                                <ShieldCheck className="w-3 h-3" />
                                <span>Hadir Valid</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3" />
                                <span>Luar Radius</span>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (optimized for smartphone screens) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredRecords.map((r) => {
                const isWithin = r.location.isWithinRadius;
                return (
                  <div key={r.id} className="p-4 space-y-3">
                    
                    {/* Top Row: Date, Time & Program */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>{formatWibDateIndo(r.date, 'short')}</span>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {r.program}
                      </span>
                    </div>

                    {/* Subject & Details */}
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">
                        {r.subjectTitle}
                      </h4>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        {r.classGroup} • Jam: {formatTimeWibDisplay(r.timeStart)} - {formatTimeWibDisplay(r.timeEnd)}
                      </p>
                      {r.activityNotes && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl mt-2 border border-slate-100">
                          {r.activityNotes}
                        </p>
                      )}
                    </div>

                    {/* Location & WB & Status Info */}
                    <div className="flex items-center justify-between gap-2 text-xs pt-1 flex-wrap">
                      <div className="flex items-center gap-1 text-slate-600 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[150px]">
                          {r.location.matchedLocationName || 'Titik PKBM'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg text-xs">
                          <Users className="w-3 h-3 text-blue-600" />
                          <span>{r.studentCount || 0} WB</span>
                        </span>

                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isWithin 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isWithin ? 'Valid' : 'Luar Radius'}
                        </span>
                      </div>
                    </div>

                    {/* Photo Button if photoUrl exists */}
                    {r.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setSelectedRecordForModal(r)}
                        className="w-full mt-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-200 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Lihat Bukti Foto Watermark GPS</span>
                      </button>
                    )}

                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>

      {/* Photo Watermark Modal Inspection */}
      <PhotoWatermarkModal
        record={selectedRecordForModal}
        onClose={() => setSelectedRecordForModal(null)}
      />

    </div>
  );
};

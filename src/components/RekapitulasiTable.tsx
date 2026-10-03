import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Trash2, 
  MapPin, 
  Calendar, 
  Users, 
  BookOpen, 
  ShieldCheck, 
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  RefreshCw,
  Info,
  Camera
} from 'lucide-react';
import { AttendanceRecord, FilterState, ProgramType } from '../types';
import { PhotoWatermarkModal } from './PhotoWatermarkModal';
import { getWibToday, getWibPresetRange, formatWibDateIndo, formatTimeWibDisplay } from '../lib/dateUtils';
import { RealtimeSyncStatus } from '../lib/supabase';

interface RekapitulasiTableProps {
  records: AttendanceRecord[];
  onDeleteRecord: (id: string) => void;
  onRefreshOnline?: () => Promise<any> | void;
  isSyncing?: boolean;
  realtimeStatus?: RealtimeSyncStatus;
  lastSyncedAt?: string;
  onForceSyncAttendance?: () => Promise<void> | void;
  newAttendanceAlert?: { record: AttendanceRecord; timestamp: number } | null;
  onDismissAlert?: () => void;
}

export const RekapitulasiTable: React.FC<RekapitulasiTableProps> = ({
  records,
  onDeleteRecord,
  onRefreshOnline,
  isSyncing = false,
  realtimeStatus = 'SUBSCRIBED',
  lastSyncedAt,
  onForceSyncAttendance,
  newAttendanceAlert,
  onDismissAlert
}) => {
  const thisMonthRange = useMemo(() => getWibPresetRange('thisMonth'), []);
  const todayStr = useMemo(() => getWibToday(), []);

  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    tutorId: 'ALL',
    program: 'ALL',
    monthYear: '',
    startDate: thisMonthRange.startDate,
    endDate: thisMonthRange.endDate,
    status: 'ALL'
  });

  const [selectedRecordForModal, setSelectedRecordForModal] = useState<AttendanceRecord | null>(null);

  // Quick Preset Period Handler (Murni Zona Waktu WIB UTC+7)
  const setPresetPeriod = (preset: 'today' | 'thisMonth' | 'last3Months' | 'thisYear' | 'all') => {
    const range = getWibPresetRange(preset);
    setFilters(prev => ({
      ...prev,
      startDate: range.startDate,
      endDate: range.endDate,
      monthYear: ''
    }));
  };

  // Detect active preset for button styling
  const activePreset = useMemo(() => {
    const today = getWibPresetRange('today');
    const thisMonth = getWibPresetRange('thisMonth');
    const last3Months = getWibPresetRange('last3Months');
    const thisYear = getWibPresetRange('thisYear');

    if (!filters.startDate && !filters.endDate && !filters.monthYear) return 'all';
    if (filters.startDate === today.startDate && filters.endDate === today.endDate) return 'today';
    if (filters.startDate === thisMonth.startDate && filters.endDate === thisMonth.endDate) return 'thisMonth';
    if (filters.startDate === last3Months.startDate && filters.endDate === last3Months.endDate) return 'last3Months';
    if (filters.startDate === thisYear.startDate && filters.endDate === thisYear.endDate) return 'thisYear';
    return 'custom';
  }, [filters.startDate, filters.endDate, filters.monthYear]);

  // Count records outside of today within this month
  const otherMonthRecordsCount = useMemo(() => {
    return records.filter(r => r.date !== todayStr && r.date >= thisMonthRange.startDate && r.date <= thisMonthRange.endDate).length;
  }, [records, todayStr, thisMonthRange]);

  // Human-friendly Period Label
  const periodLabel = useMemo(() => {
    if (filters.startDate && filters.endDate) {
      if (filters.startDate === todayStr && filters.endDate === todayStr) {
        return `Hari Ini (${formatWibDateIndo(todayStr, 'short')}) • Reset Otomatis Harian`;
      }
      if (filters.startDate === filters.endDate) {
        return `Tanggal ${formatWibDateIndo(filters.startDate, 'short')}`;
      }
      return `${formatWibDateIndo(filters.startDate, 'short')} s.d. ${formatWibDateIndo(filters.endDate, 'short')}`;
    }
    if (filters.startDate) return `Sejak ${formatWibDateIndo(filters.startDate, 'short')}`;
    if (filters.endDate) return `Sampai ${formatWibDateIndo(filters.endDate, 'short')}`;
    if (filters.monthYear) {
      const [y, m] = filters.monthYear.split('-');
      const safeDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1, 12, 0, 0);
      return safeDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }
    return 'Seluruh Periode Tanggal (Semua Data)';
  }, [filters.startDate, filters.endDate, filters.monthYear, todayStr]);

  // Extract unique tutor list from records for filter dropdown
  const uniqueTutors = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach(r => map.set(r.tutorId, r.tutorName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [records]);

  // Filter & Search Logic
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Search Term
      if (filters.searchTerm.trim()) {
        const term = filters.searchTerm.toLowerCase();
        const matchTutor = r.tutorName.toLowerCase().includes(term);
        const matchSubject = r.subjectTitle.toLowerCase().includes(term);
        const matchClass = r.classGroup.toLowerCase().includes(term);
        if (!matchTutor && !matchSubject && !matchClass) return false;
      }

      // Tutor Filter
      if (filters.tutorId !== 'ALL' && r.tutorId !== filters.tutorId) {
        return false;
      }

      // Program Filter
      if (filters.program !== 'ALL' && r.program !== filters.program) {
        return false;
      }

      // Date Range Filter (startDate & endDate)
      if (filters.startDate && r.date < filters.startDate) {
        return false;
      }
      if (filters.endDate && r.date > filters.endDate) {
        return false;
      }

      // Fallback Month/Year Filter (YYYY-MM) if startDate & endDate are empty
      if (!filters.startDate && !filters.endDate && filters.monthYear && !r.date.startsWith(filters.monthYear)) {
        return false;
      }

      // Status Filter
      if (filters.status !== 'ALL' && r.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [records, filters]);

  // KPI Statistics
  const totalPresensi = filteredRecords.length;
  const totalWB = filteredRecords.reduce((acc, curr) => acc + (curr.studentCount || 0), 0);
  const totalGPSValid = filteredRecords.filter(r => r.location.isWithinRadius).length;

  // Export to CSV Function
  const exportToCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = [
      "ID Presensi",
      "Tanggal",
      "Jam Mulai",
      "Jam Selesai",
      "Nama Tutor",
      "Program PKBM",
      "Mata Pelajaran",
      "Ruang/Pos Belajar",
      "Jumlah WB",
      "Latitude",
      "Longitude",
      "Jarak Ke PKBM (m)",
      "Status Geofence",
      "Catatan Kegiatan"
    ];

    const rows = filteredRecords.map(r => [
      r.id,
      r.date,
      r.timeStart,
      r.timeEnd,
      `"${r.tutorName}"`,
      `"${r.program}"`,
      `"${r.subjectTitle}"`,
      `"${r.classGroup}"`,
      r.studentCount,
      r.location.latitude,
      r.location.longitude,
      r.location.distanceToCenterMeters || 0,
      `"${r.status}"`,
      `"${r.activityNotes.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + 
      [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Presensi_Tutor_PKBM_Bina_Insani_${getWibToday()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Play subtle chime when a new attendance record arrives
  React.useEffect(() => {
    if (newAttendanceAlert) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(659.25, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }
      } catch (e) {
        // Audio error or autoplay policy
      }
    }
  }, [newAttendanceAlert?.timestamp]);

  return (
    <div className="space-y-5">
      
      {/* Realtime Live Sync Bar (Anti-Selisih Kehadiran) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3.5 w-3.5 shrink-0">
            {realtimeStatus === 'SUBSCRIBED' ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-sm shadow-emerald-400"></span>
              </>
            ) : realtimeStatus === 'CONNECTING' ? (
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400 animate-pulse"></span>
            ) : (
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                {realtimeStatus === 'SUBSCRIBED' ? 'Sinkronisasi Realtime Aktif' : 'Menyambung Saluran Realtime...'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-900/80 text-emerald-300 border border-emerald-700/60">
                Anti-Selisih Kehadiran
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Presensi tutor langsung masuk seketika via WebSocket &amp; otomatis dicek berkala setiap 15 detik.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 block font-mono">Pemeriksaan Terakhir:</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">{lastSyncedAt || 'Barusan'} WIB</span>
          </div>

          <button
            type="button"
            disabled={isSyncing}
            onClick={() => {
              if (onForceSyncAttendance) {
                onForceSyncAttendance();
              } else if (onRefreshOnline) {
                onRefreshOnline();
              }
            }}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Periksa data presensi terbaru dari server sekarang"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyelaraskan...' : 'Periksa Sekarang'}</span>
          </button>
        </div>
      </div>

      {/* Realtime Alert Banner When New Record Arrives */}
      {newAttendanceAlert && (
        <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg border border-emerald-400 flex items-center justify-between gap-3 animate-in slide-in-from-top-3 fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-lg shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="text-xs leading-tight">
              <div className="flex items-center gap-2">
                <span className="font-black text-xs sm:text-sm uppercase tracking-wide">⚡ Presensi Baru Diterima Real-Time!</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono font-bold">{newAttendanceAlert.record.timeStart}</span>
              </div>
              <p className="mt-1 font-medium text-white/95 text-xs">
                <strong>{newAttendanceAlert.record.tutorName}</strong> baru saja mengirim presensi <strong>{newAttendanceAlert.record.subjectTitle}</strong> ({newAttendanceAlert.record.classGroup || newAttendanceAlert.record.program}).
              </p>
            </div>
          </div>
          {onDismissAlert && (
            <button
              type="button"
              onClick={onDismissAlert}
              className="text-white/80 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-bold transition shrink-0"
            >
              Tutup
            </button>
          )}
        </div>
      )}
      
      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Presensi</p>
            <p className="text-2xl font-black text-slate-900">{totalPresensi} <span className="text-xs font-normal text-slate-500">Kegiatan</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Warga Belajar Hadir</p>
            <p className="text-2xl font-black text-slate-900">{totalWB} <span className="text-xs font-normal text-slate-500">Orang WB</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Presensi GPS Valid</p>
            <p className="text-2xl font-black text-slate-900">{totalGPSValid} <span className="text-xs font-normal text-slate-500">Sesuai Radius</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kunjungan Lapangan</p>
            <p className="text-2xl font-black text-slate-900">{totalPresensi - totalGPSValid} <span className="text-xs font-normal text-slate-500">Pos Belajar</span></p>
          </div>
        </div>

      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              placeholder="Cari nama tutor, mata pelajaran, atau pos belajar..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
            />
          </div>

          {/* Action Buttons: Sync Supabase & Export CSV */}
          <div className="flex items-center gap-2">
            {onRefreshOnline && (
              <button
                type="button"
                onClick={onRefreshOnline}
                disabled={isSyncing}
                className="bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 disabled:opacity-50 text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
                title="Muat ulang dan sinkronkan data presensi terbaru langsung dari database Supabase"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-600' : 'text-emerald-700'}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkron Supabase'}</span>
              </button>
            )}

            <button
              onClick={exportToCSV}
              disabled={filteredRecords.length === 0}
              className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Ekspor CSV Excel
            </button>
          </div>

        </div>

        {/* Filter Selectors Bar */}
        <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
          
          {/* Top Row Filters: Program, Tutor, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter Program PKBM</label>
              <select
                value={filters.program}
                onChange={(e) => setFilters(prev => ({ ...prev, program: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Program Layanan</option>
                <option value="Paket A (Setara SD)">Paket A (Setara SD)</option>
                <option value="Paket B (Setara SMP)">Paket B (Setara SMP)</option>
                <option value="Paket C (Setara SMA)">Paket C (Setara SMA)</option>
                <option value="Keaksaraan Fungsional (KF)">Keaksaraan Fungsional (KF)</option>
                <option value="PAUD Bina Insani">PAUD Bina Insani</option>
                <option value="Kursus & Keterampilan / Vokasi">Kursus & Keterampilan / Vokasi</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter Tutor</label>
              <select
                value={filters.tutorId}
                onChange={(e) => setFilters(prev => ({ ...prev, tutorId: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Tutor ({uniqueTutors.length})</option>
                {uniqueTutors.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter Status GPS</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Status Area</option>
                <option value="Hadir Valid">Hadir Valid (Radius PKBM)</option>
                <option value="Hadir Lapangan">Hadir Lapangan / Pos Belajar</option>
                <option value="Dinas Luar">Dinas Luar / Penugasan</option>
              </select>
            </div>
          </div>

          {/* Date Range Section: Dari Tanggal s/d Sampai Tanggal */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-2.5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold text-xs">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Atur Periode Rekapitulasi (Dari Tanggal ke Tanggal)</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300/60">
                {periodLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 items-end">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, monthYear: '' }))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, monthYear: '' }))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="col-span-1 sm:col-span-2 flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-500">Pilihan Cepat:</span>
                <button
                  type="button"
                  onClick={() => setPresetPeriod('today')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border shadow-sm transition-all ${
                    activePreset === 'today'
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
                  }`}
                >
                  ⚡ Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => setPresetPeriod('thisMonth')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border shadow-sm transition-all ${
                    activePreset === 'thisMonth'
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => setPresetPeriod('last3Months')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border shadow-sm transition-all ${
                    activePreset === 'last3Months'
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
                  }`}
                >
                  3 Bulan
                </button>
                <button
                  type="button"
                  onClick={() => setPresetPeriod('thisYear')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border shadow-sm transition-all ${
                    activePreset === 'thisYear'
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Tahun Ini
                </button>
                <button
                  type="button"
                  onClick={() => setPresetPeriod('all')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border shadow-sm transition-all ${
                    activePreset === 'all'
                      ? 'bg-rose-700 text-white border-rose-800'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                  }`}
                >
                  Semua Tanggal
                </button>
              </div>
            </div>

            {/* Smart Notice if filtered to Today but there are other presensi records this month */}
            {activePreset === 'today' && otherMonthRecordsCount > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 mt-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Menampilkan <strong>{filteredRecords.length} presensi hari ini</strong>. Terdapat <strong>{otherMonthRecordsCount} presensi di tanggal lain</strong> pada bulan ini.
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setPresetPeriod('thisMonth')}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shrink-0 transition-colors shadow-sm"
                >
                  Tampilkan Semua Bulan Ini ({records.length} Data)
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        <div className="p-4 px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">
            Tabel Rekapitulasi Presensi Kegiatan ({filteredRecords.length} Data)
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            PKBM BINA INSANI SUMOWONO
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Waktu & Foto</th>
                <th className="py-3 px-4">Nama Tutor</th>
                <th className="py-3 px-4">Program & Matpel</th>
                <th className="py-3 px-4">Pos Belajar / WB</th>
                <th className="py-3 px-4">Verifikasi GPS</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    <p className="mb-2">Belum ada data presensi yang sesuai dengan kriteria filter ({periodLabel}).</p>
                    {records.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setPresetPeriod('thisMonth')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        Tampilkan Seluruh Presensi Bulan Ini ({records.length} Data)
                      </button>
                    ) : onRefreshOnline ? (
                      <button
                        type="button"
                        onClick={onRefreshOnline}
                        disabled={isSyncing}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        Sinkronkan Presensi dari Supabase
                      </button>
                    ) : null}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isNewlyArrived = r.id === newAttendanceAlert?.record.id;
                  return (
                    <tr 
                      key={r.id} 
                      className={`transition-colors duration-500 ${
                        isNewlyArrived 
                          ? 'bg-emerald-100/90 ring-2 ring-emerald-400 font-medium' 
                          : 'hover:bg-emerald-50/40'
                      }`}
                    >
                      
                      {/* Waktu & Foto Thumbnail */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {r.photoUrl ? (
                            <img
                              src={r.photoUrl}
                              alt={r.subjectTitle}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-300 shadow-sm shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedRecordForModal(r)}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedRecordForModal(r)}
                              className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-emerald-50 border border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 shrink-0 transition-colors"
                              title="Buka Foto / Dokumentasi"
                            >
                              <Camera className="w-5 h-5" />
                            </button>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{formatWibDateIndo(r.date, 'short')}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-emerald-600" />
                              {formatTimeWibDisplay(r.timeStart)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Nama Tutor */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{r.tutorName}</span>
                          {isNewlyArrived && (
                            <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-black rounded-md uppercase tracking-wider animate-bounce shadow-xs">
                              BARU
                            </span>
                          )}
                        </div>
                      </td>

                    {/* Program & Matpel */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded text-[10px] font-bold mb-1">
                        {r.program}
                      </span>
                      <p className="font-semibold text-slate-800 leading-tight">{r.subjectTitle}</p>
                    </td>

                    {/* Pos Belajar & WB */}
                    <td className="py-3.5 px-4">
                      <p className="text-slate-800 font-medium">{r.classGroup}</p>
                      <span className="text-[11px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mt-1 inline-block">
                        👥 {r.studentCount} Warga Belajar
                      </span>
                    </td>

                    {/* Verifikasi GPS */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        r.status === 'Dinas Luar'
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : r.location.isWithinRadius
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        <MapPin className="w-3 h-3" />
                        {r.status === 'Dinas Luar' 
                          ? '💼 Dinas Luar' 
                          : r.location.isWithinRadius 
                            ? 'Di Area PKBM' 
                            : 'Kunjungan Pos'} ({r.location.distanceToCenterMeters || 0}m)
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Lat: {r.location.latitude.toFixed(4)}, Lng: {r.location.longitude.toFixed(4)}
                      </p>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedRecordForModal(r)}
                          title="Lihat Detail Foto & Watermark GPS"
                          className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg font-bold transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Hapus data presensi kegiatan "${r.subjectTitle}"?`)) {
                              onDeleteRecord(r.id);
                            }
                          }}
                          title="Hapus Presensi"
                          className="p-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg font-bold transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Photo & Watermark Detail Modal */}
      <PhotoWatermarkModal
        record={selectedRecordForModal}
        onClose={() => setSelectedRecordForModal(null)}
      />

    </div>
  );
};

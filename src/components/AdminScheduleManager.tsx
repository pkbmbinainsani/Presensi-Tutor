import React, { useState, useRef } from 'react';
import { 
  CalendarDays, 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  RefreshCw, 
  Search, 
  Filter, 
  Clock, 
  MapPin, 
  User, 
  X, 
  Check, 
  Sparkles, 
  BookOpen,
  Calendar,
  Cloud,
  Database,
  AlertCircle
} from 'lucide-react';
import { ScheduleItem, DayOfWeek, ProgramType, Tutor, PKBMInfo } from '../types';
import { 
  parseScheduleCsv, 
  generateScheduleTemplateCsv, 
  exportSchedulesToCsv, 
  VALID_DAYS, 
  ParseScheduleResult 
} from '../lib/csvScheduleParser';
import { 
  saveSchedules, 
  addScheduleItem, 
  updateScheduleItem, 
  deleteScheduleItem, 
  clearAllSchedules, 
  generateSampleSemesterSchedules 
} from '../lib/storage';
import { saveAllSchedulesOnline } from '../lib/supabase';
import { getWibToday, getDayNameFromDateStr } from '../lib/dateUtils';

interface AdminScheduleManagerProps {
  schedules: ScheduleItem[];
  tutors: Tutor[];
  pkbmInfo: PKBMInfo;
  onSchedulesUpdated: (updated: ScheduleItem[]) => void;
}

const PROGRAM_OPTIONS: ProgramType[] = [
  'Paket C (Setara SMA)',
  'Paket B (Setara SMP)',
  'Paket A (Setara SD)',
  'PAUD Bina Insani',
  'Keaksaraan Fungsional (KF)',
  'Kursus & Keterampilan / Vokasi'
];

export const AdminScheduleManager: React.FC<AdminScheduleManagerProps> = ({
  schedules,
  tutors,
  pkbmInfo,
  onSchedulesUpdated
}) => {
  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('all');
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>('all');

  // Confirmation Modals (Replacing window.confirm for iframe sandbox safety)
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<{
    id: string;
    title: string;
    date?: string;
    time?: string;
    day?: string;
  } | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState<boolean>(false);

  const [isConfirmClearAllOpen, setIsConfirmClearAllOpen] = useState<boolean>(false);
  const [isClearingAll, setIsClearingAll] = useState<boolean>(false);

  const [isConfirmSampleOpen, setIsConfirmSampleOpen] = useState<boolean>(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // CSV Upload State
  const [isUploadingCsv, setIsUploadingCsv] = useState<boolean>(false);
  const [parsedCsvResult, setParsedCsvResult] = useState<ParseScheduleResult | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadMode, setUploadMode] = useState<'replace' | 'append'>('replace');
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Add / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [formDate, setFormDate] = useState<string>(getWibToday());
  const [formDay, setFormDay] = useState<DayOfWeek>(getDayNameFromDateStr(getWibToday()));
  const [formTimeStart, setFormTimeStart] = useState<string>('08:00');
  const [formTimeEnd, setFormTimeEnd] = useState<string>('09:30');
  const [formProgram, setFormProgram] = useState<ProgramType>('Paket C (Setara SMA)');
  const [formSubject, setFormSubject] = useState<string>('');
  const [formClass, setFormClass] = useState<string>('Kelas 10');
  const [formTutorName, setFormTutorName] = useState<string>('');
  const [formRoom, setFormRoom] = useState<string>('Gedung Utama PKBM');
  const [formSemester, setFormSemester] = useState<string>('Semester Ganjil 2026/2027');
  const [formNotes, setFormNotes] = useState<string>('');

  // Handle CSV File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadFeedback(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const result = parseScheduleCsv(text, tutors);
        setParsedCsvResult(result);
        setIsUploadingCsv(true);
      } catch (err: any) {
        setUploadFeedback({
          type: 'error',
          message: `Gagal membaca file CSV: ${err?.message || 'Format tidak valid'}`
        });
      }
    };
    reader.onerror = () => {
      setUploadFeedback({
        type: 'error',
        message: 'Gagal membaca isi file dari perangkat Anda.'
      });
    };
    reader.readAsText(file);
    // Reset file input so user can re-select same file if needed
    e.target.value = '';
  };

  // Terapkan hasil upload CSV
  const handleApplyUploadedCsv = () => {
    if (!parsedCsvResult || parsedCsvResult.items.length === 0) {
      setUploadFeedback({
        type: 'error',
        message: 'Tidak ada baris jadwal yang valid untuk diterapkan.'
      });
      return;
    }

    let updatedList: ScheduleItem[];
    if (uploadMode === 'replace') {
      updatedList = parsedCsvResult.items;
    } else {
      updatedList = [...schedules, ...parsedCsvResult.items];
    }

    saveSchedules(updatedList);
    onSchedulesUpdated(updatedList);
    setParsedCsvResult(null);
    setIsUploadingCsv(false);
    setUploadFeedback({
      type: 'success',
      message: `Berhasil mengimpor ${parsedCsvResult.items.length} jadwal semester baru!`
    });

    setTimeout(() => {
      setUploadFeedback(null);
    }, 5000);
  };

  // Unduh Template CSV
  const handleDownloadTemplate = () => {
    const csvContent = generateScheduleTemplateCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `template_jadwal_semester_pkbm_bina_insani.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Ekspor Jadwal Saat Ini ke CSV
  const handleExportCurrentToCsv = () => {
    const csvContent = exportSchedulesToCsv(schedules);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `jadwal_semester_pkbm_bina_insani_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Muat Contoh Jadwal Resmi 1 Semester
  const handleLoadSampleSemester = () => {
    if (schedules.length > 0) {
      setIsConfirmSampleOpen(true);
    } else {
      executeLoadSampleSemester();
    }
  };

  const executeLoadSampleSemester = () => {
    const sample = generateSampleSemesterSchedules();
    saveSchedules(sample);
    onSchedulesUpdated(sample);
    setIsConfirmSampleOpen(false);
    setUploadFeedback({
      type: 'success',
      message: `Berhasil memuat ${sample.length} jadwal 1 semester lengkap untuk PKBM Bina Insani dan menyimpannya ke Supabase!`
    });
    setTimeout(() => setUploadFeedback(null), 4000);
  };

  // Sinkronkan Jadwal Saat Ini ke Supabase Online
  const handleSyncSchedulesToSupabase = async () => {
    setIsSyncingSupabase(true);
    try {
      const ok = await saveAllSchedulesOnline(schedules, true);
      if (ok) {
        setUploadFeedback({
          type: 'success',
          message: `Sukses! Seluruh ${schedules.length} jadwal semester berhasil disimpan dan disinkronkan ke database Supabase.`
        });
      } else {
        setUploadFeedback({
          type: 'error',
          message: 'Tabel Supabase belum dibuat atau koneksi dialihkan aman ke penyimpanan lokal.'
        });
      }
    } catch (e: any) {
      setUploadFeedback({
        type: 'error',
        message: `Gagal sinkronisasi Supabase: ${e?.message || 'Terjadi kesalahan'}`
      });
    } finally {
      setIsSyncingSupabase(false);
      setTimeout(() => setUploadFeedback(null), 4000);
    }
  };

  // Buka Modal Tambah Manual
  const handleOpenAddModal = () => {
    const today = getWibToday();
    setEditingItem(null);
    setFormDate(today);
    setFormDay(getDayNameFromDateStr(today));
    setFormTimeStart('08:00');
    setFormTimeEnd('09:30');
    setFormProgram('Paket C (Setara SMA)');
    setFormSubject('');
    setFormClass('Kelas 10');
    setFormTutorName(tutors.length > 0 ? tutors[0].name : 'Tutor PKBM Bina Insani');
    setFormRoom('Gedung Utama PKBM');
    setFormSemester('Semester Ganjil 2026/2027');
    setFormNotes('');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Buka Modal Edit Manual
  const handleOpenEditModal = (item: ScheduleItem) => {
    const itemDate = item.date || getWibToday();
    setEditingItem(item);
    setFormDate(itemDate);
    setFormDay(item.dayOfWeek || getDayNameFromDateStr(itemDate));
    setFormTimeStart(item.timeStart);
    setFormTimeEnd(item.timeEnd);
    setFormProgram((item.program as ProgramType) || 'Paket C (Setara SMA)');
    setFormSubject(item.subjectTitle);
    setFormClass(item.classGroup);
    setFormTutorName(item.tutorName);
    setFormRoom(item.room || 'Gedung Utama PKBM');
    setFormSemester(item.semester || 'Semester Ganjil 2026/2027');
    setFormNotes(item.notes || '');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Simpan Form Modal
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim()) {
      setFormError('Mata pelajaran atau nama kegiatan wajib diisi!');
      return;
    }
    setFormError(null);

    const matchedTutor = tutors.find(t => t.name === formTutorName);
    const calculatedDay = getDayNameFromDateStr(formDate) || formDay;

    if (editingItem) {
      const updated: ScheduleItem = {
        ...editingItem,
        date: formDate,
        dayOfWeek: calculatedDay,
        timeStart: formTimeStart,
        timeEnd: formTimeEnd,
        program: formProgram,
        subjectTitle: formSubject.trim(),
        classGroup: formClass.trim(),
        tutorId: matchedTutor?.id,
        tutorName: formTutorName,
        room: formRoom.trim(),
        semester: formSemester.trim(),
        notes: formNotes.trim() || undefined
      };
      updateScheduleItem(updated);
      const newList = schedules.map(s => s.id === updated.id ? updated : s);
      onSchedulesUpdated(newList);
      setUploadFeedback({
        type: 'success',
        message: `Jadwal "${updated.subjectTitle}" berhasil diperbarui!`
      });
      setTimeout(() => setUploadFeedback(null), 3000);
    } else {
      const newItem = addScheduleItem({
        date: formDate,
        dayOfWeek: calculatedDay,
        timeStart: formTimeStart,
        timeEnd: formTimeEnd,
        program: formProgram,
        subjectTitle: formSubject.trim(),
        classGroup: formClass.trim(),
        tutorId: matchedTutor?.id,
        tutorName: formTutorName,
        room: formRoom.trim(),
        semester: formSemester.trim(),
        notes: formNotes.trim() || undefined
      });
      onSchedulesUpdated([newItem, ...schedules]);
      setUploadFeedback({
        type: 'success',
        message: `Jadwal "${newItem.subjectTitle}" berhasil ditambahkan!`
      });
      setTimeout(() => setUploadFeedback(null), 3000);
    }

    setIsFormModalOpen(false);
  };

  // Hapus Item via In-App Modal
  const handleDeleteItem = (id: string, title: string, date?: string, time?: string, day?: string) => {
    setConfirmDeleteItem({
      id,
      title,
      date,
      time,
      day
    });
  };

  const executeDeleteItem = async () => {
    if (!confirmDeleteItem) return;
    setIsDeletingItem(true);
    try {
      const targetId = confirmDeleteItem.id;
      const targetTitle = confirmDeleteItem.title;
      deleteScheduleItem(targetId);
      const updated = schedules.filter(s => s.id !== targetId);
      onSchedulesUpdated(updated);
      setConfirmDeleteItem(null);
      setUploadFeedback({
        type: 'success',
        message: `Jadwal "${targetTitle}" berhasil dihapus dari sistem dan database.`
      });
      setTimeout(() => setUploadFeedback(null), 3500);
    } catch (err: any) {
      setUploadFeedback({
        type: 'error',
        message: `Gagal menghapus jadwal: ${err?.message || 'Terjadi gangguan'}`
      });
    } finally {
      setIsDeletingItem(false);
    }
  };

  // Hapus Semua via In-App Modal
  const handleClearAll = () => {
    setIsConfirmClearAllOpen(true);
  };

  const executeClearAll = async () => {
    setIsClearingAll(true);
    try {
      const totalCount = schedules.length;
      clearAllSchedules();
      onSchedulesUpdated([]);
      setIsConfirmClearAllOpen(false);
      setUploadFeedback({
        type: 'success',
        message: `Seluruh (${totalCount}) jadwal semester berhasil dihapus dan dikosongkan.`
      });
      setTimeout(() => setUploadFeedback(null), 4000);
    } catch (err: any) {
      setUploadFeedback({
        type: 'error',
        message: `Gagal mengosongkan jadwal: ${err?.message || 'Terjadi gangguan'}`
      });
    } finally {
      setIsClearingAll(false);
    }
  };

  // Ambil daftar semester unik dari jadwal
  const uniqueSemesters = Array.from(new Set(schedules.map(s => s.semester || 'Semester Ganjil 2026/2027')));

  // Filter Jadwal
  const filteredSchedules = schedules.filter(sch => {
    if (selectedDateFilter && (sch.date || '') !== selectedDateFilter) return false;
    if (selectedDayFilter !== 'all' && sch.dayOfWeek !== selectedDayFilter) return false;
    if (selectedProgramFilter !== 'all' && sch.program !== selectedProgramFilter) return false;
    if (selectedSemesterFilter !== 'all' && (sch.semester || 'Semester Ganjil 2026/2027') !== selectedSemesterFilter) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchSubject = sch.subjectTitle.toLowerCase().includes(q);
      const matchClass = sch.classGroup.toLowerCase().includes(q);
      const matchTutor = sch.tutorName.toLowerCase().includes(q);
      const matchRoom = (sch.room || '').toLowerCase().includes(q);
      const matchDate = (sch.date || '').toLowerCase().includes(q);
      if (!matchSubject && !matchClass && !matchTutor && !matchRoom && !matchDate) return false;
    }

    return true;
  }).sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return a.timeStart.localeCompare(b.timeStart);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,text/csv"
        className="hidden"
      />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-700/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-xs font-bold">
              <CalendarDays className="w-3.5 h-3.5 text-amber-300" />
              <span>Manajemen Jadwal Semester Berbasis Tanggal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Pengelolaan Jadwal KBM Semester</span>
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100 max-w-2xl leading-relaxed">
              Unggah file CSV jadwal 1 semester atau kelola sesi tatap muka berdasarkan tanggal pelaksanaan. Jadwal ini akan otomatis tampil di tab <strong>Jadwal Hari Ini</strong> tutor.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black rounded-2xl text-xs sm:text-sm flex items-center gap-2 shadow-lg transition"
            >
              <Upload className="w-4 h-4" />
              <span>Upload CSV 1 Semester</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center gap-2 shadow-lg transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Manual</span>
            </button>
          </div>
        </div>

        {/* Quick Helper Tools & Stats */}
        <div className="mt-6 pt-5 border-t border-indigo-800/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap text-indigo-200">
            <button
              onClick={handleDownloadTemplate}
              className="hover:text-white flex items-center gap-1.5 underline decoration-indigo-400 font-semibold"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>Unduh Template CSV (Dengan Tanggal)</span>
            </button>
            <span>•</span>
            <button
              onClick={handleExportCurrentToCsv}
              disabled={schedules.length === 0}
              className="hover:text-white flex items-center gap-1.5 underline decoration-indigo-400 font-semibold disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Jadwal Aktif ke CSV</span>
            </button>
            <span>•</span>
            <button
              onClick={handleLoadSampleSemester}
              className="hover:text-amber-300 flex items-center gap-1.5 underline decoration-amber-400 font-semibold text-amber-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Muat Contoh Jadwal 1 Semester</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-indigo-100 font-bold flex-wrap">
            <span>Total: <strong className="text-amber-300 text-sm font-black">{schedules.length}</strong> Sesi Terjadwal</span>
            <button
              onClick={handleSyncSchedulesToSupabase}
              disabled={isSyncingSupabase}
              className="px-3 py-1 bg-indigo-700/80 hover:bg-indigo-600 text-white border border-indigo-500/50 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
              title="Sinkronkan jadwal sekarang ke database Supabase"
            >
              <Database className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
              <span>{isSyncingSupabase ? 'Menyimpan...' : 'Sinkronkan Supabase'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alert Feedback if any */}
      {uploadFeedback && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border animate-in fade-in ${
          uploadFeedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
            : 'bg-rose-50 text-rose-900 border-rose-300'
        }`}>
          {uploadFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-bold">{uploadFeedback.message}</span>
        </div>
      )}

      {/* CSV Preview Modal / Box when user just uploaded CSV */}
      {isUploadingCsv && parsedCsvResult && (
        <div className="bg-white rounded-3xl p-6 border-2 border-indigo-500 shadow-2xl space-y-5 animate-in slide-in-from-top-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-900 rounded-full text-xs font-black">
                <FileText className="w-3.5 h-3.5 text-indigo-700" />
                <span>Pratinjau File CSV: {uploadedFileName}</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Verifikasi Data Jadwal Semester Sebelum Diterapkan
              </h3>
              <p className="text-xs text-slate-600">
                Terdeteksi <strong className="text-indigo-700">{parsedCsvResult.validRows}</strong> baris jadwal valid dari total {parsedCsvResult.totalRows} baris di file CSV. Kolom <strong>Tanggal</strong> otomatis dipetakan.
              </p>
            </div>

            <button
              onClick={() => {
                setIsUploadingCsv(false);
                setParsedCsvResult(null);
              }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Warnings or Errors if any */}
          {parsedCsvResult.errors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1">
              <p className="font-extrabold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Perhatian ({parsedCsvResult.errors.length} baris dilewati):</span>
              </p>
              <ul className="list-disc pl-5 space-y-0.5 max-h-24 overflow-y-auto">
                {parsedCsvResult.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Upload Mode Choice (Replace vs Append) */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold text-indigo-950">Metode Penggantian Jadwal:</p>
              <p className="text-[11px] text-indigo-700">Pilih apakah data baru menimpa jadwal lama atau ditambahkan.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUploadMode('replace')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  uploadMode === 'replace'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-white text-indigo-900 border border-indigo-200'
                }`}
              >
                Gantikan Semua Jadwal Saat Ini
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('append')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  uploadMode === 'append'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-white text-indigo-900 border border-indigo-200'
                }`}
              >
                Tambahkan ke Jadwal yang Ada
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-extrabold sticky top-0">
                <tr>
                  <th className="p-2.5">Tanggal</th>
                  <th className="p-2.5">Hari</th>
                  <th className="p-2.5">Waktu</th>
                  <th className="p-2.5">Program</th>
                  <th className="p-2.5">Kelas</th>
                  <th className="p-2.5">Mata Pelajaran</th>
                  <th className="p-2.5">Tutor</th>
                  <th className="p-2.5">Ruang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {parsedCsvResult.items.slice(0, 15).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono font-bold text-slate-900">{item.date}</td>
                    <td className="p-2.5 font-bold text-indigo-900">{item.dayOfWeek}</td>
                    <td className="p-2.5 font-mono">{item.timeStart} - {item.timeEnd}</td>
                    <td className="p-2.5 font-semibold text-slate-600">{item.program}</td>
                    <td className="p-2.5">{item.classGroup}</td>
                    <td className="p-2.5 font-bold">{item.subjectTitle}</td>
                    <td className="p-2.5">{item.tutorName}</td>
                    <td className="p-2.5 text-slate-500">{item.room || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedCsvResult.items.length > 15 && (
            <p className="text-[11px] text-slate-500 italic text-center">
              Menampilkan 15 dari {parsedCsvResult.items.length} baris jadwal.
            </p>
          )}

          {/* Confirm & Cancel Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setIsUploadingCsv(false);
                setParsedCsvResult(null);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
            >
              Batal
            </button>
            <button
              onClick={handleApplyUploadedCsv}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-300" />
              <span>Terapkan {parsedCsvResult.items.length} Jadwal Sekarang</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari tanggal, mata pelajaran, kelas, tutor, atau ruang..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Dropdowns & Date Filter */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
              title="Filter Tanggal Tertentu"
            />
            {selectedDateFilter && (
              <button
                onClick={() => setSelectedDateFilter('')}
                className="text-slate-400 hover:text-slate-600 text-xs p-0.5"
                title="Hapus Filter Tanggal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Hari Filter */}
          <select
            value={selectedDayFilter}
            onChange={(e) => setSelectedDayFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">Semua Hari</option>
            {VALID_DAYS.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>

          {/* Program Filter */}
          <select
            value={selectedProgramFilter}
            onChange={(e) => setSelectedProgramFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">Semua Program</option>
            {PROGRAM_OPTIONS.map(prog => (
              <option key={prog} value={prog}>{prog}</option>
            ))}
          </select>

          {/* Reset Filters */}
          {(searchTerm || selectedDateFilter || selectedDayFilter !== 'all' || selectedProgramFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDateFilter('');
                setSelectedDayFilter('all');
                setSelectedProgramFilter('all');
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold"
            >
              Reset Filter
            </button>
          )}

          {schedules.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Schedule Table */}
      {filteredSchedules.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-300 space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto text-indigo-500">
            <CalendarDays className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">
              Belum Ada Data Jadwal yang Sesuai
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Silakan unggah jadwal semester lewat file CSV, klik "Muat Contoh Jadwal", atau tambahkan jadwal baru secara manual.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow"
            >
              <Upload className="w-4 h-4 text-amber-300" />
              <span>Upload CSV Jadwal</span>
            </button>
            <button
              onClick={handleLoadSampleSemester}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black shadow"
            >
              Muat Contoh Jadwal 1 Semester
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Tanggal &amp; Hari</th>
                  <th className="py-3.5 px-4">Waktu</th>
                  <th className="py-3.5 px-4">Program &amp; Kelas</th>
                  <th className="py-3.5 px-4">Mata Pelajaran</th>
                  <th className="py-3.5 px-4">Tutor Pengampu</th>
                  <th className="py-3.5 px-4">Ruang / Lokasi</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchedules.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    
                    {/* Tanggal & Hari */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="font-mono font-black text-slate-900 text-xs">
                          {item.date || '-'}
                        </div>
                        <span className="inline-block font-black text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200">
                          {item.dayOfWeek}
                        </span>
                      </div>
                    </td>

                    {/* Waktu */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-700 font-mono font-bold text-xs">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>{item.timeStart} - {item.timeEnd}</span>
                      </div>
                    </td>

                    {/* Program & Kelas */}
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-900">{item.program}</p>
                        <p className="text-[11px] text-blue-700 font-semibold">{item.classGroup}</p>
                      </div>
                    </td>

                    {/* Mata Pelajaran */}
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-black text-slate-900 text-xs sm:text-sm">{item.subjectTitle}</p>
                        {item.notes && (
                          <p className="text-[11px] text-slate-400 italic line-clamp-1">{item.notes}</p>
                        )}
                      </div>
                    </td>

                    {/* Tutor */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                          {item.tutorName.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-800">{item.tutorName}</span>
                      </div>
                    </td>

                    {/* Ruang */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{item.room || 'Gedung Utama PKBM'}</span>
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit Jadwal"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.subjectTitle, item.date, `${item.timeStart} - ${item.timeEnd}`, item.dayOfWeek)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus Jadwal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Add / Edit Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-600" />
                <span>{editingItem ? 'Edit Jadwal KBM' : 'Tambah Jadwal Semester Baru'}</span>
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-800 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              
              {/* Tanggal & Hari */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal Pelaksanaan KBM <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setFormDate(newDate);
                      if (newDate) {
                        setFormDay(getDayNameFromDateStr(newDate));
                      }
                    }}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hari (Otomatis)</label>
                  <div className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl font-black text-indigo-900 flex items-center justify-between">
                    <span>{formDay}</span>
                    <span className="text-[10px] text-indigo-600 font-semibold bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                      Sesuai Tanggal
                    </span>
                  </div>
                </div>
              </div>

              {/* Waktu Mulai & Selesai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={formTimeStart}
                    onChange={(e) => setFormTimeStart(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={formTimeEnd}
                    onChange={(e) => setFormTimeEnd(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Program & Kelas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Program</label>
                  <select
                    value={formProgram}
                    onChange={(e) => setFormProgram(e.target.value as ProgramType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
                  >
                    {PROGRAM_OPTIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kelas / Rombel</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kelas 10, Pos Belajar"
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Mata Pelajaran */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran / Kegiatan</label>
                <input
                  type="text"
                  placeholder="Contoh: Bahasa Indonesia, Matematika, Pelatihan Komputer"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>

              {/* Tutor Pengampu */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tutor Pengampu</label>
                {tutors.length > 0 ? (
                  <select
                    value={formTutorName}
                    onChange={(e) => setFormTutorName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                  >
                    {tutors.map(t => (
                      <option key={t.id} value={t.name}>{t.name} ({t.specialization || 'Tutor'})</option>
                    ))}
                    <option value="Tutor PKBM Bina Insani">Tutor PKBM Bina Insani (Umum)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Nama Tutor Pengampu"
                    value={formTutorName}
                    onChange={(e) => setFormTutorName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                  />
                )}
              </div>

              {/* Ruang & Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ruang / Tempat Belajar</label>
                  <input
                    type="text"
                    placeholder="Gedung Utama PKBM / Lab"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Semester</label>
                  <input
                    type="text"
                    placeholder="Semester Ganjil 2026/2027"
                    value={formSemester}
                    onChange={(e) => setFormSemester(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan / Topik Silabus (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan materi atau petunjuk belajar..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  <span>{editingItem ? 'Simpan Perubahan' : 'Tambahkan Jadwal'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus 1 Jadwal */}
      {confirmDeleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                Hapus Jadwal KBM?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Anda akan menghapus jadwal mata pelajaran berikut dari sistem dan database Supabase:
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1 my-2">
                <p className="font-black text-slate-900 text-sm">{confirmDeleteItem.title}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  {confirmDeleteItem.date && (
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                      {confirmDeleteItem.date}
                    </span>
                  )}
                  {confirmDeleteItem.day && (
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {confirmDeleteItem.day}
                    </span>
                  )}
                  {confirmDeleteItem.time && (
                    <span className="font-mono text-slate-700">
                      {confirmDeleteItem.time}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-rose-600 font-bold">
                * Perubahan akan langsung disinkronkan ke cloud database Supabase.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteItem(null)}
                disabled={isDeletingItem}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteItem}
                disabled={isDeletingItem}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingItem ? 'Menghapus...' : 'Ya, Hapus Jadwal'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Semua Jadwal */}
      {isConfirmClearAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-rose-900">
                Hapus SELURUH Jadwal Semester?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tindakan ini akan mengosongkan seluruh <strong className="text-rose-600 font-bold">{schedules.length}</strong> jadwal pembelajaran yang ada saat ini dari memori dan <strong>database Supabase</strong>.
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-[11px] text-rose-800 text-left font-medium">
                Peringatan: Tindakan ini permanen. Jika sewaktu-waktu membutuhkan kembali, Anda dapat mengunggah file CSV baru atau klik "Muat Contoh Jadwal 1 Semester".
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmClearAllOpen(false)}
                disabled={isClearingAll}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeClearAll}
                disabled={isClearingAll}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearingAll ? 'Mengosongkan...' : `Hapus Semua (${schedules.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Muat Contoh Jadwal 1 Semester */}
      {isConfirmSampleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-indigo-200 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                Muat Contoh Jadwal 1 Semester?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Saat ini terdapat <strong className="text-indigo-600">{schedules.length}</strong> jadwal di sistem. Memuat template resmi PKBM Bina Insani akan memperbarui daftar jadwal dan otomatis menyimpannya ke Supabase.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmSampleOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeLoadSampleSemester}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                <span>Terapkan Contoh Jadwal</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

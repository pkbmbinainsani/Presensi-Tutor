import React, { useState, useMemo } from 'react';
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  ClipboardCheck, 
  Filter, 
  Calendar,
  Sparkles,
  ChevronRight,
  Info,
  CalendarCheck2,
  ArrowRight
} from 'lucide-react';
import { ScheduleItem, DayOfWeek, UserSession, AttendanceRecord, Tutor, PKBMInfo } from '../types';
import { getWibToday, getWibTime, formatWibDateIndo, getDayNameFromDateStr } from '../lib/dateUtils';

interface TodayScheduleViewProps {
  schedules: ScheduleItem[];
  currentUser: UserSession;
  allRecords: AttendanceRecord[];
  tutors: Tutor[];
  pkbmInfo: PKBMInfo;
  onSelectForAttendance: (schedule: ScheduleItem) => void;
  onNavigateToFullTimetable?: () => void;
}

export const TodayScheduleView: React.FC<TodayScheduleViewProps> = ({
  schedules,
  currentUser,
  allRecords,
  tutors,
  pkbmInfo,
  onSelectForAttendance
}) => {
  // Waktu hari ini sesuai zona WIB (UTC+7)
  const todayStr = getWibToday(); // YYYY-MM-DD
  const currentTimeStr = getWibTime(new Date()); // HH:mm
  const todayDayName = getDayNameFromDateStr(todayStr);

  // State
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [filterMyScheduleOnly, setFilterMyScheduleOnly] = useState<boolean>(true);
  const [selectedProgram, setSelectedProgram] = useState<string>('all');

  // Identifikasi Tutor yang sedang login
  const currentTutor = tutors.find(t => t.id === currentUser.tutorId);
  const currentTutorName = currentTutor?.name || currentUser.name || '';

  // Hari dari tanggal yang sedang dipilih
  const selectedDayName = getDayNameFromDateStr(selectedDate);
  const isSelectedDateToday = selectedDate === todayStr;

  // Daftar seluruh tanggal unik yang memiliki jadwal dalam semester
  const scheduledDates = useMemo(() => {
    const map = new Map<string, number>();
    schedules.forEach(sch => {
      const d = sch.date || todayStr;
      map.set(d, (map.get(d) || 0) + 1);
    });

    // Pastikan hari ini selalu ada dalam daftar navigasi
    if (!map.has(todayStr)) {
      map.set(todayStr, 0);
    }

    return Array.from(map.entries())
      .map(([date, count]) => ({
        date,
        dayName: getDayNameFromDateStr(date),
        count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [schedules, todayStr]);

  // Tanggal jadwal berikutnya jika hari ini tidak ada sesi
  const nextScheduledDateObj = useMemo(() => {
    return scheduledDates.find(d => d.date > todayStr && d.count > 0);
  }, [scheduledDates, todayStr]);

  // Filter jadwal berdasarkan tanggal terpilih, kepemilikan tutor, dan program
  const filteredSchedules = useMemo(() => {
    return schedules.filter(sch => {
      // 1. Filter Tanggal (Wajib cocok dengan tanggal spesifik)
      const schDate = sch.date || todayStr;
      if (schDate !== selectedDate) return false;

      // 2. Filter Kepemilikan Tutor (Jadwal Saya vs Semua)
      if (filterMyScheduleOnly && currentUser.role === 'tutor') {
        const isMySchedule = (sch.tutorId && sch.tutorId === currentUser.tutorId) ||
          (sch.tutorName && sch.tutorName.toLowerCase().includes(currentTutorName.toLowerCase())) ||
          (currentTutorName && sch.tutorName.toLowerCase() === currentTutorName.toLowerCase());
        
        if (!isMySchedule) return false;
      }

      // 3. Filter Program
      if (selectedProgram !== 'all' && sch.program !== selectedProgram) {
        return false;
      }

      return true;
    }).sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  }, [schedules, selectedDate, filterMyScheduleOnly, currentUser, currentTutorName, selectedProgram, todayStr]);

  // Cari absensi pada tanggal terkait yang sudah dilakukan oleh tutor
  const checkAttendanceStatus = (item: ScheduleItem) => {
    return allRecords.find(record => {
      const isDateMatch = record.date === (item.date || selectedDate);
      const isTutorMatch = 
        record.tutorId === currentUser.tutorId || 
        record.tutorName.toLowerCase() === item.tutorName.toLowerCase() ||
        (item.tutorId && record.tutorId === item.tutorId);

      if (!isDateMatch || !isTutorMatch) return false;

      // Cek kesamaan mata pelajaran atau program
      const isSubjectMatch = 
        record.subjectTitle.toLowerCase().includes(item.subjectTitle.toLowerCase()) ||
        item.subjectTitle.toLowerCase().includes(record.subjectTitle.toLowerCase());
      
      const isProgramMatch = record.program === item.program;

      return isSubjectMatch || (isProgramMatch && record.classGroup.toLowerCase().includes(item.classGroup.toLowerCase()));
    });
  };

  // Status waktu (Sedang Berlangsung, Akan Datang, Selesai, Mendatang, Lewat)
  const getTimeStatus = (timeStart: string, timeEnd: string) => {
    if (selectedDate === todayStr) {
      if (currentTimeStr >= timeStart && currentTimeStr <= timeEnd) {
        return { label: 'Sedang Berlangsung', color: 'bg-emerald-500 text-white animate-pulse' };
      }
      if (currentTimeStr < timeStart) {
        return { label: 'Akan Datang', color: 'bg-blue-100 text-blue-800' };
      }
      return { label: 'Selesai', color: 'bg-slate-100 text-slate-600' };
    }

    if (selectedDate > todayStr) {
      return { label: 'Jadwal Mendatang', color: 'bg-indigo-100 text-indigo-800' };
    }

    return { label: 'Selesai', color: 'bg-slate-100 text-slate-500' };
  };

  // Format tanggal ramah pengguna
  const formatDisplayDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d, 12, 0, 0);
      return formatWibDateIndo(dateObj, 'withDay');
    } catch {
      return dateStr;
    }
  };

  // Badge warna program PKBM
  const getProgramBadgeStyle = (program: string) => {
    if (program.includes('Paket C')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (program.includes('Paket B')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (program.includes('Paket A')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (program.includes('PAUD')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (program.includes('Keaksaraan')) return 'bg-teal-100 text-teal-800 border-teal-200';
    return 'bg-rose-100 text-rose-800 border-rose-200';
  };

  // Statistik jadwal pada tanggal yang dipilih
  const selectedDateAllCount = schedules.filter(s => (s.date || todayStr) === selectedDate).length;
  const selectedDateMyCount = schedules.filter(s => {
    if ((s.date || todayStr) !== selectedDate) return false;
    return (s.tutorId && s.tutorId === currentUser.tutorId) ||
      (s.tutorName && s.tutorName.toLowerCase().includes(currentTutorName.toLowerCase()));
  }).length;

  const selectedDateMyAttendedCount = schedules.filter(s => {
    if ((s.date || todayStr) !== selectedDate) return false;
    const isMine = (s.tutorId && s.tutorId === currentUser.tutorId) ||
      (s.tutorName && s.tutorName.toLowerCase().includes(currentTutorName.toLowerCase()));
    return isMine && Boolean(checkAttendanceStatus(s));
  }).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-700/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-200 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>Jadwal Semester Berbasis Tanggal Pelaksanaan</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Jadwal Kegiatan Belajar Mengajar (KBM)</span>
            </h2>
            <p className="text-sm text-blue-100 max-w-2xl">
              Halo, <span className="font-bold text-amber-300">{currentTutorName || 'Tutor PKBM'}</span>! Karena waktu tatap muka berbeda di tiap minggu, jadwal diatur per tanggal pelaksanaan. Pantau jadwal dan isi presensi tepat waktu.
            </p>
          </div>

          {/* Stats Cards for Selected Date */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-950/70 border border-blue-500/30 rounded-2xl p-4 text-center min-w-[105px] backdrop-blur">
              <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">Jadwal Saya</p>
              <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-0.5">{selectedDateMyCount}</p>
              <p className="text-[10px] text-slate-400">{isSelectedDateToday ? 'Hari Ini' : 'Tanggal Ini'}</p>
            </div>
            <div className="bg-slate-950/70 border border-blue-500/30 rounded-2xl p-4 text-center min-w-[105px] backdrop-blur">
              <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">Presensi</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5">{selectedDateMyAttendedCount}</p>
              <p className="text-[10px] text-slate-400">Tercatat</p>
            </div>
          </div>
        </div>

        {/* Date Selector Navigation Bar */}
        <div className="mt-6 pt-5 border-t border-blue-800/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                Pilih Tanggal Pembelajaran Semester:
              </span>
            </div>

            {/* Direct Date Picker & Jump to Today */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="bg-slate-800/90 text-white border border-blue-500/40 text-xs px-3 py-1.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
              />

              {!isSelectedDateToday && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition shrink-0"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Kembali ke Hari Ini</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Date Pills from Semester Schedules */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {scheduledDates.map(({ date, dayName, count }) => {
              const isSelected = selectedDate === date;
              const isToday = todayStr === date;
              const [, m, d] = date.split('-');

              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`px-3.5 py-2 rounded-2xl text-xs transition-all shrink-0 flex items-center gap-2 ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-lg font-black scale-105'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold'
                  }`}
                >
                  <span className="font-mono font-black">{d}/{m}</span>
                  <span>{dayName}</span>
                  {isToday && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase font-black tracking-wider ${
                      isSelected ? 'bg-slate-950 text-amber-300' : 'bg-emerald-500 text-white'
                    }`}>
                      Hari Ini
                    </span>
                  )}
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected ? 'bg-amber-500/60 text-slate-950' : 'bg-slate-900 text-slate-300'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Filter & View Controls */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        {/* Toggle Jadwal Saya vs Semua Jadwal */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 w-full sm:w-auto">
          <button
            onClick={() => setFilterMyScheduleOnly(true)}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              filterMyScheduleOnly
                ? 'bg-white text-blue-900 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span>Jadwal Saya</span>
          </button>
          <button
            onClick={() => setFilterMyScheduleOnly(false)}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              !filterMyScheduleOnly
                ? 'bg-white text-blue-900 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-slate-600" />
            <span>Semua Jadwal PKBM</span>
          </button>
        </div>

        {/* Filter Program */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">Semua Program PKBM</option>
            <option value="Paket C (Setara SMA)">Paket C (Setara SMA)</option>
            <option value="Paket B (Setara SMP)">Paket B (Setara SMP)</option>
            <option value="Paket A (Setara SD)">Paket A (Setara SD)</option>
            <option value="PAUD Bina Insani">PAUD Bina Insani</option>
            <option value="Keaksaraan Fungsional (KF)">Keaksaraan Fungsional (KF)</option>
            <option value="Kursus & Keterampilan / Vokasi">Kursus & Keterampilan / Vokasi</option>
          </select>
        </div>

      </div>

      {/* Selected Date Indicator Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-600 bg-slate-100 p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Menampilkan jadwal untuk tanggal:</span>
          <span className="text-indigo-950 font-black bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
            {formatDisplayDate(selectedDate)}
          </span>
          {isSelectedDateToday && (
            <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
              Hari Ini (WIB)
            </span>
          )}
        </div>
        <span className="text-slate-500">{filteredSchedules.length} Sesi Terjadwal</span>
      </div>

      {/* Schedule Items List */}
      {filteredSchedules.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border-2 border-dashed border-slate-300 space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <CalendarDays className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-slate-800">
              Tidak Ada Jadwal {filterMyScheduleOnly ? 'Mengajar Anda' : ''} pada Tanggal {formatDisplayDate(selectedDate)}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Karena kegiatan pembelajaran dilakukan bertahap/modul dan berbeda tiap minggunya, sesi hanya berlangsung pada tanggal yang dijadwalkan.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {filterMyScheduleOnly && (
              <button
                onClick={() => setFilterMyScheduleOnly(false)}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition"
              >
                Lihat Semua Jadwal PKBM pada Tanggal Ini
              </button>
            )}

            {nextScheduledDateObj && nextScheduledDateObj.date !== selectedDate && (
              <button
                onClick={() => setSelectedDate(nextScheduledDateObj.date)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow transition"
              >
                <span>Lihat Jadwal Berikutnya ({formatDisplayDate(nextScheduledDateObj.date)})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSchedules.map((item) => {
            const timeStatus = getTimeStatus(item.timeStart, item.timeEnd);
            const attendanceRecord = checkAttendanceStatus(item);
            const hasAttended = Boolean(attendanceRecord);
            const isMyClass = (item.tutorId && item.tutorId === currentUser.tutorId) ||
              (item.tutorName && item.tutorName.toLowerCase().includes(currentTutorName.toLowerCase()));

            return (
              <div
                key={item.id}
                className={`bg-white rounded-3xl border transition-all duration-200 hover:shadow-xl flex flex-col justify-between overflow-hidden ${
                  hasAttended 
                    ? 'border-emerald-200 shadow-sm bg-gradient-to-b from-emerald-50/20 to-white' 
                    : timeStatus?.label === 'Sedang Berlangsung'
                    ? 'border-emerald-400 ring-2 ring-emerald-400/30 shadow-md'
                    : 'border-slate-200 shadow-sm'
                }`}
              >
                {/* Card Top / Header */}
                <div className="p-5 space-y-3">
                  
                  {/* Time Slot & Status Tag */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-xl text-slate-800 font-mono font-bold text-xs">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>{item.timeStart} - {item.timeEnd} WIB</span>
                    </div>

                    {timeStatus && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide ${timeStatus.color}`}>
                        {timeStatus.label}
                      </span>
                    )}
                  </div>

                  {/* Program Badge */}
                  <div>
                    <span className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-bold border ${getProgramBadgeStyle(item.program)}`}>
                      {item.program}
                    </span>
                  </div>

                  {/* Subject Title & Class */}
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                      {item.subjectTitle}
                    </h4>
                    <p className="text-xs font-bold text-blue-700 mt-0.5">
                      {item.classGroup}
                    </p>
                  </div>

                  {/* Location & Room */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold truncate">{item.room || 'Gedung Utama PKBM'}</span>
                  </div>

                  {/* Tutor Info */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      isMyClass ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {item.tutorName.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-extrabold text-slate-800 truncate">
                        {item.tutorName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {isMyClass ? 'Jadwal Anda' : 'Tutor Pengampu'}
                      </p>
                    </div>
                  </div>

                  {/* Notes / Topics if any */}
                  {item.notes && (
                    <div className="text-[11px] text-slate-500 bg-amber-50/80 border border-amber-200/60 p-2.5 rounded-xl flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{item.notes}</span>
                    </div>
                  )}

                </div>

                {/* Card Action / Attendance Status Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 mt-2">
                  {hasAttended ? (
                    <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-emerald-100/70 border border-emerald-200 text-emerald-900">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs font-extrabold">Presensi Tercatat</p>
                          <p className="text-[10px] text-emerald-700">
                            {attendanceRecord?.timeStart} WIB • {attendanceRecord?.status}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                        Valid
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectForAttendance(item)}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white rounded-2xl text-xs font-extrabold shadow-md flex items-center justify-center gap-2 transition-all"
                    >
                      <ClipboardCheck className="w-4 h-4 text-amber-300" />
                      <span>Isi Presensi Sekarang</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

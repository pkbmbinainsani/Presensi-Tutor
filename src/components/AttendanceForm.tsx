import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  RefreshCw, 
  User, 
  BookOpen, 
  Clock, 
  Calendar,
  Users, 
  FileText, 
  Sparkles,
  ShieldCheck,
  Building,
  RotateCcw,
  Lock,
  Unlock,
  ShieldAlert,
  Briefcase,
  Check
} from 'lucide-react';
import { Tutor, ProgramType, GeoLocationData, AttendanceRecord, UserSession, ClassLocation } from '../types';
import { PKBM_CONFIG, INITIAL_CLASS_LOCATIONS } from '../data/mockData';
import { calculateDistanceMeters, saveAttendanceRecord } from '../lib/storage';
import { MapView } from './MapView';
import { TutorProfileModal } from './TutorProfileModal';
import { getWibToday, getWibTime, getWibTimeWithSuffix, formatWibDateIndo } from '../lib/dateUtils';

interface AttendanceFormProps {
  tutors: Tutor[];
  initialTutorId?: string;
  currentUser?: UserSession;
  allRecords?: AttendanceRecord[];
  classLocations?: ClassLocation[];
  onRecordCreated: (record: AttendanceRecord) => void;
  onTutorUpdated?: (tutor: Tutor) => void;
}

const PROGRAM_OPTIONS: ProgramType[] = [
  'Paket A (Setara SD)',
  'Paket B (Setara SMP)',
  'Paket C (Setara SMA)',
  'Keaksaraan Fungsional (KF)',
  'PAUD Bina Insani',
  'Kursus & Keterampilan / Vokasi'
];

export const AttendanceForm: React.FC<AttendanceFormProps> = ({ 
  tutors, 
  initialTutorId, 
  currentUser,
  allRecords = [],
  classLocations = [],
  onRecordCreated,
  onTutorUpdated
}) => {
  // Form State
  const defaultTutorId = initialTutorId || (currentUser?.role === 'tutor' ? currentUser.tutorId : '') || (tutors.length > 0 ? tutors[0].id : '');
  const [selectedTutorId, setSelectedTutorId] = useState<string>(defaultTutorId);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [program, setProgram] = useState<ProgramType>('Paket C (Setara SMA)');
  const [subjectTitle, setSubjectTitle] = useState<string>('');
  const [classGroup, setClassGroup] = useState<string>('Gedung Utama PKBM');
  const [date, setDate] = useState<string>(getWibToday());
  const [currentTime, setCurrentTime] = useState<string>('');
  const [studentCount, setStudentCount] = useState<number>(15);
  const [dutyType, setDutyType] = useState<'Reguler' | 'Dinas Luar'>('Reguler');
  const [activityNotes, setActivityNotes] = useState<string>('');

  // Enforce selectedTutorId if tutor role
  useEffect(() => {
    if (currentUser?.role === 'tutor' && currentUser.tutorId) {
      setSelectedTutorId(currentUser.tutorId);
    }
  }, [currentUser]);

  // Camera & Photo State
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // GPS Location State
  const [geoLocation, setGeoLocation] = useState<GeoLocationData | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Status submission feedback & Refs
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const topAlertRef = useRef<HTMLDivElement>(null);

  // Helper to simulate valid GPS inside PKBM Gedung Utama
  const simulateValidGpsLocation = () => {
    const mainLoc = activeLocationsList.find(l => l.isMainBranch) || activeLocationsList[0];
    const validLat = mainLoc.latitude + (Math.random() - 0.5) * 0.0001;
    const validLng = mainLoc.longitude + (Math.random() - 0.5) * 0.0001;
    const dist = Math.round(calculateDistanceMeters(validLat, validLng, mainLoc.latitude, mainLoc.longitude));

    setGeoLocation({
      latitude: validLat,
      longitude: validLng,
      accuracy: 8,
      distanceToCenterMeters: dist,
      isWithinRadius: true,
      matchedLocationId: mainLoc.id,
      matchedLocationName: mainLoc.name,
      address: `Terverifikasi Valid di ${mainLoc.name} (${dist}m dari titik pusat, Radius: ${mainLoc.radiusMeters}m)`,
      timestamp: new Date().toISOString()
    });
    if (dutyType === 'Reguler') {
      setClassGroup(mainLoc.name);
    }
    setFormError(null);
  };

  // Set automatic real-time timestamp & GPS on mount
  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(getWibTime(new Date(), true));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);

    // Automatically trigger GPS detection on form mount
    fetchRealTimeGPS();

    return () => clearInterval(interval);
  }, []);

  // Auto-switch classGroup based on dutyType (Reguler vs Dinas Luar) and GPS location
  useEffect(() => {
    if (dutyType === 'Dinas Luar') {
      setClassGroup('Lainnya / Lokasi Kunjungan Lapangan');
    } else if (dutyType === 'Reguler') {
      if (geoLocation && geoLocation.matchedLocationName) {
        setClassGroup(geoLocation.matchedLocationName);
      } else {
        const mainLoc = activeLocationsList.find(l => l.isMainBranch) || activeLocationsList[0];
        if (mainLoc) setClassGroup(mainLoc.name);
      }
    }
  }, [dutyType]);

  // Set default tutor if available
  useEffect(() => {
    if (tutors.length > 0 && !selectedTutorId) {
      setSelectedTutorId(tutors[0].id);
    }
  }, [tutors]);

  // Real-time GPS Detection Function (Multi-location geofence)
  const activeLocationsList = (classLocations && classLocations.length > 0) ? classLocations : INITIAL_CLASS_LOCATIONS;

  const fetchRealTimeGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("Perangkat/Browser Anda tidak mendukung Geolocation GPS.");
      return;
    }

    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const acc = Math.round(position.coords.accuracy);

        // Find closest active class location
        let minDistance = Infinity;
        let matchedLocation: ClassLocation | null = null;
        let isWithin = false;

        const activeLocs = activeLocationsList.filter(l => l.active);

        activeLocs.forEach(loc => {
          const d = calculateDistanceMeters(lat, lng, loc.latitude, loc.longitude);
          if (d < minDistance) {
            minDistance = d;
            matchedLocation = loc;
          }
          if (d <= loc.radiusMeters) {
            isWithin = true;
          }
        });

        // Fallback if no location matched
        const closestLocName = matchedLocation ? (matchedLocation as ClassLocation).name : PKBM_CONFIG.name;
        const closestRadius = matchedLocation ? (matchedLocation as ClassLocation).radiusMeters : 300;

        setGeoLocation({
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          distanceToCenterMeters: minDistance === Infinity ? 0 : minDistance,
          isWithinRadius: isWithin,
          matchedLocationId: matchedLocation ? (matchedLocation as ClassLocation).id : undefined,
          matchedLocationName: closestLocName,
          address: isWithin
            ? `Lokasi Terverifikasi Valid: ${closestLocName} (${minDistance}m dari titik lokasi, Radius: ${closestRadius}m)`
            : `Kunjungan Lapangan/Luar Radius: Terdekat dari ${closestLocName} (${minDistance}m, Radius Max: ${closestRadius}m)`,
          timestamp: new Date().toISOString()
        });

        // Auto-select class group if matched based on dutyType
        if (dutyType === 'Dinas Luar') {
          setClassGroup('Lainnya / Lokasi Kunjungan Lapangan');
        } else if (matchedLocation) {
          setClassGroup((matchedLocation as ClassLocation).name);
        }

        setIsDetectingGps(false);
      },
      (err) => {
        console.warn("GPS detection warning:", err);
        // Fallback default coordinates around Gedung Utama or PKBM_CONFIG
        const defaultFallbackCenter: ClassLocation = {
          id: 'loc-utama',
          name: 'Gedung Utama PKBM Bina Insani',
          address: 'RT.01/RW.02 Dusun Kawedusan, Desa Ngadikerso, Kec. Sumowono',
          latitude: PKBM_CONFIG.centerCoordinates.latitude,
          longitude: PKBM_CONFIG.centerCoordinates.longitude,
          radiusMeters: PKBM_CONFIG.allowedRadiusMeters || 300,
          isMainBranch: true,
          active: true
        };
        const mainLoc = activeLocationsList.find(l => l.isMainBranch) || activeLocationsList[0] || defaultFallbackCenter;
        const fallbackLat = mainLoc.latitude + (Math.random() - 0.5) * 0.0005;
        const fallbackLng = mainLoc.longitude + (Math.random() - 0.5) * 0.0005;
        const dist = calculateDistanceMeters(fallbackLat, fallbackLng, mainLoc.latitude, mainLoc.longitude);

        setGeoLocation({
          latitude: fallbackLat,
          longitude: fallbackLng,
          accuracy: 12,
          distanceToCenterMeters: dist,
          isWithinRadius: dist <= mainLoc.radiusMeters,
          matchedLocationId: mainLoc.id,
          matchedLocationName: mainLoc.name,
          address: `Terdeteksi di ${mainLoc.name} (${dist}m dari titik pusat, Radius: ${mainLoc.radiusMeters}m)`,
          timestamp: new Date().toISOString()
        });

        if (dutyType === 'Dinas Luar') {
          setClassGroup('Lainnya / Lokasi Kunjungan Lapangan');
        } else if (mainLoc) {
          setClassGroup(mainLoc.name);
        }

        setIsDetectingGps(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // WebCam Handler
  const startCamera = async () => {
    setIsCameraActive(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera access note:", err);
      setCameraError("Kamera tidak dapat diakses. Silakan gunakan opsi Unggah Berkas Foto.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 800;
    canvas.height = videoRef.current.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoDataUrl(dataUrl);
    }
    stopCamera();
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedTutorId) {
      setFormError("Silakan pilih Identitas Tutor / Pendidik terlebih dahulu.");
      topAlertRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!subjectTitle.trim()) {
      setFormError("Silakan isi Nama Mata Pelajaran / Modul / Judul Kegiatan Pembelajaran.");
      topAlertRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Mandatory check for Dinas Luar explanation
    if (dutyType === 'Dinas Luar' && !activityNotes.trim()) {
      setFormError("⚠️ Presensi Ditolak: Anda memilih status Dinas Luar. Wajib mengisikan Keterangan / Surat Tugas / Alasan Dinas Luar pada kolom catatan kegiatan.");
      topAlertRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!photoDataUrl) {
      setFormError("Bukti Unggah Foto Kegiatan wajib dilampirkan. Anda dapat mengambil foto kamera, unggah galeri, atau klik 'Gunakan Foto Sampel'.");
      topAlertRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!geoLocation) {
      setFormError("Lokasi real-time GPS belum didapatkan. Silakan klik 'Perbarui GPS' atau klik 'Set Lokasi Valid'.");
      topAlertRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Check if Admin locked location & tutor is outside radius (ONLY applies to Reguler mode)
    const isLocationLocked = localStorage.getItem('pkbm_location_locked') !== 'false';
    if (dutyType === 'Reguler' && isLocationLocked && !geoLocation.isWithinRadius) {
      setFormError(`⛔ Presensi Ditolak: Posisi GPS Anda (${geoLocation.distanceToCenterMeters}m dari ${geoLocation.matchedLocationName || 'Titik Kelas'}) berada di luar radius geofence. Ubah ke 'Dinas Luar' atau klik 'Set Lokasi Valid' untuk simulasi.`);
      topAlertRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const currentTutor = tutors.find(t => t.id === selectedTutorId);
    if (!currentTutor) return;

    // Record exact date and timestamp automatically on submit (Zona WIB UTC+7)
    const autoDate = getWibToday();
    const autoTimestamp = getWibTimeWithSuffix(new Date(), false);

    const newRecord = saveAttendanceRecord({
      tutorId: currentTutor.id,
      tutorName: currentTutor.name,
      program,
      subjectTitle: subjectTitle.trim(),
      classGroup: dutyType === 'Dinas Luar' ? `[Dinas Luar] ${classGroup.trim() || 'Lokasi Penugasan'}` : (classGroup.trim() || 'Gedung Utama PKBM'),
      date: autoDate,
      timeStart: autoTimestamp,
      timeEnd: autoTimestamp,
      studentCount,
      activityNotes: activityNotes.trim() || (dutyType === 'Dinas Luar' ? 'Penugasan Dinas Luar.' : 'Pembelajaran tatap muka dan pendampingan warga belajar.'),
      photoUrl: photoDataUrl,
      location: geoLocation,
      status: dutyType === 'Dinas Luar' ? 'Dinas Luar' : (geoLocation.isWithinRadius ? 'Hadir Valid' : 'Hadir Lapangan'),
      dutyType
    });

    onRecordCreated(newRecord);
    setSubmitSuccess(true);
    setFormError(null);

    topAlertRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Reset Form fields
    setSubjectTitle('');
    setActivityNotes('');
    setPhotoDataUrl(null);

    setTimeout(() => {
      setSubmitSuccess(false);
    }, 5000);
  };

  const selectedTutorObj = tutors.find(t => t.id === selectedTutorId);
  const todayStr = getWibToday();
  const tutorTodayRecords = allRecords.filter(r => 
    (r.tutorId === selectedTutorId || (selectedTutorObj && r.tutorName === selectedTutorObj.name)) &&
    r.date === todayStr
  );
  const hasSubmittedToday = tutorTodayRecords.length > 0;
  const latestTodayRecord = tutorTodayRecords[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      <div ref={topAlertRef} />

      {/* Tutor Already Completed Attendance Banner Notification */}
      {currentUser?.role === 'tutor' && hasSubmittedToday && (
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 rounded-3xl shadow-xl border-2 border-emerald-400/50 relative overflow-hidden space-y-4 animate-in fade-in zoom-in duration-300">
          <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-emerald-500/25 rounded-2xl border border-emerald-400/40 text-amber-300 shrink-0 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    STATUS TERVERIFIKASI SISTEM
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-200">
                    {latestTodayRecord.timeStart} WIB
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white mt-1">
                  Terima kasih, kehadiran Anda telah dicatat pada sistem.
                </h3>
                <p className="text-xs text-emerald-100/90 mt-0.5 leading-relaxed">
                  Laporan presensi & jurnal mengajar untuk <strong className="text-amber-300">{selectedTutorObj?.name}</strong> pada tanggal <strong className="text-white">{latestTodayRecord.date}</strong> telah tersimpan otomatis di basis data PKBM.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3.5 py-2 rounded-xl text-xs font-black bg-white/10 text-emerald-200 border border-white/20 shadow-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {tutorTodayRecords.length}x Presensi Hari Ini
              </span>
            </div>
          </div>

          {/* Details of Latest Today's Record */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-[10px] text-emerald-200 uppercase font-black">Mata Pelajaran</p>
              <p className="font-bold text-white truncate">{latestTodayRecord.subjectTitle}</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-200 uppercase font-black">Program & Pos</p>
              <p className="font-bold text-white truncate">{latestTodayRecord.program} ({latestTodayRecord.classGroup})</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-200 uppercase font-black">Mode Kehadiran</p>
              <p className="font-bold text-amber-300 truncate">{latestTodayRecord.dutyType === 'Dinas Luar' ? '💼 Dinas Luar' : '🏢 Reguler (Tatap Muka)'}</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-200 uppercase font-black">Siswa Hadir</p>
              <p className="font-bold text-emerald-300 truncate">{latestTodayRecord.studentCount} Orang Warga Belajar</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert Banner */}
      {submitSuccess && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white p-5 rounded-3xl shadow-xl flex items-center justify-between animate-in fade-in zoom-in duration-300 border-2 border-white/20">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-white/20 rounded-2xl shrink-0">
              <CheckCircle2 className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <h4 className="font-extrabold text-base sm:text-lg">Presensi & Jurnal Mengajar Berhasil Disimpan!</h4>
              <p className="text-xs text-blue-100 mt-0.5">
                Data presensi tutor, foto kegiatan, dan koordinat GPS telah berhasil dicatat ke rekapitulasi otomatis.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSubmitSuccess(false)}
            className="text-white hover:bg-white/10 px-3.5 py-2 rounded-xl text-xs font-bold border border-white/30 shrink-0 transition-all"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Error Alert with 1-click Quick Fix Actions */}
      {formError && (
        <div className="bg-rose-50 border-2 border-rose-300 p-4 rounded-3xl shadow-md space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3 text-rose-900 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-rose-900">Perhatian / Presensi Belum Dapat Dikirim:</p>
              <p className="font-medium text-rose-800 leading-relaxed">{formError}</p>
            </div>
          </div>

          {/* Quick Action Fix Buttons */}
          {dutyType === 'Reguler' && geoLocation && !geoLocation.isWithinRadius && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-200/80">
              <button
                type="button"
                onClick={() => {
                  setDutyType('Dinas Luar');
                  if (!activityNotes) setActivityNotes('Penugasan Dinas Luar / Kunjungan Lapangan.');
                  setFormError(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl shadow flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Briefcase className="w-3.5 h-3.5 text-amber-300" />
                Ganti ke Mode Dinas Luar
              </button>
              <button
                type="button"
                onClick={simulateValidGpsLocation}
                className="bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-extrabold px-3.5 py-1.5 rounded-xl shadow flex items-center gap-1.5 transition-all active:scale-95"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Simulasi GPS Dalam Radius
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Activity & Tutor Data (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-md border-t-4 border-t-emerald-600 border-x border-b border-slate-200/80 space-y-5 hover:shadow-lg transition-all duration-300">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl font-bold shadow-sm">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Formulir Presensi & Jurnal Mengajar Tutor</h3>
                <p className="text-xs text-slate-500 font-medium">Silakan isi laporan kehadiran, lampirkan bukti foto kegiatan, dan lakukan verifikasi koordinat GPS lokasi kelas.</p>
              </div>
            </div>
            <span className="text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
              Formulir Siap
            </span>
          </div>

          {/* Tutor Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Identitas Tutor / Pendidik <span className="text-rose-500">*</span>
            </label>
            
            {currentUser?.role === 'tutor' ? (
              <div className="bg-gradient-to-r from-blue-50 via-teal-50 to-emerald-50 border-2 border-blue-400/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="relative group">
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black flex items-center justify-center text-lg shadow-md overflow-hidden shrink-0 border-2 border-amber-400">
                      {selectedTutorObj?.avatarUrl ? (
                        <img src={selectedTutorObj.avatarUrl} alt={selectedTutorObj.name} className="w-full h-full object-cover" />
                      ) : (
                        selectedTutorObj?.name ? selectedTutorObj.name.charAt(0) : 'T'
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 bg-blue-200/80 px-2.5 py-0.5 rounded-full border border-blue-300/60">
                        Presensi Mandiri
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-900">
                        {selectedTutorObj?.nipCode}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">{selectedTutorObj?.name}</h4>
                    <p className="text-xs text-slate-600 font-medium">
                      Spesialisasi: <strong className="text-slate-800">{selectedTutorObj?.specialization}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(true)}
                    className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition transform active:scale-95"
                    title="Pasang atau ganti foto profil tutor"
                  >
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    <span>{selectedTutorObj?.avatarUrl ? 'Ganti Foto' : 'Pasang Foto'}</span>
                  </button>
                  <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 inline-flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Terverifikasi
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <select
                    value={selectedTutorId}
                    onChange={(e) => setSelectedTutorId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-inner"
                  >
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.nipCode}) — {t.specialization}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedTutorObj && (
                  <p className="text-[11px] text-blue-700 mt-1 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Spesialisasi: {selectedTutorObj.specialization} • No. HP: {selectedTutorObj.phone}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Status / Jenis Presensi Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Jenis Presensi / Status Penugasan <span className="text-rose-500">*</span></span>
              {dutyType === 'Dinas Luar' && (
                <span className="text-[10px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-300 flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-blue-700" /> Mode Dinas Luar
                </span>
              )}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDutyType('Reguler')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 active:scale-98 ${
                  dutyType === 'Reguler'
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-600 text-emerald-950 font-bold shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${dutyType === 'Reguler' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 text-slate-600'}`}>
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">Reguler (Di Kelas / Pos)</p>
                    <p className="text-[10px] text-slate-500 font-medium">Wajib di dalam radius lokasi kelas</p>
                  </div>
                </div>
                {dutyType === 'Reguler' && <Check className="w-5 h-5 text-emerald-600 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setDutyType('Dinas Luar')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 active:scale-98 ${
                  dutyType === 'Dinas Luar'
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-600 text-blue-950 font-bold shadow-md ring-2 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${dutyType === 'Dinas Luar' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-600'}`}>
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">Dinas Luar / Penugasan</p>
                    <p className="text-[10px] text-slate-500 font-medium">Boleh di luar radius, wajib keterangan</p>
                  </div>
                </div>
                {dutyType === 'Dinas Luar' && <Check className="w-5 h-5 text-blue-600 shrink-0" />}
              </button>
            </div>
          </div>

          {/* Program & Mata Pelajaran */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Program Layanan PKBM <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-500 font-normal">Pilih salah satu program</span>
              </label>
              
              {/* Interactive Program Choice Panel */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {PROGRAM_OPTIONS.map((prog) => {
                  const isSelected = program === prog;
                  return (
                    <button
                      key={prog}
                      type="button"
                      onClick={() => setProgram(prog)}
                      className={`p-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-between gap-2 text-left active:scale-95 ${
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500'
                          : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200'
                      }`}
                    >
                      <span className="truncate">{prog}</span>
                      {isSelected && <Check className="w-4 h-4 text-amber-300 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Mata Pelajaran / Modul <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-500 font-normal">Ketik atau klik pilihan cepat</span>
              </label>
              <input
                type="text"
                value={subjectTitle}
                onChange={(e) => setSubjectTitle(e.target.value)}
                placeholder="Contoh: Matematika Terapan Paket C"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all shadow-inner"
              />
              {/* Quick Subject Suggestion Chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Matematika Terapan', 'Bahasa Indonesia', 'Sosiologi & Pemberdayaan', 'IPA Terpadu', 'Keterampilan Vokasi'].map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubjectTitle(sub)}
                    className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
                      subjectTitle === sub
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                        : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 border-slate-200'
                    }`}
                  >
                    + {sub}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pos Belajar / Ruang Kelas & Jumlah WB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex flex-wrap items-center justify-between gap-1">
                <span>Lokasi Titik Kelas / Pos Belajar</span>
                {dutyType === 'Dinas Luar' ? (
                  <span className="text-[10px] text-blue-900 font-bold bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
                    ⚡ Otomatis 'Lainnya' (Dinas Luar)
                  </span>
                ) : geoLocation && geoLocation.isWithinRadius && geoLocation.matchedLocationName ? (
                  <span className="text-[10px] text-emerald-900 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    ✓ GPS Terdeteksi Cocok
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {activeLocationsList.length} Titik Terdaftar
                  </span>
                )}
              </label>
              <select
                value={classGroup}
                onChange={(e) => setClassGroup(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-all ${
                  dutyType === 'Dinas Luar'
                    ? 'bg-blue-50/70 border-blue-300 text-blue-950 focus:ring-2 focus:ring-blue-500'
                    : geoLocation && geoLocation.isWithinRadius
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 focus:ring-2 focus:ring-emerald-500'
                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-emerald-500'
                }`}
              >
                {activeLocationsList.filter(l => l.active).map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.isMainBranch ? '🏢 ' : '📍 '}{loc.name} ({loc.radiusMeters}m)
                  </option>
                ))}
                <option value="Lainnya / Lokasi Kunjungan Lapangan">
                  📍 Lainnya / Lokasi Kunjungan Lapangan Custom
                </option>
              </select>
              {dutyType === 'Dinas Luar' ? (
                <p className="text-[11px] text-blue-700 mt-1 font-medium">
                  Lokasi otomatis dialihkan ke 'Lainnya' untuk mengakomodasi penugasan di luar area sekolah/pos.
                </p>
              ) : geoLocation && geoLocation.isWithinRadius && geoLocation.matchedLocationName ? (
                <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                  Lokasi otomatis terpilih sesuai koordinat GPS terverifikasi di area <strong>{geoLocation.matchedLocationName}</strong>.
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Jumlah WB Hadir</span>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  {studentCount} Orang
                </span>
              </label>
              <div className="relative flex items-center shadow-inner rounded-xl overflow-hidden border border-slate-300">
                <button
                  type="button"
                  onClick={() => setStudentCount(Math.max(1, studentCount - 1))}
                  className="w-11 h-10 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 font-black text-lg flex items-center justify-center transition-all active:scale-90 border-r border-slate-300 shrink-0"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={studentCount}
                  onChange={(e) => setStudentCount(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 py-2 text-center text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setStudentCount(studentCount + 1)}
                  className="w-11 h-10 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 font-black text-lg flex items-center justify-center transition-all active:scale-90 border-l border-slate-300 shrink-0"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Date & Automatic Real-time Single Timestamp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Tanggal Presensi</span>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ⚡ Otomatis Tercatat
                </span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly
                  value={formatWibDateIndo(getWibToday(), 'withDay')}
                  className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 cursor-not-allowed outline-none"
                />
                <Calendar className="w-4 h-4 text-emerald-600 absolute right-3" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Tanggal hari ini tercatat secara otomatis oleh sistem saat presensi.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Jam Presensi Mandiri</span>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ⚡ Otomatis Tercatat
                </span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly
                  value={currentTime ? `${currentTime} WIB` : 'Memuat jam...'}
                  className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-emerald-900 cursor-not-allowed outline-none"
                />
                <Clock className="w-4 h-4 text-emerald-600 absolute right-3" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Jam tercatat secara otomatis sesuai waktu presisi saat Anda mengklik simpan.
              </p>
            </div>
          </div>

          {/* Activity Description / Dinas Luar Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>
                {dutyType === 'Dinas Luar' ? (
                  <>Keterangan / Surat Tugas / Alasan Dinas Luar <span className="text-rose-500">* (Wajib)</span></>
                ) : (
                  <>Ringkasan Materi & Catatan Kegiatan Tutor</>
                )}
              </span>
              {dutyType === 'Dinas Luar' && (
                <span className="text-[10px] text-rose-700 font-extrabold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Wajib Diisi untuk Dinas Luar
                </span>
              )}
            </label>
            <textarea
              rows={3}
              value={activityNotes}
              onChange={(e) => setActivityNotes(e.target.value)}
              placeholder={
                dutyType === 'Dinas Luar'
                  ? "Tuliskan keterangan dinas luar / lokasi penugasan / nomor surat tugas secara rinci..."
                  : "Uraikan ringkasan materi, capaian warga belajar, atau catatan khusus kegiatan mengajar hari ini..."
              }
              className={`w-full border rounded-xl p-3 text-sm font-medium focus:ring-2 outline-none transition-all ${
                dutyType === 'Dinas Luar' && !activityNotes.trim()
                  ? 'bg-rose-50/60 border-rose-400 text-rose-950 focus:ring-rose-500 placeholder-rose-400'
                  : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-emerald-500'
              }`}
            ></textarea>
            {dutyType === 'Dinas Luar' && !activityNotes.trim() && (
              <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                ⚠️ Keterangan dinas luar wajib diisi agar sistem dapat memverifikasi presensi di luar radius lokasi.
              </p>
            )}
          </div>

        </div>

        {/* Right Column: Photo Proof & Live GPS Verification (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 1: Photo Upload / Camera Capture */}
          <div className="bg-white rounded-3xl p-5 shadow-md border-t-4 border-t-blue-600 border-x border-b border-slate-200/80 space-y-4 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Bukti Unggah Foto Kegiatan <span className="text-rose-500">*</span></h4>
                  <p className="text-[11px] text-slate-500">Kamera HP atau Galeri dengan Stempel Waktu</p>
                </div>
              </div>
            </div>

            {/* Photo Preview or Live Camera Box */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-dashed border-slate-300 min-h-[200px] flex flex-col items-center justify-center text-center p-3">
              {isCameraActive ? (
                <div className="relative w-full h-56 bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs px-5 py-2.5 rounded-full shadow-xl border-2 border-white flex items-center gap-2 active:scale-95 transition-all"
                  >
                    <Camera className="w-4 h-4 text-amber-300" />
                    Ambil Foto Sekarang
                  </button>
                </div>
              ) : photoDataUrl ? (
                <div className="relative w-full group">
                  <img
                    src={photoDataUrl}
                    alt="Bukti Presensi Kegiatan"
                    className="w-full h-56 object-cover rounded-xl border border-slate-700"
                  />
                  
                  {/* Stamped Watermark Badge on Preview */}
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur-md text-white p-2.5 rounded-xl text-[10px] text-left border border-white/20 shadow-lg">
                    <p className="font-black text-emerald-400">PKBM BINA INSANI SUMOWONO</p>
                    <p className="truncate font-semibold text-slate-200">{selectedTutorObj?.name || 'Tutor'}</p>
                    <p className="text-amber-300 font-bold">{date} • Real-time GPS Watermark</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl(null)}
                    className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black px-3 py-1.5 rounded-xl shadow-lg transition-all"
                  >
                    Hapus / Ganti
                  </button>
                </div>
              ) : (
                <div className="py-6 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">Lampirkan Foto Kegiatan Pembelajaran</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">Format JPG / PNG (Maksimal 10 MB)</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Camera className="w-4 h-4 text-amber-300" />
                      Kamera
                    </button>

                    <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-xl cursor-pointer border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      Galeri
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <p className="text-[11px] text-rose-600 font-bold">{cameraError}</p>
            )}
          </div>

          {/* Section 2: Real-time Geolocation Verification */}
          <div className="bg-white rounded-3xl p-5 shadow-md border-t-4 border-t-emerald-600 border-x border-b border-slate-200/80 space-y-3 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Lokasi GPS Real-time <span className="text-rose-500">*</span></h4>
                  <p className="text-[11px] text-slate-500">Peta & Verifikasi Titik Koordinat</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={simulateValidGpsLocation}
                  className="text-[11px] font-black text-blue-800 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1 transition-all active:scale-95"
                  title="Simulasi GPS di dalam area kelas PKBM"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  Simulasi GPS
                </button>
                <button
                  type="button"
                  onClick={fetchRealTimeGPS}
                  disabled={isDetectingGps}
                  className="text-[11px] font-black text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1 transition-all active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                  {isDetectingGps ? 'Memuat...' : 'Perbarui GPS'}
                </button>
              </div>
            </div>

            {/* Interactive Leaflet Map Preview */}
            <MapView
              currentLocation={geoLocation}
              locations={activeLocationsList}
              onRefreshLocation={fetchRealTimeGPS}
              isLoadingLocation={isDetectingGps}
            />

            {/* GPS Data Badge */}
            {geoLocation ? (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Status Area Geofence:</span>
                  <span className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                    dutyType === 'Dinas Luar'
                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                      : geoLocation.isWithinRadius 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                        : (localStorage.getItem('pkbm_location_locked') !== 'false')
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {dutyType === 'Dinas Luar'
                      ? '💼 Dinas Luar (Dizinkan Di Luar Radius)'
                      : geoLocation.isWithinRadius 
                        ? `✓ Valid di Area ${geoLocation.matchedLocationName || 'Titik Kelas PKBM'}` 
                        : (localStorage.getItem('pkbm_location_locked') !== 'false')
                          ? '⛔ Outside Radius (Terkunci oleh Admin)'
                          : '⚠ Outside Radius Geofence (Presensi Lapangan)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Koordinat Presisi:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {geoLocation.latitude.toFixed(5)}, {geoLocation.longitude.toFixed(5)} (±{geoLocation.accuracy}m)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Jarak ke Titik Terdekat:</span>
                  <span className="font-bold text-slate-800">{geoLocation.distanceToCenterMeters} meter ({geoLocation.matchedLocationName})</span>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-800">
                Memuat data koordinat GPS real-time lokasi Anda...
              </div>
            )}

            {/* Warning / Info Banner */}
            {dutyType === 'Reguler' && (localStorage.getItem('pkbm_location_locked') !== 'false') && geoLocation && !geoLocation.isWithinRadius && (
              <div className="bg-rose-50 border-2 border-rose-300 p-3.5 rounded-xl text-rose-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-800">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>PRESENSI REGULER DI LUAR RADIUS (TERKUNCI ADMIN)</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-snug">
                  Admin telah mengunci lokasi presensi reguler. Jarak Anda: <strong>{geoLocation.distanceToCenterMeters}m</strong> dari <em>{geoLocation.matchedLocationName || 'Titik Kelas'}</em>.
                  <br />
                  <span className="font-bold text-rose-900">💡 Memiliki Tugas Luar?</span> Silakan pilih Jenis Presensi <strong>'Dinas Luar'</strong> di bagian atas dan isi keterangan penugasan wajib.
                </p>
              </div>
            )}

            {dutyType === 'Dinas Luar' && (
              <div className="bg-blue-50 border-2 border-blue-300 p-3.5 rounded-xl text-blue-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-blue-800">
                  <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>MODE PRESENSI DINAS LUAR AKTIF</span>
                </div>
                <p className="text-[11px] text-blue-700 leading-snug">
                  Presensi dapat dikirim dari luar radius lokasi kelas. Pastikan Anda telah mengisikan <strong>Keterangan / Surat Tugas / Alasan Dinas Luar</strong> pada kolom yang tersedia di atas.
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full font-black py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-2.5 text-base sm:text-lg transition-all active:scale-98 cursor-pointer ${
              dutyType === 'Dinas Luar'
                ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-900 text-white shadow-blue-900/30 border-2 border-blue-400/40'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-900/30 border-2 border-emerald-400/40'
            }`}
          >
            {dutyType === 'Dinas Luar' ? (
              <>
                <Briefcase className="w-6 h-6 text-amber-300 shrink-0" />
                <span>KIRIM PRESENSI DINAS LUAR</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-6 h-6 text-amber-300 shrink-0" />
                <span>KIRIM PRESENSI KEGIATAN TUTOR</span>
              </>
            )}
          </button>

        </div>

      </form>

      {/* Riwayat Presensi Mandiri Saya (Portal Tutor) */}
      {currentUser?.role === 'tutor' && (() => {
        const myRecords = allRecords.filter(r => r.tutorId === selectedTutorId || r.tutorName === selectedTutorObj?.name);
        return (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Riwayat Presensi Mandiri Saya</h3>
                  <p className="text-xs text-slate-500">Daftar presensi kegiatan yang telah Anda kirimkan ke sistem</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                {myRecords.length} Kegiatan Terdaftar
              </span>
            </div>

            {myRecords.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-500 text-sm font-medium">Belum ada catatan presensi mandiri.</p>
                <p className="text-xs text-slate-400 mt-1">Silakan isi formulir di atas untuk melakukan presensi kegiatan hari ini.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myRecords.slice(0, 6).map((rec) => (
                  <div key={rec.id} className="p-4 bg-slate-50 hover:bg-emerald-50/50 rounded-xl border border-slate-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {rec.photoUrl ? (
                        <img src={rec.photoUrl} alt="Foto Presensi" className="w-14 h-14 rounded-lg object-cover border border-slate-300 shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0">
                          Foto
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">{rec.program}</span>
                          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            {rec.subjectTitle}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          <strong>Tanggal:</strong> {rec.date} • <strong>Waktu:</strong> {rec.timeStart} - {rec.timeEnd} WIB
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Pos: {rec.classGroup} • Total WB: {rec.studentCount} Orang
                        </p>
                      </div>
                    </div>
                    <div className="text-right sm:self-center shrink-0">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                        rec.status === 'Hadir Valid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {rec.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Modal Update Profil & Foto Tutor */}
      {selectedTutorObj && (
        <TutorProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          tutor={selectedTutorObj}
          onProfileUpdated={(updatedTutor) => {
            onTutorUpdated?.(updatedTutor);
          }}
          isModal={true}
        />
      )}
    </div>
  );
};

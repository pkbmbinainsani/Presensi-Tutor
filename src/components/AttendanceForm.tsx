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
  Check,
  Eye,
  AlertTriangle,
  SwitchCamera,
  X,
  Smartphone,
  Monitor,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Tutor, ProgramType, GeoLocationData, AttendanceRecord, UserSession, ClassLocation } from '../types';
import { PKBM_CONFIG, INITIAL_CLASS_LOCATIONS } from '../data/mockData';
import { calculateDistanceMeters, saveAttendanceRecord } from '../lib/storage';
import { MapView } from './MapView';
import { TutorProfileModal } from './TutorProfileModal';
import { PhotoWatermarkModal } from './PhotoWatermarkModal';
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

const SUBJECT_PRESETS: string[] = [
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Ekonomi',
  'Geografi',
  'Informatika',
  'IPA',
  'IPS',
  'Matematika',
  'Pendidikan Pancasila',
  'Sejarah',
  'Sosiologi'
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

  // Camera & Photo State (Full View & Auto Portrait/Landscape Orientation)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraOrientation, setCameraOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [cameraResolution, setCameraResolution] = useState<{ width: number; height: number } | null>(null);
  const [photoOrientation, setPhotoOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [photoResolution, setPhotoResolution] = useState<{ width: number; height: number } | null>(null);
  const [isFullScreenCamera, setIsFullScreenCamera] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // GPS Location State
  const [geoLocation, setGeoLocation] = useState<GeoLocationData | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Status submission feedback & Refs
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedWatermarkRecord, setSelectedWatermarkRecord] = useState<AttendanceRecord | null>(null);
  const topAlertRef = useRef<HTMLDivElement>(null);

  // Tutor Today Attendance Tracking (Enforce 1x per day)
  const selectedTutorObj = tutors.find(t => t.id === selectedTutorId);
  const todayStr = getWibToday();
  const tutorTodayRecords = allRecords.filter(r => 
    (r.tutorId === selectedTutorId || (selectedTutorObj && r.tutorName === selectedTutorObj.name)) &&
    r.date === todayStr
  );
  const hasSubmittedToday = tutorTodayRecords.length > 0;
  const latestTodayRecord = tutorTodayRecords[0];

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

  // WebCam Handler (Front & Rear camera switcher with Full Sensor Angle & Auto Orientation)
  const updateCameraOrientationFromVideo = () => {
    if (!videoRef.current) return;
    const vw = videoRef.current.videoWidth || 0;
    const vh = videoRef.current.videoHeight || 0;
    if (vw > 0 && vh > 0) {
      const isPort = vh > vw;
      setCameraOrientation(isPort ? 'portrait' : 'landscape');
      setCameraResolution({ width: vw, height: vh });
    }
  };

  const startCamera = async (mode: 'environment' | 'user' = cameraFacingMode) => {
    setIsCameraActive(true);
    setCameraError(null);

    // Stop previous stream tracks if any
    if (videoRef.current && videoRef.current.srcObject) {
      const currentStream = videoRef.current.srcObject as MediaStream;
      currentStream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    try {
      // Request highest full sensor resolution without restrictive aspect ratio so wide-angle is fully captured
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: mode }, 
          width: { ideal: 1920, max: 3840 }, 
          height: { ideal: 1080, max: 2160 } 
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          updateCameraOrientationFromVideo();
        };
      }
    } catch (err) {
      console.warn("Camera with facingMode failed, attempting fallback:", err);
      // Fallback to any available video camera
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.onloadedmetadata = () => {
            updateCameraOrientationFromVideo();
          };
        }
      } catch (fallbackErr) {
        console.warn("Camera fallback error:", fallbackErr);
        setCameraError("Kamera tidak dapat diakses atau izin ditolak. Silakan berikan izin akses kamera pada browser atau gunakan opsi Unggah Galeri.");
        setIsCameraActive(false);
      }
    }
  };

  // Re-check orientation when device orientation or window resize occurs
  useEffect(() => {
    const handleDeviceOrientationChange = () => {
      if (isCameraActive && videoRef.current) {
        updateCameraOrientationFromVideo();
      }
    };
    window.addEventListener('resize', handleDeviceOrientationChange);
    window.addEventListener('orientationchange', handleDeviceOrientationChange);
    return () => {
      window.removeEventListener('resize', handleDeviceOrientationChange);
      window.removeEventListener('orientationchange', handleDeviceOrientationChange);
    };
  }, [isCameraActive]);

  const toggleCameraFacingMode = async () => {
    if (isSwitchingCamera) return;
    setIsSwitchingCamera(true);
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextMode);

    if (isCameraActive) {
      await startCamera(nextMode);
    }
    setIsSwitchingCamera(false);
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsFullScreenCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const vw = videoRef.current.videoWidth || 1280;
    const vh = videoRef.current.videoHeight || 720;
    const isPort = vh > vw;

    const canvas = document.createElement('canvas');
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 1. Draw raw camera frame (mirror if front camera)
      if (cameraFacingMode === 'user') {
        ctx.translate(vw, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoRef.current, 0, 0, vw, vh);

      // Reset transformation matrix for watermark stamp
      if (cameraFacingMode === 'user') {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      // 2. High-resolution stamped watermark matching orientation
      const scale = vw / 1000;
      const bannerHeight = isPort ? Math.round(180 * scale) : Math.round(135 * scale);

      // Dark gradient banner at the bottom
      const gradient = ctx.createLinearGradient(0, vh - bannerHeight - 40, 0, vh);
      gradient.addColorStop(0, 'rgba(2, 6, 23, 0)');
      gradient.addColorStop(0.25, 'rgba(2, 6, 23, 0.82)');
      gradient.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, vh - bannerHeight - 40, vw, bannerHeight + 40);

      // Emerald accent indicator
      const paddingLeft = Math.round(24 * scale);
      ctx.fillStyle = '#10b981'; // emerald-500
      ctx.fillRect(paddingLeft, vh - bannerHeight + Math.round(12 * scale), Math.round(6 * scale), bannerHeight - Math.round(30 * scale));

      const textX = paddingLeft + Math.round(18 * scale);

      if (isPort) {
        // --- PORTRAIT ORIENTATION WATERMARK (Stacked Lines) ---
        ctx.fillStyle = '#34d399'; // emerald-400
        ctx.font = `bold ${Math.round(18 * scale)}px sans-serif`;
        ctx.fillText('PKBM BINA INSANI SUMOWONO • VERIFIED GPS', textX, vh - bannerHeight + Math.round(32 * scale));

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(22 * scale)}px sans-serif`;
        const tutorTitle = `${selectedTutorObj?.name || 'Tutor'} • ${program || 'Pendidikan Kesetaraan'}`;
        ctx.fillText(tutorTitle, textX, vh - bannerHeight + Math.round(64 * scale));

        ctx.fillStyle = '#cbd5e1'; // slate-300
        ctx.font = `600 ${Math.round(16 * scale)}px sans-serif`;
        const mapelText = `${subjectTitle || 'Kegiatan Pembelajaran'} • ${classGroup || 'Kelompok Belajar'}`;
        ctx.fillText(mapelText, textX, vh - bannerHeight + Math.round(94 * scale));

        const currentTimeWib = getWibTimeWithSuffix(new Date(), false);

        ctx.fillStyle = '#fbbf24'; // amber-400
        ctx.font = `bold ${Math.round(15 * scale)}px sans-serif`;
        const timeStr = `📅 ${formatWibDateIndo(date, 'withDay')} • ⏰ ${currentTimeWib} WIB`;
        ctx.fillText(timeStr, textX, vh - bannerHeight + Math.round(122 * scale));

        ctx.fillStyle = '#93c5fd'; // blue-300
        ctx.font = `${Math.round(13.5 * scale)}px monospace`;
        const gpsStr = `📍 Lat: ${geoLocation ? geoLocation.latitude.toFixed(5) : '-'}, Lng: ${geoLocation ? geoLocation.longitude.toFixed(5) : '-'} (±${geoLocation?.accuracy || 0}m) • ${geoLocation?.isWithinRadius ? 'Radius Valid' : dutyType === 'Dinas Luar' ? 'Dinas Luar' : 'Luar Radius'}`;
        ctx.fillText(gpsStr, textX, vh - bannerHeight + Math.round(148 * scale));
      } else {
        // --- LANDSCAPE ORIENTATION WATERMARK (Two Columns) ---
        const currentTimeWib = getWibTimeWithSuffix(new Date(), false);

        // Left Column
        ctx.fillStyle = '#34d399';
        ctx.font = `bold ${Math.round(17 * scale)}px sans-serif`;
        ctx.fillText('PKBM BINA INSANI SUMOWONO • VERIFIED GPS', textX, vh - bannerHeight + Math.round(32 * scale));

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(22 * scale)}px sans-serif`;
        const tutorTitle = `${selectedTutorObj?.name || 'Tutor'} • ${program || 'Pendidikan Kesetaraan'}`;
        ctx.fillText(tutorTitle, textX, vh - bannerHeight + Math.round(65 * scale));

        ctx.fillStyle = '#cbd5e1';
        ctx.font = `600 ${Math.round(16 * scale)}px sans-serif`;
        const mapelText = `${subjectTitle || 'Kegiatan Pembelajaran'} • ${classGroup || 'Kelompok Belajar'}`;
        ctx.fillText(mapelText, textX, vh - bannerHeight + Math.round(96 * scale));

        // Right Column
        const rightColX = Math.round(vw * 0.54);
        ctx.fillStyle = '#fbbf24';
        ctx.font = `bold ${Math.round(16 * scale)}px sans-serif`;
        const timeStr = `📅 ${formatWibDateIndo(date, 'short')} • ⏰ ${currentTimeWib} WIB`;
        ctx.fillText(timeStr, rightColX, vh - bannerHeight + Math.round(40 * scale));

        ctx.fillStyle = '#93c5fd';
        ctx.font = `${Math.round(13.5 * scale)}px monospace`;
        const gpsStr = `📍 Lat: ${geoLocation?.latitude.toFixed(5) || '-'}, Lng: ${geoLocation?.longitude.toFixed(5) || '-'} (±${geoLocation?.accuracy || 0}m)`;
        ctx.fillText(gpsStr, rightColX, vh - bannerHeight + Math.round(68 * scale));

        ctx.fillStyle = '#a7f3d0';
        ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
        const locName = `🏢 ${geoLocation?.matchedLocationName || 'Titik PKBM'} • ${geoLocation?.isWithinRadius ? 'Radius Sesuai' : dutyType === 'Dinas Luar' ? 'Dinas Luar' : 'Luar Radius'}`;
        ctx.fillText(locName, rightColX, vh - bannerHeight + Math.round(96 * scale));
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
      setPhotoDataUrl(dataUrl);
      setPhotoOrientation(isPort ? 'portrait' : 'landscape');
      setPhotoResolution({ width: vw, height: vh });
    }
    stopCamera();
    setIsFullScreenCamera(false);
  };

  // File Upload Handler with Auto Dimension & Orientation Detection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth || 800;
          const h = img.naturalHeight || 600;
          const isPort = h > w;
          setPhotoOrientation(isPort ? 'portrait' : 'landscape');
          setPhotoResolution({ width: w, height: h });
        };
        img.src = result;
        setPhotoDataUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Enforce 1x daily attendance restriction per tutor
    if (hasSubmittedToday) {
      setFormError(`⛔ Presensi Dibatasi: Dalam sehari Tutor hanya bisa melakukan presensi sebanyak satu kali. Kegiatan ${selectedTutorObj?.name || 'Anda'} hari ini (${formatWibDateIndo(todayStr, 'long')}) telah dicatat dalam sistem.`);
      topAlertRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      <div ref={topAlertRef} />

      {/* Tutor Already Completed Attendance Banner Notification (1x per Day Enforcement) */}
      {currentUser?.role === 'tutor' && hasSubmittedToday && latestTodayRecord && (
        <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white p-5 rounded-3xl shadow-xl border-2 border-emerald-400/60 relative overflow-hidden space-y-4 animate-in fade-in zoom-in duration-300">
          <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-emerald-500/25 rounded-2xl border border-emerald-400/40 text-amber-300 shrink-0 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    PRESENSI HARI INI TERCATAT (1X SEHARI)
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-200">
                    {latestTodayRecord.timeStart} WIB
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white mt-1">
                  Terimakasih, kegiatan anda hari ini telah dicatat dalam sistem
                </h3>
                <p className="text-xs text-emerald-100/90 mt-0.5 leading-relaxed">
                  Laporan presensi & jurnal mengajar untuk <strong className="text-amber-300">{selectedTutorObj?.name}</strong> pada hari ini (<strong className="text-white">{formatWibDateIndo(latestTodayRecord.date, 'long')}</strong>) telah tersimpan di sistem. Sesuai aturan, dalam sehari tutor hanya bisa melakukan presensi sebanyak satu kali.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {latestTodayRecord.photoUrl && (
                <button
                  type="button"
                  onClick={() => setSelectedWatermarkRecord(latestTodayRecord)}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-400/40 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Lihat Bukti Foto & Watermark Resmi"
                >
                  <Eye className="w-4 h-4 text-amber-300" />
                  <span>Foto Watermark</span>
                </button>
              )}
              <span className="px-3.5 py-2 rounded-xl text-xs font-black bg-white/10 text-emerald-200 border border-white/20 shadow-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                1x Sehari Terpenuhi
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
                {selectedTutorObj && hasSubmittedToday && latestTodayRecord && (
                  <div className="mt-2.5 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold">Perhatian (Presensi Dibatasi 1x Sehari):</span>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Tutor <strong>{selectedTutorObj.name}</strong> sudah melakukan presensi hari ini pada pukul <strong>{latestTodayRecord.timeStart} WIB</strong> ({latestTodayRecord.subjectTitle}).
                        </p>
                      </div>
                    </div>
                    {latestTodayRecord.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setSelectedWatermarkRecord(latestTodayRecord)}
                        className="px-2.5 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 font-black text-[10px] rounded-lg border border-amber-400 shrink-0 flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-900" />
                        <span>Lihat Foto</span>
                      </button>
                    )}
                  </div>
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
                list="subject-presets-list"
                value={subjectTitle}
                onChange={(e) => setSubjectTitle(e.target.value)}
                placeholder="Pilih dari preset di bawah atau ketik nama mata pelajaran"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all shadow-inner"
              />
              <datalist id="subject-presets-list">
                {SUBJECT_PRESETS.map((sub) => (
                  <option key={sub} value={sub} />
                ))}
              </datalist>
              {/* Quick Subject Suggestion Chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SUBJECT_PRESETS.map((sub) => (
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
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-dashed border-slate-300 min-h-[220px] flex flex-col items-center justify-center text-center p-3">
              {isCameraActive ? (
                <div className={`${
                  isFullScreenCamera 
                    ? 'fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200' 
                    : 'relative w-full bg-slate-950 flex flex-col items-center justify-center rounded-2xl overflow-hidden shadow-inner min-h-[320px] max-h-[75vh]'
                }`}>
                  {/* Video Viewfinder - object-contain ensures ZERO cropping so full wide-angle sensor view is captured */}
                  <div className="relative w-full h-full flex-1 flex items-center justify-center overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      onLoadedMetadata={updateCameraOrientationFromVideo}
                      onCanPlay={updateCameraOrientationFromVideo}
                      className={`max-w-full max-h-full object-contain rounded-xl transition-all duration-300 ${
                        cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''
                      }`}
                    />
                  </div>

                  {/* Top Bar inside Camera View: Mode Indicator, Orientation & Controls */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-30 pointer-events-none gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 pointer-events-auto flex-wrap">
                      <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black bg-slate-950/85 text-white backdrop-blur border border-white/25 flex items-center gap-1.5 shadow-md">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                        <span>{cameraFacingMode === 'environment' ? '📷 Kamera Belakang' : '🤳 Kamera Depan (Selfie)'}</span>
                      </span>

                      {/* Orientation Indicator */}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black backdrop-blur border flex items-center gap-1 shadow-md ${
                        cameraOrientation === 'landscape'
                          ? 'bg-amber-950/85 text-amber-300 border-amber-400/50'
                          : 'bg-blue-950/85 text-blue-300 border-blue-400/50'
                      }`}>
                        {cameraOrientation === 'landscape' ? (
                          <>
                            <Monitor className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            <span>Mode Lanskap (Luas) {cameraResolution ? `• ${cameraResolution.width}×${cameraResolution.height}` : ''}</span>
                          </>
                        ) : (
                          <>
                            <Smartphone className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                            <span>Mode Potret (Tegak) {cameraResolution ? `• ${cameraResolution.width}×${cameraResolution.height}` : ''}</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pointer-events-auto">
                      {/* Toggle Full Screen Camera */}
                      <button
                        type="button"
                        onClick={() => setIsFullScreenCamera(!isFullScreenCamera)}
                        title={isFullScreenCamera ? "Kecilkan Kamera" : "Mode Layar Penuh Kamera Luas"}
                        className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-900 active:scale-95 text-white backdrop-blur border border-slate-600 shadow-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        {isFullScreenCamera ? (
                          <>
                            <Minimize2 className="w-4 h-4 text-slate-200" />
                            <span className="hidden sm:inline">Kecilkan</span>
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-4 h-4 text-emerald-300" />
                            <span className="hidden sm:inline">Layar Penuh</span>
                          </>
                        )}
                      </button>

                      {/* Switch Camera Button */}
                      <button
                        type="button"
                        onClick={toggleCameraFacingMode}
                        disabled={isSwitchingCamera}
                        title="Ubah Mode Kamera Depan / Belakang"
                        className="px-2.5 py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-900 active:scale-95 text-white backdrop-blur border border-amber-400 shadow-md text-xs font-black flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <SwitchCamera className={`w-4 h-4 text-amber-300 ${isSwitchingCamera ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">{cameraFacingMode === 'environment' ? 'Kamera Depan' : 'Kamera Belakang'}</span>
                      </button>

                      {/* Close Camera Button */}
                      <button
                        type="button"
                        onClick={stopCamera}
                        title="Tutup Kamera"
                        className="p-1.5 rounded-full bg-slate-950/85 hover:bg-rose-950 text-white backdrop-blur border border-rose-400/50 transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4 text-rose-300" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Action Bar: Shutter & Guide */}
                  <div className="absolute bottom-3 left-0 right-0 px-4 flex flex-col items-center justify-center gap-1.5 z-30">
                    <p className="text-[10px] text-slate-300 bg-slate-950/70 backdrop-blur px-3 py-1 rounded-full border border-white/15">
                      💡 Putar HP untuk beralih otomatis antara mode Potret (Tegak) &amp; Lanskap (Pemandangan Luas)
                    </p>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm px-6 py-2.5 sm:py-3 rounded-full shadow-2xl border-2 border-white flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-amber-300" />
                      <span>Ambil Foto Full ({cameraOrientation === 'landscape' ? 'Lanskap' : 'Potret'})</span>
                    </button>
                  </div>
                </div>
              ) : photoDataUrl ? (
                <div className="relative w-full group flex flex-col items-center justify-center bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
                  <img
                    src={photoDataUrl}
                    alt="Bukti Presensi Kegiatan"
                    className="w-auto max-w-full max-h-[380px] object-contain rounded-xl shadow-lg transition-all"
                  />
                  
                  {/* Top Bar on Preview: Orientation Tag & Action buttons */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    <span className={`pointer-events-auto px-2.5 py-1 rounded-full text-[10px] font-black border backdrop-blur-md flex items-center gap-1 shadow-md ${
                      photoOrientation === 'landscape'
                        ? 'bg-amber-950/90 text-amber-300 border-amber-400/50'
                        : 'bg-blue-950/90 text-blue-300 border-blue-400/50'
                    }`}>
                      {photoOrientation === 'landscape' ? (
                        <>
                          <Monitor className="w-3 h-3 text-amber-300" />
                          <span>Lanskap Luas {photoResolution ? `• ${photoResolution.width}×${photoResolution.height}` : ''}</span>
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-3 h-3 text-blue-300" />
                          <span>Potret Tegak {photoResolution ? `• ${photoResolution.width}×${photoResolution.height}` : ''}</span>
                        </>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => setPhotoDataUrl(null)}
                      className="pointer-events-auto bg-rose-600/90 hover:bg-rose-700 text-white text-[11px] font-black px-3 py-1 rounded-xl shadow-lg transition-all cursor-pointer border border-rose-400/30"
                    >
                      Hapus / Ambil Ulang
                    </button>
                  </div>

                  {/* Stamped Watermark Badge on Preview */}
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur-md text-white p-2.5 rounded-xl text-[10px] text-left border border-white/20 shadow-lg">
                    <p className="font-black text-emerald-400">PKBM BINA INSANI SUMOWONO</p>
                    <p className="truncate font-semibold text-slate-200">{selectedTutorObj?.name || 'Tutor'} • {program}</p>
                    <p className="text-amber-300 font-bold">{formatWibDateIndo(date, 'short')} • Real-time GPS Watermark</p>
                  </div>
                </div>
              ) : (
                <div className="py-6 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">Lampirkan Foto Kegiatan Pembelajaran</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">Mendukung kamera belakang, kamera depan (selfie), & galeri</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => startCamera(cameraFacingMode)}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-amber-300" />
                      <span>Buka Kamera ({cameraFacingMode === 'environment' ? 'Belakang' : 'Depan'})</span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleCameraFacingMode}
                      title="Ganti Mode Kamera Sebelum Membuka"
                      className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <SwitchCamera className="w-4 h-4 text-amber-400" />
                      <span>{cameraFacingMode === 'environment' ? 'Mode: Belakang' : 'Mode: Depan'}</span>
                    </button>

                    <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-xl cursor-pointer border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>Galeri</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture={cameraFacingMode}
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

          {/* Submit Button or 1x Attendance Enforced Message */}
          {hasSubmittedToday ? (
            <div className="w-full p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 flex flex-col sm:flex-row items-center justify-between gap-4 text-emerald-950 shadow-md animate-in fade-in duration-300">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-emerald-700 text-white rounded-2xl shrink-0 shadow-sm">
                  <CheckCircle2 className="w-7 h-7 text-amber-300" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-emerald-950">
                    Terimakasih, kegiatan anda hari ini telah dicatat dalam sistem
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                    Dalam sehari Tutor hanya bisa melakukan presensi sebanyak satu kali. Presensi kegiatan {selectedTutorObj?.name || 'Anda'} hari ini telah tersimpan pada pukul <strong>{latestTodayRecord?.timeStart} WIB</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {latestTodayRecord?.photoUrl && (
                  <button
                    type="button"
                    onClick={() => setSelectedWatermarkRecord(latestTodayRecord)}
                    className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl shadow flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-amber-300" />
                    <span>Lihat Foto Watermark</span>
                  </button>
                )}
                <span className="px-3.5 py-2.5 bg-white text-emerald-900 font-black text-xs rounded-xl border border-emerald-300 shadow-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Presensi Selesai
                </span>
              </div>
            </div>
          ) : (
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
          )}

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
                    <div className="flex items-center gap-2 text-right sm:self-center shrink-0">
                      {rec.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setSelectedWatermarkRecord(rec)}
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-white hover:bg-emerald-100 rounded-lg border border-emerald-300 flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                          title="Lihat Foto Berwatermark Resmi"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Watermark</span>
                        </button>
                      )}
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

      {/* Modal Watermark Foto Presensi */}
      {selectedWatermarkRecord && (
        <PhotoWatermarkModal
          record={selectedWatermarkRecord}
          onClose={() => setSelectedWatermarkRecord(null)}
        />
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Camera, 
  Upload, 
  Trash2, 
  Lock, 
  Phone, 
  BookOpen, 
  Check, 
  AlertCircle, 
  X, 
  RefreshCw, 
  ShieldCheck, 
  GraduationCap,
  Sparkles,
  Eye,
  EyeOff,
  SwitchCamera
} from 'lucide-react';
import { Tutor } from '../types';
import { saveTutor } from '../lib/storage';
import { compressProfileImage } from '../lib/imageUtils';

interface TutorProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutor: Tutor;
  onProfileUpdated: (updatedTutor: Tutor) => void;
  isModal?: boolean; // if false, renders as full in-page view
}

export const TutorProfileModal: React.FC<TutorProfileModalProps> = ({
  isOpen,
  onClose,
  tutor,
  onProfileUpdated,
  isModal = true,
}) => {
  const [name, setName] = useState<string>(tutor.name || '');
  const [phone, setPhone] = useState<string>(tutor.phone || '');
  const [specialization, setSpecialization] = useState<string>(tutor.specialization || '');
  const [position, setPosition] = useState<string>(tutor.position || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(tutor.avatarUrl || '');
  const [pin, setPin] = useState<string>(tutor.pin || '1234');
  const [confirmPin, setConfirmPin] = useState<string>(tutor.pin || '1234');
  const [showPin, setShowPin] = useState<boolean>(false);

  // Status & notifications
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Camera Mode (Front / Rear switch)
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state if tutor prop changes
  useEffect(() => {
    setName(tutor.name || '');
    setPhone(tutor.phone || '');
    setSpecialization(tutor.specialization || '');
    setPosition(tutor.position || '');
    setAvatarUrl(tutor.avatarUrl || '');
    setPin(tutor.pin || '1234');
    setConfirmPin(tutor.pin || '1234');
    setSuccessMsg(null);
    setErrorMsg(null);
  }, [tutor]);

  // Clean up camera on unmount or close
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    try {
      const compressedDataUrl = await compressProfileImage(file, 380, 0.88);
      setAvatarUrl(compressedDataUrl);
      setSuccessMsg('Foto profil baru berhasil diunggah! Jangan lupa klik "Simpan Perubahan".');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal memproses berkas gambar');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const startCamera = async (mode: 'user' | 'environment' = cameraFacingMode) => {
    setCameraError(null);
    setIsCameraActive(true);

    if (videoRef.current && videoRef.current.srcObject) {
      const s = videoRef.current.srcObject as MediaStream;
      s.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: mode },
          width: { ideal: 640 }, 
          height: { ideal: 640 } 
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera note:', err);
      // Fallback
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (fallbackErr) {
        setCameraError('Kamera tidak dapat diakses atau izin ditolak. Silakan gunakan tombol Pilih Foto.');
        setIsCameraActive(false);
      }
    }
  };

  const toggleCameraFacingMode = async () => {
    const nextMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(nextMode);
    if (isCameraActive) {
      await startCamera(nextMode);
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

  const captureSelfie = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    const size = Math.min(videoRef.current.videoWidth || 480, videoRef.current.videoHeight || 480);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Center crop square
      const sx = ((videoRef.current.videoWidth || size) - size) / 2;
      const sy = ((videoRef.current.videoHeight || size) - size) / 2;
      if (cameraFacingMode === 'user') {
        // Mirror horizontally for front selfie
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoRef.current, sx, sy, size, size, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setAvatarUrl(dataUrl);
      setSuccessMsg('Foto profil berhasil diambil! Jangan lupa klik "Simpan Perubahan".');
      setTimeout(() => setSuccessMsg(null), 4000);
    }
    stopCamera();
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    setSuccessMsg('Foto profil dihapus. Sistem akan menggunakan inisial nama Anda.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('Nama lengkap tidak boleh kosong.');
      return;
    }

    if (pin && pin !== confirmPin) {
      setErrorMsg('Konfirmasi PIN baru tidak sesuai.');
      return;
    }

    if (pin && pin.trim().length < 4) {
      setErrorMsg('PIN minimal harus 4 digit karakter/angka.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedTutor: Tutor = {
        ...tutor,
        name: name.trim(),
        phone: phone.trim(),
        specialization: specialization.trim(),
        position: position.trim() || tutor.position,
        avatarUrl: avatarUrl.trim() || undefined,
        pin: pin.trim() || '1234',
      };

      // Save to local storage and push to Supabase
      saveTutor(updatedTutor);
      onProfileUpdated(updatedTutor);

      setSuccessMsg('Profil dan foto berhasil diperbarui secara online!');
      setTimeout(() => {
        setSuccessMsg(null);
        if (isModal) {
          onClose();
        }
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan perubahan profil.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isModal && !isOpen) return null;

  const content = (
    <div className="space-y-6">
      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-700 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between text-xs sm:text-sm font-bold border border-emerald-500 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <Check className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-200 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between text-xs sm:text-sm font-bold border border-rose-400 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-200 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-200 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Profile Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-400 text-slate-950 rounded-2xl font-black shadow-lg">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg sm:text-xl text-white">Profil Tutor &amp; Tenaga Pendidik</h3>
                <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase">
                  {tutor.roleType || 'Tutor'}
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Kelola foto identitas, nomor kontak, spesialisasi mengajar, dan keamanan PIN login Anda.
              </p>
            </div>
          </div>

          {isModal && (
            <button
              onClick={onClose}
              className="self-end sm:self-center p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Profile Content Body */}
        <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
          
          {/* Section 1: Photo Profile (Avatar) */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-5 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              
              {/* Avatar Preview */}
              <div className="relative group">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-700 p-1 shadow-xl shadow-blue-900/20 border-2 border-amber-400 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={name} 
                      className="w-full h-full object-cover rounded-[22px]"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white font-black text-3xl bg-gradient-to-br from-blue-700 to-slate-900 rounded-[22px]">
                      <span>{name ? name.charAt(0).toUpperCase() : 'T'}</span>
                      <span className="text-[10px] font-medium text-blue-200 mt-1">Belum Ada Foto</span>
                    </div>
                  )}
                </div>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute -top-2 -right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-lg border-2 border-white transition transform hover:scale-110"
                    title="Hapus Foto Profil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Photo Actions & Info */}
              <div className="flex-1 text-center sm:text-left space-y-2.5">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">Foto Profil Mandiri</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Foto profil akan tampil di Halaman Login, Kartu Presensi Jurnal Mengajar, dan Data Resmi Lembaga PKBM Bina Insani.
                  </p>
                </div>

                {/* Photo Action Buttons */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  {/* Upload button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
                  >
                    <Upload className="w-4 h-4 text-amber-300" />
                    <span>Pilih Foto dari Galeri / Berkas</span>
                  </button>

                  {/* Camera button */}
                  <button
                    type="button"
                    onClick={isCameraActive ? stopCamera : startCamera}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>{isCameraActive ? 'Tutup Kamera' : 'Ambil Foto Selfie'}</span>
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Foto</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 font-medium">
                  Format didukung: JPG, PNG, WebP (otomatis dioptimasi &amp; dikompresi hemat kuota).
                </p>
              </div>

            </div>

            {/* Live Camera Feed */}
            {isCameraActive && (
              <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-3 animate-in fade-in duration-200 border-2 border-emerald-400/60">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-extrabold text-xs text-emerald-300">
                      {cameraFacingMode === 'user' ? '📷 Kamera Depan (Selfie)' : '📷 Kamera Belakang'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleCameraFacingMode}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-400/40 flex items-center gap-1 transition"
                    >
                      <SwitchCamera className="w-3.5 h-3.5" />
                      <span>{cameraFacingMode === 'user' ? 'Ganti ke Kamera Belakang' : 'Ganti ke Kamera Depan'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="text-xs text-slate-400 hover:text-white font-bold"
                    >
                      Tutup
                    </button>
                  </div>
                </div>

                <div className="relative max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden bg-black border-2 border-white/20 shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transition duration-300 ${
                      cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''
                    }`}
                  />
                  <div className="absolute inset-0 border-2 border-white/30 rounded-full m-8 pointer-events-none border-dashed" />
                </div>

                {cameraError && (
                  <p className="text-xs text-rose-400 text-center font-bold">{cameraError}</p>
                )}

                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={captureSelfie}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-sm rounded-2xl shadow-xl flex items-center gap-2 transform active:scale-95 transition"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Ambil &amp; Pasang Foto Ini</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Personal & Teaching Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Nama Lengkap */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Lengkap &amp; Gelar <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="misal: Tri Wahyuni, S.Pd."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Kode NIP / ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kode NIP / Nomor Identitas Pegawai
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value={tutor.nipCode}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-500 cursor-not-allowed"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                  Terdaftar
                </span>
              </div>
            </div>

            {/* Nomor HP / WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nomor Handphone / WhatsApp
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4 text-emerald-600" />
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="misal: 081234567890"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>

            {/* Spesialisasi / Mata Pelajaran */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Spesialisasi / Mata Pelajaran / Tugas
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="misal: Matematika Kesetaraan / Bahasa Indonesia"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>

            {/* Jabatan Kerja */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Jabatan / Posisi Kerja di PKBM
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="misal: Tutor Pendidik Kesetaraan Paket C"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>

          </div>

          {/* Section 3: Keamanan & PIN Login */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <Lock className="w-4 h-4 text-amber-600" />
                <h4 className="font-extrabold text-xs uppercase tracking-wider">Pengaturan PIN Login Portal</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-slate-500 hover:text-slate-800 text-xs font-bold flex items-center gap-1"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPin ? 'Sembunyikan' : 'Tampilkan'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              PIN digunakan saat login presensi mandiri tutor (default awal: <strong>1234</strong>). Anda dapat menggantinya demi keamanan akun Anda.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  PIN Baru (4-6 Angka / Karakter)
                </label>
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Masukkan PIN baru"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Ulangi Konfirmasi PIN Baru
                </label>
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Ulangi PIN baru"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            {isModal && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-700/30 flex items-center gap-2 transition transform active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Supabase...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Simpan Perubahan Profil</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-2xl w-full my-8 animate-in fade-in zoom-in-95 duration-200">
        {content}
      </div>
    </div>
  );
};

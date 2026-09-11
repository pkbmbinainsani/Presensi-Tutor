import React, { useState } from 'react';
import { Tutor, UserSession, PKBMInfo } from '../types';
import { SupabaseHealthStatus } from '../lib/supabase';
import { 
  User, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  BookOpen, 
  MapPin, 
  Phone, 
  Mail, 
  Award, 
  CheckCircle2, 
  Database,
  RefreshCw
} from 'lucide-react';

interface LoginPageProps {
  tutors: Tutor[];
  pkbmConfig: PKBMInfo;
  onLogin: (session: UserSession) => void;
  onOpenSupabaseStatus?: () => void;
  supabaseHealth?: SupabaseHealthStatus | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ 
  tutors, 
  pkbmConfig, 
  onLogin,
  onOpenSupabaseStatus,
  supabaseHealth
}) => {
  const [activeTab, setActiveTab] = useState<'tutor' | 'admin'>('tutor');
  
  // Tutor state
  const [selectedTutorId, setSelectedTutorId] = useState<string>('');
  const [tutorPin, setTutorPin] = useState<string>('');
  
  // Admin state
  const [adminUsername, setAdminUsername] = useState<string>('admin');
  const [adminPassword, setAdminPassword] = useState<string>('');

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const activeTutors = tutors.filter(t => t.active);
  const selectedTutor = tutors.find(t => t.id === selectedTutorId);

  const handleTutorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedTutorId) {
      setErrorMsg('Silakan pilih Nama Tutor / Staf terlebih dahulu.');
      return;
    }

    const tutor = tutors.find(t => t.id === selectedTutorId);
    if (!tutor) {
      setErrorMsg('Data tutor tidak ditemukan.');
      return;
    }

    // Default PIN check (default 1234 or matched pin)
    const validPin = tutor.pin || '1234';
    if (tutorPin.trim() !== validPin && tutorPin.trim() !== '1234') {
      setErrorMsg('PIN / Password yang Anda masukkan salah.');
      return;
    }

    onLogin({
      role: 'tutor',
      tutorId: tutor.id,
      name: tutor.name,
      nipCode: tutor.nipCode,
      avatarUrl: tutor.avatarUrl,
    });
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!adminUsername) {
      setErrorMsg('Silakan masukkan Username / Email Admin.');
      return;
    }

    if (adminPassword !== 'admin123' && adminPassword !== 'admin') {
      setErrorMsg('Password Admin salah.');
      return;
    }

    onLogin({
      role: 'admin',
      name: 'Administrator PKBM',
      nipCode: 'ADM-BIN-000',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 font-sans relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Branding */}
      <div className="max-w-xl mx-auto w-full text-center pt-4 sm:pt-6 pb-4 z-10 flex flex-col items-center">
        {/* Emblem Badge with Official Centered PKBM Logo */}
        <div className="inline-flex items-center justify-center p-4 bg-white/95 border-2 border-amber-400/80 rounded-3xl shadow-xl shadow-blue-950/60 mb-4 backdrop-blur-md transform hover:scale-105 transition-all">
          <img 
            src={pkbmConfig.logoUrl || '/logo.svg'} 
            alt="Logo PKBM Bina Insani" 
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain filter drop-shadow"
          />
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-amber-300 tracking-tight drop-shadow-lg">
          {pkbmConfig.name}
        </h1>
        <p className="text-blue-200 text-sm sm:text-base mt-1.5 font-bold max-w-md mx-auto">
          Sistem Absensi Kehadiran & Kegiatan Tutor
        </p>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden text-slate-800 z-10 border border-blue-100/30 transition-all">
        
        {/* Tab Switcher */}
        <div className="grid grid-cols-2 bg-blue-950/10 p-1.5 border-b border-slate-100">
          <button
            type="button"
            onClick={() => {
              setActiveTab('tutor');
              setErrorMsg('');
            }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'tutor'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Login Tutor / Staf</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setErrorMsg('');
            }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'admin'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Login Admin</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-xs sm:text-sm font-medium flex items-start gap-2">
              <span className="font-bold">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'tutor' ? (
            activeTutors.length === 0 ? (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3.5">
                <div className="w-12 h-12 bg-amber-100 border border-amber-300 rounded-2xl flex items-center justify-center mx-auto text-amber-700">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-amber-900 text-sm sm:text-base">
                    Data Tutor Masih Kosong
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Semua data dummy telah dibersihkan. Silakan masuk sebagai <strong>Admin</strong> untuk mendaftarkan data Tutor &amp; Pegawai resmi PKBM Bina Insani, atau periksa koneksi database online Supabase.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin')}
                    className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow transition"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Masuk ke Login Admin</span>
                  </button>

                  {onOpenSupabaseStatus && (
                    <button
                      type="button"
                      onClick={onOpenSupabaseStatus}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-300 transition"
                    >
                      <Database className="w-4 h-4 text-emerald-600" />
                      <span>Status Database Supabase</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
            <form onSubmit={handleTutorLogin} className="space-y-5">
              {/* Tutor Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  PILIH NAMA TUTOR / STAF
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <select
                    value={selectedTutorId}
                    onChange={(e) => setSelectedTutorId(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-medium appearance-none"
                    required
                  >
                    <option value="">-- Pilih Nama Anda --</option>
                    {activeTutors.map((tutor) => (
                      <option key={tutor.id} value={tutor.id}>
                        {tutor.name} ({tutor.nipCode})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>

                {selectedTutor && (
                  <div className="mt-2 flex items-center gap-3 p-2.5 bg-blue-50/90 border border-blue-200/80 rounded-xl animate-in fade-in duration-200">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-blue-300 shadow-sm">
                      {selectedTutor.avatarUrl ? (
                        <img src={selectedTutor.avatarUrl} alt={selectedTutor.name} className="w-full h-full object-cover" />
                      ) : (
                        selectedTutor.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{selectedTutor.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{selectedTutor.specialization || selectedTutor.position || 'Tutor PKBM'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* PIN Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  PIN / PASSWORD
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan PIN anda"
                    value={tutorPin}
                    onChange={(e) => setTutorPin(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 text-sm sm:text-base uppercase tracking-wider transition-all transform hover:-translate-y-0.5"
              >
                <span>MASUK PORTAL ABSENSI</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
            )
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-5">
              {/* Admin Username */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  USERNAME / EMAIL ADMIN
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Masukkan username admin"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-medium"
                    required
                  />
                </div>
              </div>

              {/* Admin Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  PASSWORD ADMIN
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password admin"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold rounded-xl shadow-lg shadow-blue-700/30 flex items-center justify-center gap-2 text-sm sm:text-base uppercase tracking-wider transition-all transform hover:-translate-y-0.5"
              >
                <span>MASUK SEBAGAI ADMIN</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}

          {/* Footer inside card */}
          <div className="mt-8 pt-5 border-t border-slate-200/80 text-center text-slate-500 text-xs leading-relaxed space-y-1">
            <p className="font-semibold text-slate-700">
              Dikembangkan oleh {pkbmConfig.name}
            </p>
            <p className="flex items-center justify-center gap-3 text-slate-500 text-[11px] flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3 h-3 text-blue-600" /> {pkbmConfig.phone}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3 h-3 text-blue-600" /> {pkbmConfig.email}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Outer Copyright Footer */}
      <div className="max-w-xl mx-auto w-full text-center py-4 text-blue-200/90 text-xs z-10 font-medium space-y-1.5">
        <p className="flex items-center justify-center gap-1 flex-wrap">
          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{pkbmConfig.address}, {pkbmConfig.subDistrict}, {pkbmConfig.regency} {pkbmConfig.postalCode}</span>
        </p>

        {onOpenSupabaseStatus && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={onOpenSupabaseStatus}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-full text-[11px] font-bold border border-white/20 transition backdrop-blur-sm"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Database Online: Supabase</span>
              <span className={`w-2 h-2 rounded-full ${
                supabaseHealth && supabaseHealth.missingTables.length === 0 ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

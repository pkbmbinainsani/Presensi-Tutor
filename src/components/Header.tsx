import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Table, 
  Printer, 
  Users, 
  Bot, 
  Clock, 
  Sparkles,
  School,
  LogOut,
  User,
  UserCheck,
  ShieldCheck,
  MapPin,
  Camera,
  Database,
  RefreshCw
} from 'lucide-react';
import { PKBM_CONFIG } from '../data/mockData';
import { UserSession } from '../types';
import { SupabaseHealthStatus } from '../lib/supabase';
import { getWibTimeWithSuffix, formatWibDateIndo } from '../lib/dateUtils';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalTodayCount: number;
  totalStudentsCount: number;
  currentUser: UserSession;
  onLogout: () => void;
  logoUrl?: string;
  onOpenLogoModal?: () => void;
  onOpenSupabaseStatus?: () => void;
  supabaseHealth?: SupabaseHealthStatus | null;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalTodayCount,
  totalStudentsCount,
  currentUser,
  onLogout,
  logoUrl,
  onOpenLogoModal,
  onOpenSupabaseStatus,
  supabaseHealth,
  isSyncing = false,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(getWibTimeWithSuffix(now, true));
      setCurrentDate(formatWibDateIndo(now, 'withDay'));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = currentUser.role === 'admin' 
    ? [
        { id: 'rekapitulasi', label: 'Rekapitulasi Otomatis', icon: Table },
        { id: 'lokasi', label: 'Pengaturan Lokasi', icon: MapPin },
        { id: 'cetak', label: 'Cetak Laporan', icon: Printer },
        { id: 'master', label: 'Data Tutor & Pegawai', icon: Users },
        { id: 'ai-asisten', label: 'Asisten AI PKBM', icon: Bot, badge: 'AI' },
      ]
    : [
        { id: 'presensi', label: 'Form Presensi Mandiri Tutor', icon: ClipboardCheck },
        { id: 'profil', label: 'Profil Saya & Foto', icon: User },
      ];

  return (
    <header className="bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 text-white border-b border-blue-800/40 shadow-xl">
      {/* Top Banner / Identity Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          
          {/* Logo & PKBM Title (Official PKBM Bina Insani Logo + Bold Gradient Text) */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white border-2 border-amber-400/80 shadow-2xl shadow-blue-950/80 flex items-center justify-center p-2 backdrop-blur shrink-0 transform hover:scale-105 transition-all overflow-hidden">
                <img 
                  src={logoUrl || '/logo.svg'} 
                  alt="Logo PKBM Bina Insani" 
                  className="w-full h-full object-contain filter drop-shadow-md"
                />
              </div>
              {currentUser.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenLogoModal) onOpenLogoModal();
                    else setActiveTab('master');
                  }}
                  title="Ganti Logo PKBM"
                  className="absolute -bottom-1 -right-1 px-2 py-1 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 rounded-xl shadow-lg border border-white text-[10px] font-black flex items-center gap-1 transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ganti Logo</span>
                </button>
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-yellow-300 via-amber-200 to-amber-400 bg-clip-text text-transparent drop-shadow-lg leading-tight">
                {PKBM_CONFIG.name}
              </h1>
              <p className="text-sm sm:text-base font-bold text-blue-100 tracking-wide mt-1">
                Sistem Presensi Kegiatan Tutor
              </p>
            </div>
          </div>

          {/* Right Section: User Panel, Stats, Location & Top-Right Keluar Button */}
          <div className="flex flex-col items-start lg:items-end gap-3 w-full lg:w-auto">
            {/* Top Row: User Connected Card + Supabase Cloud Status + Prominent Keluar Button (Top Right) */}
            <div className="flex items-center justify-between lg:justify-end w-full lg:w-auto gap-2.5 sm:gap-3 flex-wrap">
              {/* Supabase Status Pill */}
              <button
                type="button"
                onClick={onOpenSupabaseStatus}
                title="Klik untuk melihat Status & Skrip SQL Supabase"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-[11px] font-bold shadow transition-all ${
                  isSyncing
                    ? 'bg-blue-900/80 border-blue-400 text-blue-200'
                    : supabaseHealth && supabaseHealth.missingTables.length === 0
                    ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 hover:bg-emerald-900'
                    : 'bg-amber-950/80 border-amber-500/80 text-amber-300 hover:bg-amber-900'
                }`}
              >
                <Database className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : 'text-emerald-400'}`} />
                <span className="hidden sm:inline">
                  {isSyncing ? 'Sinkronisasi...' : supabaseHealth && supabaseHealth.missingTables.length === 0 ? 'Supabase Online' : 'Database Supabase'}
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  isSyncing ? 'bg-blue-400 animate-ping' : supabaseHealth && supabaseHealth.missingTables.length === 0 ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`} />
              </button>

              <div 
                onClick={() => currentUser.role === 'tutor' && setActiveTab('profil')}
                className={`flex items-center gap-2.5 bg-blue-900/90 border border-blue-500/50 px-3.5 py-2 rounded-2xl shadow-lg backdrop-blur ${
                  currentUser.role === 'tutor' ? 'cursor-pointer hover:bg-blue-800/90 hover:border-amber-400/80 transition' : ''
                }`}
                title={currentUser.role === 'tutor' ? 'Klik untuk membuka profil dan ganti foto' : undefined}
              >
                {currentUser.avatarUrl ? (
                  <div className="w-8 h-8 rounded-xl overflow-hidden border-2 border-amber-400 shadow-sm shrink-0">
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="p-1.5 bg-amber-400 text-blue-950 rounded-xl font-bold shadow-sm">
                    {currentUser.role === 'admin' ? (
                      <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-[10px] text-blue-200 uppercase font-extrabold tracking-wider leading-none">
                    {currentUser.role === 'admin' ? 'Administrator' : 'Tutor Terhubung'}
                  </p>
                  <p className="text-xs sm:text-sm font-black text-white max-w-[160px] sm:max-w-[220px] truncate mt-0.5">
                    {currentUser.name}
                  </p>
                </div>
              </div>

              {/* Keluar Button placed at Top Right Panel */}
              <button
                onClick={onLogout}
                title="Keluar dari Sistem"
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 active:from-rose-700 active:to-red-800 text-white rounded-2xl shadow-lg border border-rose-400/60 transition-all flex items-center gap-2 text-xs sm:text-sm font-extrabold tracking-wider shrink-0 transform hover:scale-105"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </div>

            {/* Harmonized Stats & Prominent Clock Row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
              {/* Presensi Hari Ini */}
              <div className="flex items-center gap-2.5 bg-slate-800/95 border border-slate-700 px-3.5 py-2 rounded-2xl text-xs sm:text-sm h-11 shadow-md">
                <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0" />
                <span className="text-slate-200 font-medium">
                  Presensi Hari Ini: <strong className="text-blue-400 font-extrabold">{totalTodayCount} Tutor</strong>
                </span>
              </div>

              {/* Total WB Hari Ini */}
              <div className="flex items-center gap-2.5 bg-slate-800/95 border border-slate-700 px-3.5 py-2 rounded-2xl text-xs sm:text-sm h-11 shadow-md">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
                <span className="text-slate-200 font-medium">
                  WB Terlayani Hari Ini: <strong className="text-amber-300 font-extrabold">{totalStudentsCount} Orang</strong>
                </span>
              </div>
            </div>

            {/* Prominent Real-time Clock & Date Widget (Visible on Mobile & PC) */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-2 border-amber-400/80 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur text-xs sm:text-sm w-full lg:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/40 shrink-0">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-amber-300 text-base sm:text-lg tracking-wider font-mono drop-shadow">
                      {currentTime}
                    </span>
                    <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide">
                      UTC+7
                    </span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-100 capitalize drop-shadow-sm">
                    {currentDate}
                  </span>
                </div>
              </div>
            </div>

            {/* NPSN & Address located directly below Presensi Hari Ini / Stats */}
            <div className="flex items-center gap-2 text-xs text-slate-200 bg-blue-950/80 border border-blue-700/50 px-3 py-1.5 rounded-xl shadow-inner w-full lg:w-auto justify-start lg:justify-end">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider">
                NPSN {PKBM_CONFIG.npsn}
              </span>
              <span className="text-blue-200 text-xs font-semibold">
                Kec. Sumowono, Kab. Semarang
              </span>
            </div>
          </div>

        </div>

        {/* Tab Navigation (Full Width) */}
        <div className="mt-4 border-t border-blue-800/30 pt-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none w-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-950/50 scale-[1.02]'
                      : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-blue-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="bg-amber-400 text-slate-900 font-extrabold text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </header>
  );
};


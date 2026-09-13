import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { AttendanceForm } from './components/AttendanceForm';
import { RekapitulasiTable } from './components/RekapitulasiTable';
import { PrintReportView } from './components/PrintReportView';
import { MasterDataModal } from './components/MasterDataModal';
import { LocationManagerModal } from './components/LocationManagerModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { SupabaseStatusModal } from './components/SupabaseStatusModal';
import { TutorProfileModal } from './components/TutorProfileModal';
import { TutorRekapitulasiView } from './components/TutorRekapitulasiView';
import { AttendanceRecord, Tutor, UserSession, ClassLocation, PKBMInfo } from './types';
import { 
  getAttendanceRecords, 
  getTutors, 
  deleteAttendanceRecord, 
  resetToDefaultData, 
  getClassLocations, 
  saveClassLocations,
  getPKBMInfo,
  syncAllWithSupabase
} from './lib/storage';
import { 
  subscribeToSupabaseChanges, 
  checkSupabaseHealth, 
  SupabaseHealthStatus 
} from './lib/supabase';
import { PKBM_CONFIG } from './data/mockData';
import { getWibToday } from './lib/dateUtils';
import { Shield, RefreshCw, School, MapPin, Database, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PWAInstallFloatingBanner } from './components/PWAInstallComponents';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<string>('presensi');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [locations, setLocations] = useState<ClassLocation[]>([]);
  const [pkbmInfo, setPkbmInfo] = useState<PKBMInfo>(() => getPKBMInfo());

  // Supabase Online Status & Modal
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [supabaseHealth, setSupabaseHealth] = useState<SupabaseHealthStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Load Initial Data & Session, then Sync with Supabase Online
  const refreshLocalData = () => {
    setAttendanceRecords(getAttendanceRecords());
    setTutors(getTutors());
    setLocations(getClassLocations());
    setPkbmInfo(getPKBMInfo());
  };

  const handleSyncOnline = async () => {
    setIsSyncing(true);
    try {
      const health = await checkSupabaseHealth();
      setSupabaseHealth(health);

      const result = await syncAllWithSupabase();
      setTutors(result.tutors);
      setLocations(result.locations);
      setAttendanceRecords(result.attendance);
      setPkbmInfo(result.pkbmInfo);
    } catch (err) {
      console.warn('Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // 1. First load local clean cache
    refreshLocalData();

    // 2. Fetch and synchronize with Supabase online
    handleSyncOnline();

    // 3. Subscribe to real-time events from Supabase
    const unsubscribe = subscribeToSupabaseChanges((table) => {
      console.log(`Realtime update detected from Supabase on table: ${table}`);
      handleSyncOnline();
    });

    // 4. Retrieve stored user session if available
    const storedSession = localStorage.getItem('pkbm_user_session');
    if (storedSession) {
      try {
        const session: UserSession = JSON.parse(storedSession);
        setCurrentUser(session);
        setActiveTab(session.role === 'admin' ? 'rekapitulasi' : 'presensi');
      } catch (err) {
        console.warn('Failed to parse session cache:', err);
      }
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSaveLocations = (updatedLocations: ClassLocation[]) => {
    setLocations(updatedLocations);
    saveClassLocations(updatedLocations);
  };

  const handleLogin = (session: UserSession) => {
    setCurrentUser(session);
    localStorage.setItem('pkbm_user_session', JSON.stringify(session));
    setActiveTab(session.role === 'admin' ? 'rekapitulasi' : 'presensi');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('pkbm_user_session');
  };

  // If user is not logged in, render the Login Page directly!
  if (!currentUser) {
    return (
      <>
        <LoginPage
          tutors={tutors}
          pkbmConfig={pkbmInfo}
          onLogin={handleLogin}
          onOpenSupabaseStatus={() => setIsSupabaseModalOpen(true)}
          supabaseHealth={supabaseHealth}
        />
        <SupabaseStatusModal
          isOpen={isSupabaseModalOpen}
          onClose={() => setIsSupabaseModalOpen(false)}
          onSyncNow={handleSyncOnline}
        />
      </>
    );
  }

  // Handle New Attendance Created
  const handleRecordCreated = (newRecord: AttendanceRecord) => {
    setAttendanceRecords(prev => [newRecord, ...prev]);
    // Switch to Rekapitulasi tab only if logged in as Admin
    if (currentUser?.role === 'admin') {
      setTimeout(() => {
        setActiveTab('rekapitulasi');
      }, 1200);
    }
  };

  // Handle Delete Record
  const handleDeleteRecord = (id: string) => {
    deleteAttendanceRecord(id);
    setAttendanceRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleTutorProfileUpdated = (updatedTutor: Tutor) => {
    // 1. Update tutors state
    setTutors(prev => prev.map(t => t.id === updatedTutor.id ? updatedTutor : t));
    // 2. Update currentUser session if it's the logged-in tutor
    if (currentUser && currentUser.tutorId === updatedTutor.id) {
      const updatedSession: UserSession = {
        ...currentUser,
        name: updatedTutor.name,
        nipCode: updatedTutor.nipCode,
        avatarUrl: updatedTutor.avatarUrl,
      };
      setCurrentUser(updatedSession);
      localStorage.setItem('pkbm_user_session', JSON.stringify(updatedSession));
    }
    // 3. Trigger online sync to Supabase
    handleSyncOnline();
  };

  const currentTutor = tutors.find(t => t.id === currentUser?.tutorId) || (currentUser?.tutorId ? {
    id: currentUser.tutorId,
    name: currentUser.name,
    nipCode: currentUser.nipCode || '',
    specialization: '',
    phone: '',
    active: true,
    pin: '1234',
    avatarUrl: currentUser.avatarUrl
  } : null);

  // Stats Calculations (Reset Daily - Zona WIB UTC+7)
  const todayStr = getWibToday();
  const todayRecords = attendanceRecords.filter(r => r.date === todayStr);
  const todayStudentsCount = todayRecords.reduce((acc, curr) => acc + (curr.studentCount || 0), 0);

  const isSupabaseReady = supabaseHealth && supabaseHealth.missingTables.length === 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalTodayCount={todayRecords.length}
        totalStudentsCount={todayStudentsCount}
        currentUser={currentUser}
        onLogout={handleLogout}
        logoUrl={pkbmInfo.logoUrl}
        onOpenLogoModal={() => setActiveTab('master')}
        onOpenSupabaseStatus={() => setIsSupabaseModalOpen(true)}
        supabaseHealth={supabaseHealth}
        isSyncing={isSyncing}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Banner if Supabase tables still need setup */}
        {supabaseHealth && supabaseHealth.missingTables.length > 0 && currentUser.role === 'admin' && (
          <div className="bg-amber-500/10 border-2 border-amber-500/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-xs sm:text-sm">
                  Database Online Supabase Siap Dikonfigurasi
                </p>
                <p className="text-[11px] text-amber-800">
                  Tabel PostgreSQL belum dibuat di project Supabase Anda. Klik tombol di samping untuk menyalin skrip SQL setup.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow shrink-0"
            >
              <Database className="w-4 h-4" />
              <span>Buka Panduan &amp; Salin SQL</span>
            </button>
          </div>
        )}

        {activeTab === 'presensi' && currentUser.role !== 'admin' && (
          <AttendanceForm
            key={currentUser.tutorId || 'tutor'}
            tutors={tutors}
            initialTutorId={currentUser.tutorId}
            currentUser={currentUser}
            allRecords={attendanceRecords}
            classLocations={locations}
            onRecordCreated={handleRecordCreated}
            onTutorUpdated={handleTutorProfileUpdated}
          />
        )}

        {activeTab === 'rekap-tutor' && currentUser.role !== 'admin' && (
          <TutorRekapitulasiView
            currentUser={currentUser}
            allRecords={attendanceRecords}
            tutorProfile={currentTutor}
            pkbmInfo={pkbmInfo}
            onNavigateToPresensi={() => setActiveTab('presensi')}
          />
        )}

        {activeTab === 'profil' && currentTutor && (
          <TutorProfileModal
            isOpen={true}
            onClose={() => setActiveTab('presensi')}
            tutor={currentTutor}
            onProfileUpdated={handleTutorProfileUpdated}
            isModal={false}
          />
        )}

        {activeTab === 'lokasi' && (
          <LocationManagerModal
            locations={locations}
            onSaveLocations={handleSaveLocations}
          />
        )}

        {activeTab === 'rekapitulasi' && (
          <RekapitulasiTable
            records={attendanceRecords}
            onDeleteRecord={handleDeleteRecord}
          />
        )}

        {activeTab === 'cetak' && (
          <PrintReportView
            records={attendanceRecords}
            pkbmInfo={pkbmInfo}
            tutors={tutors}
          />
        )}

        {activeTab === 'master' && (
          <MasterDataModal
            tutors={tutors}
            pkbmInfo={pkbmInfo}
            onTutorsChanged={handleSyncOnline}
            onPkbmInfoChanged={(updated) => {
              setPkbmInfo(updated);
            }}
            onOpenSupabaseStatus={() => setIsSupabaseModalOpen(true)}
            supabaseHealth={supabaseHealth}
          />
        )}


        {activeTab === 'ai-asisten' && (
          <AiAssistantModal
            records={attendanceRecords}
          />
        )}

      </main>

      {/* Supabase Status Modal */}
      <SupabaseStatusModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onSyncNow={handleSyncOnline}
      />

      {/* App Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-6 px-4 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold">
              <School className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-xs">{pkbmInfo.name || PKBM_CONFIG.name}</p>
              <p className="text-[11px] text-slate-500">Pusat Kegiatan Belajar Masyarakat • NPSN {pkbmInfo.npsn || PKBM_CONFIG.npsn}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              Sumowono, Kab. Semarang
            </span>
            <span>•</span>
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="flex items-center gap-1 hover:text-white transition"
              title="Status Database Supabase"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Database Online: Supabase</span>
              <span className={`inline-block w-2 h-2 rounded-full ${isSupabaseReady ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
            </button>
            <span>•</span>
            <button
              onClick={() => {
                if (window.confirm('Bersihkan riwayat absensi dan segarkan sistem?')) {
                  resetToDefaultData();
                  handleSyncOnline();
                }
              }}
              className="text-slate-400 hover:text-amber-400 flex items-center gap-1 underline transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Bersihkan &amp; Reset Data
            </button>
          </div>

        </div>
      </footer>

      {/* PWA Install Banner & Offline Alert */}
      <PWAInstallFloatingBanner />
      <OfflineIndicator />

    </div>
  );
}

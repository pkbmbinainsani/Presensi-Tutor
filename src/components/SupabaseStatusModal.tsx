import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink,
  Table,
  Layers,
  ShieldCheck,
  Server
} from 'lucide-react';
import { 
  SUPABASE_URL, 
  SUPABASE_ANON_KEY, 
  checkSupabaseHealth, 
  SupabaseHealthStatus 
} from '../lib/supabase';

interface SupabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncNow?: () => void;
}

export const SupabaseStatusModal: React.FC<SupabaseStatusModalProps> = ({
  isOpen,
  onClose,
  onSyncNow
}) => {
  const [health, setHealth] = useState<SupabaseHealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const runHealthCheck = async () => {
    setIsChecking(true);
    try {
      const res = await checkSupabaseHealth();
      setHealth(res);
    } catch (e) {
      console.warn('Health check note:', e);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runHealthCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sqlCode = `-- ==============================================================================
-- SKRIP SETUP DATABASE SUPABASE - PKBM BINA INSANI SUMOWONO
-- ==============================================================================
-- Jalankan skrip ini di: https://bjekrnawldsnbhtfelzk.supabase.co/project/default/editor

-- 1. Tabel Master Data Tutor & Pegawai PKBM
CREATE TABLE IF NOT EXISTS public.tutors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    nip_code TEXT,
    specialization TEXT,
    phone TEXT,
    pin TEXT DEFAULT '1234',
    role_type TEXT DEFAULT 'tutor',
    position TEXT,
    avatar_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Tabel Lokasi & Geofencing Kegiatan Belajar Mengajar
CREATE TABLE IF NOT EXISTS public.class_locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER DEFAULT 300,
    is_main_branch BOOLEAN DEFAULT false,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. Tabel Riwayat Presensi & Kegiatan Pembelajaran Tutor
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id TEXT PRIMARY KEY,
    tutor_id TEXT,
    tutor_name TEXT NOT NULL,
    program TEXT NOT NULL,
    subject_title TEXT,
    class_group TEXT,
    date TEXT NOT NULL,
    time_start TEXT NOT NULL,
    time_end TEXT NOT NULL,
    student_count INTEGER DEFAULT 0,
    activity_notes TEXT,
    photo_url TEXT,
    location JSONB,
    status TEXT DEFAULT 'Hadir Valid',
    duty_type TEXT DEFAULT 'Reguler',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records (date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_tutor ON public.attendance_records (tutor_id);

-- 4. Tabel Profil & Konfigurasi Lembaga PKBM Bina Insani
CREATE TABLE IF NOT EXISTS public.pkbm_info (
    id TEXT PRIMARY KEY DEFAULT 'main',
    name TEXT NOT NULL,
    npsn TEXT,
    address TEXT,
    sub_district TEXT,
    regency TEXT,
    province TEXT,
    postal_code TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    favicon_url TEXT,
    use_logo_as_favicon BOOLEAN DEFAULT true,
    foundation_manager_name TEXT,
    foundation_manager_title TEXT,
    foundation_manager_nip TEXT,
    head_name TEXT,
    head_nip TEXT,
    attendance_officer_name TEXT,
    attendance_officer_nip TEXT,
    center_coordinates JSONB,
    allowed_radius_meters INTEGER DEFAULT 300,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Kolom tambahan untuk tabel versi terdahulu (jika sudah dibuat)
ALTER TABLE public.pkbm_info ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE public.pkbm_info ADD COLUMN IF NOT EXISTS use_logo_as_favicon BOOLEAN DEFAULT true;

-- Aktifkan RLS & Kebijakan Akses Publik (Anon)
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pkbm_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon public access for tutors" ON public.tutors;
CREATE POLICY "Anon public access for tutors" ON public.tutors FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access for class_locations" ON public.class_locations;
CREATE POLICY "Anon public access for class_locations" ON public.class_locations FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access for attendance_records" ON public.attendance_records;
CREATE POLICY "Anon public access for attendance_records" ON public.attendance_records FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access for pkbm_info" ON public.pkbm_info;
CREATE POLICY "Anon public access for pkbm_info" ON public.pkbm_info FOR ALL TO anon USING (true) WITH CHECK (true);

-- Aktifkan Realtime Publikasi
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tutors; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.class_locations; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pkbm_info; EXCEPTION WHEN OTHERS THEN NULL; END $$;
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const isAllReady = health && health.missingTables.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                <span>Database Online Supabase</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                  isAllReady ? 'bg-emerald-400 text-slate-950' : 'bg-amber-400 text-slate-950'
                }`}>
                  {isAllReady ? 'Terhubung & Aktif' : 'Konfigurasi Tabel'}
                </span>
              </h3>
              <p className="text-xs text-blue-200">
                PKBM Bina Insani Sumowono Cloud Storage
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Connection Info */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-600 uppercase text-[11px] flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-600" />
                <span>Project Supabase</span>
              </span>
              <a 
                href="https://bjekrnawldsnbhtfelzk.supabase.co" 
                target="_blank" 
                rel="noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1 font-bold text-[11px]"
              >
                <span>Buka Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="font-mono text-[11px] bg-white p-2 rounded-xl border border-slate-200 text-slate-800 break-all">
              <strong>URL:</strong> {SUPABASE_URL}
            </div>
            <div className="font-mono text-[11px] bg-white p-2 rounded-xl border border-slate-200 text-slate-800 break-all">
              <strong>Publishable Key:</strong> {SUPABASE_ANON_KEY.substring(0, 20)}...{SUPABASE_ANON_KEY.substring(SUPABASE_ANON_KEY.length - 8)}
            </div>
          </div>

          {/* Table Status Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-600" />
                <span>Status Tabel PostgreSQL / PostgREST</span>
              </h4>
              <button
                type="button"
                onClick={runHealthCheck}
                disabled={isChecking}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Periksa Tabel</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { name: 'tutors', label: 'Master Tutor', ready: health?.tables.tutors },
                { name: 'class_locations', label: 'Titik Lokasi', ready: health?.tables.class_locations },
                { name: 'attendance_records', label: 'Data Presensi', ready: health?.tables.attendance_records },
                { name: 'pkbm_info', label: 'Profil Lembaga', ready: health?.tables.pkbm_info },
              ].map(t => (
                <div 
                  key={t.name}
                  className={`p-3 rounded-xl border text-center space-y-1 ${
                    t.ready 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex justify-center">
                    {t.ready ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <p className="font-bold text-xs">{t.label}</p>
                  <p className="text-[10px] font-mono text-slate-500">{t.name}</p>
                  <p className="text-[10px] font-extrabold">
                    {t.ready ? 'Tersedia' : 'Belum Ada'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Setup Instructions if missing tables */}
          {!isAllReady && (
            <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-extrabold text-amber-900 text-xs sm:text-sm">
                    Tabel Supabase Belum Dibuat di Database
                  </h5>
                  <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                    Agar data tersimpan secara permanen di database online Supabase, jalankan skrip SQL di bawah ini pada menu <strong>SQL Editor</strong> di dashboard Supabase Anda.
                  </p>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
                <p className="font-bold text-slate-700 text-[11px]">Cara Eksekusi (Hanya 1 Menit):</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                  <li>Klik tombol hijau <strong>"Salin Skrip SQL Supabase"</strong> di bawah.</li>
                  <li>Buka <a href="https://bjekrnawldsnbhtfelzk.supabase.co" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">Supabase Dashboard &gt; SQL Editor</a>.</li>
                  <li>Klik <strong>New Query</strong>, tempelkan skrip yang disalin, lalu klik <strong>Run</strong>.</li>
                  <li>Kembali ke sini dan klik <strong>"Periksa Tabel"</strong>.</li>
                </ol>
              </div>

              {/* Copy Button */}
              <button
                type="button"
                onClick={handleCopy}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-extrabold flex items-center justify-center gap-2 shadow transition"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Berhasil Disalin ke Clipboard!' : 'Salin Skrip SQL Supabase'}</span>
              </button>
            </div>
          )}

          {isAllReady && (
            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h5 className="font-extrabold text-emerald-900 text-xs sm:text-sm">
                  Seluruh Tabel Supabase Aktif &amp; Terhubung
                </h5>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  Aplikasi presensi tutor kini sepenuhnya beroperasi secara online dengan Supabase secara real-time.
                </p>
              </div>
            </div>
          )}

          {/* Sync Button */}
          {onSyncNow && (
            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onSyncNow();
                  runHealthCheck();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sinkronkan Ulang Semua Data Sekarang</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

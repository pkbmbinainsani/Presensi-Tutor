-- ==============================================================================
-- SKRIP SETUP DATABASE SUPABASE
-- SISTEM PRESENSI KEGIATAN TUTOR PKBM BINA INSANI SUMOWONO
-- ==============================================================================
-- Petunjuk:
-- 1. Buka dashboard Supabase Anda: https://bjekrnawldsnbhtfelzk.supabase.co
-- 2. Masuk ke menu "SQL Editor" di bilah navigasi kiri.
-- 3. Tempelkan seluruh isi skrip ini ke dalam editor lalu klik tombol "RUN".
-- ==============================================================================

-- 1. Tabel Data Master Tutor & Pegawai PKBM
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

-- Index untuk mempercepat query presensi berdasarkan tanggal dan tutor
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

-- 5. Tabel Jadwal Pembelajaran & KBM Berdasarkan Tanggal
CREATE TABLE IF NOT EXISTS public.schedules (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    time_start TEXT NOT NULL,
    time_end TEXT NOT NULL,
    program TEXT NOT NULL,
    subject_title TEXT NOT NULL,
    class_group TEXT NOT NULL,
    tutor_id TEXT,
    tutor_name TEXT NOT NULL,
    room TEXT DEFAULT 'Gedung Utama PKBM',
    semester TEXT DEFAULT 'Semester Ganjil 2026/2027',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_schedules_date ON public.schedules (date ASC);
CREATE INDEX IF NOT EXISTS idx_schedules_program ON public.schedules (program);

-- ==============================================================================
-- AKTIFKAN ROW LEVEL SECURITY (RLS) & IZIN AKSES PUBLIK (ANON)
-- ==============================================================================
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pkbm_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Tutors
DROP POLICY IF EXISTS "Anon public access for tutors" ON public.tutors;
CREATE POLICY "Anon public access for tutors" ON public.tutors 
    FOR ALL TO anon USING (true) WITH CHECK (true);

-- Kebijakan Akses Class Locations
DROP POLICY IF EXISTS "Anon public access for class_locations" ON public.class_locations;
CREATE POLICY "Anon public access for class_locations" ON public.class_locations 
    FOR ALL TO anon USING (true) WITH CHECK (true);

-- Kebijakan Akses Attendance Records
DROP POLICY IF EXISTS "Anon public access for attendance_records" ON public.attendance_records;
CREATE POLICY "Anon public access for attendance_records" ON public.attendance_records 
    FOR ALL TO anon USING (true) WITH CHECK (true);

-- Kebijakan Akses PKBM Info
DROP POLICY IF EXISTS "Anon public access for pkbm_info" ON public.pkbm_info;
CREATE POLICY "Anon public access for pkbm_info" ON public.pkbm_info 
    FOR ALL TO anon USING (true) WITH CHECK (true);

-- Kebijakan Akses Schedules
DROP POLICY IF EXISTS "Anon public access for schedules" ON public.schedules;
CREATE POLICY "Anon public access for schedules" ON public.schedules 
    FOR ALL TO anon USING (true) WITH CHECK (true);

-- ==============================================================================
-- REALTIME SUBSCRIPTIONS
-- ==============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tutors;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_locations;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pkbm_info;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

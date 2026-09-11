import { PKBMInfo, Tutor, AttendanceRecord, ClassLocation } from '../types';

export const PKBM_CONFIG: PKBMInfo = {
  name: "PKBM BINA INSANI SUMOWONO",
  npsn: "P9979993",
  address: "RT.01/RW.02 Dusun Kawedusan Desa Ngadikerso",
  subDistrict: "Kec. Sumowono",
  regency: "Kab. Semarang",
  province: "Jawa Tengah",
  postalCode: "50662",
  phone: "+62852 9065 5103",
  email: "pkbmbinainsani.sumowono@gmail.com",
  logoUrl: "/logo.svg",
  foundationManagerName: "H. Sugeng Wahyudi, S.E.",
  foundationManagerTitle: "Pengelola / Ketua Yayasan Bina Insani",
  foundationManagerNip: "NIY. 19740815 201001 1 001",
  headName: "Lailatul Arifah, S.H., M.Pd.",
  headNip: "NIY/NIP. 19820512 201202 2 002",
  attendanceOfficerName: "Nunung Khoiriyah",
  attendanceOfficerNip: "ID Pegawai: 19900320 201803 2 003",
  centerCoordinates: {
    latitude: -7.21854,
    longitude: 110.33402
  },
  allowedRadiusMeters: 300
};

// Titik lokasi resmi utama PKBM Bina Insani (Data real, non-dummy)
export const INITIAL_CLASS_LOCATIONS: ClassLocation[] = [
  {
    id: "loc-utama",
    name: "Gedung Utama PKBM Bina Insani",
    address: "RT.01/RW.02 Dusun Kawedusan, Desa Ngadikerso, Kec. Sumowono",
    latitude: -7.21854,
    longitude: 110.33402,
    radiusMeters: 300,
    isMainBranch: true,
    notes: "Gedung Pusat Administrasi & Kegiatan Belajar Mengajar",
    active: true
  }
];

// Seluruh data dummy tutor telah dibersihkan. Tutor didaftarkan secara real melalui portal / database Supabase.
export const INITIAL_TUTORS: Tutor[] = [];

// Riwayat absensi bersih tanpa data dummy (0 data)
export const SAMPLE_ATTENDANCE_RECORDS: AttendanceRecord[] = [];

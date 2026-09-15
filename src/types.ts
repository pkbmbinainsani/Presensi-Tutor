export type ProgramType = 
  | 'Paket A (Setara SD)'
  | 'Paket B (Setara SMP)'
  | 'Paket C (Setara SMA)'
  | 'Keaksaraan Fungsional (KF)'
  | 'PAUD Bina Insani'
  | 'Kursus & Keterampilan / Vokasi';

export interface Tutor {
  id: string;
  name: string;
  nipCode: string;
  specialization: string;
  phone: string;
  pin?: string;
  roleType?: 'tutor' | 'pegawai' | 'pengelola';
  position?: string;
  avatarUrl?: string;
  active: boolean;
}

export interface ClassLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isMainBranch?: boolean;
  notes?: string;
  active: boolean;
}

export interface UserSession {
  role: 'tutor' | 'admin';
  tutorId?: string;
  name: string;
  nipCode?: string;
  avatarUrl?: string;
}

export interface GeoLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  distanceToCenterMeters?: number;
  isWithinRadius?: boolean;
  matchedLocationId?: string;
  matchedLocationName?: string;
  timestamp: string;
}

export interface AttendanceRecord {
  id: string;
  tutorId: string;
  tutorName: string;
  program: ProgramType;
  subjectTitle: string; // Mata pelajaran / Nama kegiatan
  classGroup: string; // Kelas / Kelompok belajar (e.g. Kelas 10, Pos Belajar Biting)
  date: string; // YYYY-MM-DD
  timeStart: string; // HH:mm
  timeEnd: string; // HH:mm
  studentCount: number; // Jumlah Warga Belajar Hadir
  activityNotes: string; // Uraian Ringkas Kegiatan
  photoUrl: string; // Base64 or image URL
  location: GeoLocationData;
  status: 'Hadir Valid' | 'Hadir Lapangan' | 'Menunggu Verifikasi' | 'Dinas Luar';
  dutyType?: 'Reguler' | 'Dinas Luar';
  createdAt: string;
}

export interface FilterState {
  searchTerm: string;
  tutorId: string;
  program: string;
  monthYear: string; // YYYY-MM (optional fallback)
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: string;
}

export interface PKBMInfo {
  name: string;
  npsn: string;
  address: string;
  subDistrict: string;
  regency: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  logoUrl?: string;
  faviconUrl?: string;
  useLogoAsFavicon?: boolean;
  foundationManagerName?: string;
  foundationManagerTitle?: string;
  foundationManagerNip?: string;
  headName?: string;
  headNip?: string;
  attendanceOfficerName?: string;
  attendanceOfficerNip?: string;
  centerCoordinates: {
    latitude: number;
    longitude: number;
  };
  allowedRadiusMeters: number;
}

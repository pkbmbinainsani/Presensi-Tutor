import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  Phone, 
  CheckCircle2, 
  Search, 
  X, 
  Lock, 
  Briefcase, 
  GraduationCap, 
  UserCheck, 
  UserX,
  Key,
  Building,
  AlertTriangle,
  Award,
  Check,
  Camera,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  List,
  LayoutGrid,
  Database,
  Globe,
  Smartphone,
  CheckSquare,
  Square
} from 'lucide-react';
import { Tutor, PKBMInfo } from '../types';
import { saveTutor, deleteTutor, getPKBMInfo, savePKBMInfo } from '../lib/storage';
import { SupabaseHealthStatus } from '../lib/supabase';
import { compressProfileImage, compressLogoImage } from '../lib/imageUtils';
import { compressFaviconImage, updateDocumentFavicon } from '../lib/faviconUtils';

interface MasterDataModalProps {
  tutors: Tutor[];
  pkbmInfo?: PKBMInfo;
  onTutorsChanged: () => void;
  onPkbmInfoChanged?: (newInfo: PKBMInfo) => void;
  onOpenSupabaseStatus?: () => void;
  supabaseHealth?: SupabaseHealthStatus | null;
}

export const MasterDataModal: React.FC<MasterDataModalProps> = ({ 
  tutors, 
  pkbmInfo: propPkbmInfo,
  onTutorsChanged, 
  onPkbmInfoChanged,
  onOpenSupabaseStatus,
  supabaseHealth
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'tutor' | 'pegawai' | 'pengelola'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Custom Delete Modal State
  const [personToDelete, setPersonToDelete] = useState<{ id: string; name: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Leadership & Officer Settings State
  const [pkbmInfo, setPkbmInfo] = useState<PKBMInfo>(() => propPkbmInfo || getPKBMInfo());
  const [foundationManager, setFoundationManager] = useState<string>(pkbmInfo.foundationManagerName || 'H. Sugeng Wahyudi, S.E.');
  const [foundationTitle, setFoundationTitle] = useState<string>(pkbmInfo.foundationManagerTitle || 'Pengelola / Ketua Yayasan Bina Insani');
  const [headName, setHeadName] = useState<string>(pkbmInfo.headName || 'Lailatul Arifah, S.H., M.Pd.');
  const [attendanceOfficer, setAttendanceOfficer] = useState<string>(pkbmInfo.attendanceOfficerName || 'Nunung Khoiriyah');
  const [isLeadershipOpen, setIsLeadershipOpen] = useState<boolean>(false);
  const [leadershipSuccessMsg, setLeadershipSuccessMsg] = useState<string | null>(null);
  const [isSavingLeadership, setIsSavingLeadership] = useState<boolean>(false);

  // Logo & Favicon Customization State
  const [logoUrl, setLogoUrl] = useState<string>(pkbmInfo.logoUrl || '/logo.svg');
  const [logoInputUrl, setLogoInputUrl] = useState<string>('');
  const [faviconUrl, setFaviconUrl] = useState<string>(pkbmInfo.faviconUrl || pkbmInfo.logoUrl || '/favicon.svg');
  const [faviconInputUrl, setFaviconInputUrl] = useState<string>('');
  const [useLogoAsFavicon, setUseLogoAsFavicon] = useState<boolean>(pkbmInfo.useLogoAsFavicon !== false);
  const [isLogoOpen, setIsLogoOpen] = useState<boolean>(false);
  const [logoSuccessMsg, setLogoSuccessMsg] = useState<string | null>(null);
  const [logoErrorMsg, setLogoErrorMsg] = useState<string | null>(null);
  const [isSavingLogo, setIsSavingLogo] = useState<boolean>(false);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [isProcessingFavicon, setIsProcessingFavicon] = useState<boolean>(false);

  // Keep state in sync whenever propPkbmInfo updates (from Supabase online sync or other PC)
  useEffect(() => {
    if (propPkbmInfo) {
      setPkbmInfo(propPkbmInfo);
      setLogoUrl(propPkbmInfo.logoUrl || '/logo.svg');
      setFaviconUrl(propPkbmInfo.faviconUrl || propPkbmInfo.logoUrl || '/favicon.svg');
      setUseLogoAsFavicon(propPkbmInfo.useLogoAsFavicon !== false);
      setFoundationManager(propPkbmInfo.foundationManagerName || '');
      setFoundationTitle(propPkbmInfo.foundationManagerTitle || '');
      setHeadName(propPkbmInfo.headName || '');
      setAttendanceOfficer(propPkbmInfo.attendanceOfficerName || '');
    }
  }, [propPkbmInfo]);

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [roleType, setRoleType] = useState<'tutor' | 'pegawai' | 'pengelola'>('tutor');
  const [nipCode, setNipCode] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [specialization, setSpecialization] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [active, setActive] = useState<boolean>(true);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setRoleType('tutor');
    setNipCode('');
    setPosition('');
    setSpecialization('');
    setPhone('');
    setPin('');
    setAvatarUrl('');
    setActive(true);
    setIsFormOpen(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (tutor: Tutor) => {
    setEditingId(tutor.id);
    setName(tutor.name);
    setRoleType(tutor.roleType || 'tutor');
    setNipCode(tutor.nipCode);
    setPosition(tutor.position || '');
    setSpecialization(tutor.specialization);
    setPhone(tutor.phone);
    setPin(tutor.pin || '1234');
    setAvatarUrl(tutor.avatarUrl || '');
    setActive(tutor.active);
    setIsFormOpen(true);
  };

  const handlePersonPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressProfileImage(file, 380, 0.88);
      setAvatarUrl(compressed);
      setToastMessage('Foto profil personel berhasil dipilih!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage(err?.message || 'Gagal memproses berkas gambar');
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const autoNipPrefix = roleType === 'pegawai' ? 'ADM-BIN-' : roleType === 'pengelola' ? 'PNG-BIN-' : 'TUT-BIN-';
    const autoNip = nipCode.trim() || `${autoNipPrefix}00${tutors.length + 1}`;

    const updatedPerson: Tutor = {
      id: editingId || 'person-' + Date.now(),
      name: name.trim(),
      nipCode: autoNip,
      specialization: specialization.trim() || (roleType === 'tutor' ? 'Tutor Kesetaraan' : 'Administrasi PKBM'),
      position: position.trim() || (roleType === 'tutor' ? 'Tutor Pendidik' : roleType === 'pegawai' ? 'Staf Administrasi' : 'Pengelola PKBM'),
      phone: phone.trim() || '081234567890',
      pin: pin.trim() || '1234',
      roleType: roleType,
      avatarUrl: avatarUrl.trim() || undefined,
      active: active
    };

    saveTutor(updatedPerson);
    onTutorsChanged();
    setToastMessage(`Data "${updatedPerson.name}" berhasil disimpan.`);
    setTimeout(() => setToastMessage(null), 3000);
    resetForm();
  };

  const handleDeleteClick = (id: string, personName: string) => {
    setPersonToDelete({ id, name: personName });
  };

  const confirmDeletePerson = () => {
    if (!personToDelete) return;
    deleteTutor(personToDelete.id);
    onTutorsChanged();
    setToastMessage(`Data "${personToDelete.name}" berhasil dihapus.`);
    setPersonToDelete(null);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveLeadership = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLeadership(true);
    try {
      const currentInfo = propPkbmInfo || getPKBMInfo();
      const updatedInfo: PKBMInfo = {
        ...currentInfo,
        foundationManagerName: foundationManager.trim(),
        foundationManagerTitle: foundationTitle.trim(),
        headName: headName.trim(),
        attendanceOfficerName: attendanceOfficer.trim()
      };
      const syncedOnline = await savePKBMInfo(updatedInfo);
      setPkbmInfo(updatedInfo);
      if (onPkbmInfoChanged) {
        onPkbmInfoChanged(updatedInfo);
      }
      if (syncedOnline) {
        setLeadershipSuccessMsg('✓ Pengaturan Pimpinan Laporan berhasil disimpan & disinkronkan ke Supabase Cloud!');
      } else {
        setLeadershipSuccessMsg('Pengaturan tersimpan lokal (koneksi online tidak tersedia).');
      }
    } catch (err: any) {
      console.warn('Save leadership error:', err);
    } finally {
      setIsSavingLeadership(false);
      setTimeout(() => setLeadershipSuccessMsg(null), 4000);
    }
  };

  const handleLogoFileUpload = async (file: File) => {
    setLogoErrorMsg(null);
    setLogoSuccessMsg(null);
    setIsProcessingImage(true);
    try {
      if (!file.type.startsWith('image/')) {
        setLogoErrorMsg('Mohon pilih berkas gambar (PNG, JPG, SVG, WebP).');
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        setLogoErrorMsg('Ukuran berkas gambar maksimal 3MB.');
        return;
      }

      const optimized = await compressLogoImage(file, 400);
      setLogoUrl(optimized);
      if (useLogoAsFavicon) {
        setFaviconUrl(optimized);
      }
      setLogoSuccessMsg('Berkas logo berhasil diproses! Klik tombol "Terapkan & Simpan Logo & Favicon" untuk menyinkronkan ke cloud.');
    } catch (err: any) {
      setLogoErrorMsg('Gagal memproses berkas gambar: ' + (err?.message || 'Error'));
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFaviconFileUpload = async (file: File) => {
    setLogoErrorMsg(null);
    setLogoSuccessMsg(null);
    setIsProcessingFavicon(true);
    try {
      if (!file.type.startsWith('image/')) {
        setLogoErrorMsg('Mohon pilih berkas gambar (PNG, SVG, ICO, JPG, WebP).');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setLogoErrorMsg('Ukuran berkas favicon maksimal 2MB.');
        return;
      }

      const optimized = await compressFaviconImage(file, 128);
      setFaviconUrl(optimized);
      setUseLogoAsFavicon(false);
      setLogoSuccessMsg('Berkas favicon khusus berhasil diproses! Jangan lupa klik "Terapkan & Simpan Logo & Favicon".');
    } catch (err: any) {
      setLogoErrorMsg('Gagal memproses favicon: ' + (err?.message || 'Error'));
    } finally {
      setIsProcessingFavicon(false);
    }
  };

  const handleResetToDefaultFavicon = () => {
    setFaviconUrl('/favicon.svg');
    setFaviconInputUrl('');
    setUseLogoAsFavicon(false);
    setLogoSuccessMsg('Favicon disetel kembali ke ikon resmi PKBM Bina Insani.');
    setTimeout(() => setLogoSuccessMsg(null), 3000);
  };

  const handleSaveLogo = async () => {
    const finalLogo = logoUrl.trim() || '/logo.svg';
    const finalFavicon = useLogoAsFavicon 
      ? finalLogo 
      : (faviconUrl.trim() || '/favicon.svg');

    setIsSavingLogo(true);
    setLogoErrorMsg(null);
    setLogoSuccessMsg(null);

    try {
      const currentInfo = propPkbmInfo || getPKBMInfo();
      const updatedInfo: PKBMInfo = {
        ...currentInfo,
        logoUrl: finalLogo,
        faviconUrl: finalFavicon,
        useLogoAsFavicon: useLogoAsFavicon
      };

      // 1. Save to local storage and upsert to Supabase online database
      const isOnlineSynced = await savePKBMInfo(updatedInfo);
      setPkbmInfo(updatedInfo);

      // 2. Immediately update favicon in the current browser tab
      updateDocumentFavicon(finalFavicon);

      // 3. Notify parent component
      if (onPkbmInfoChanged) {
        onPkbmInfoChanged(updatedInfo);
      }

      // 4. Inform user of online synchronization status
      if (isOnlineSynced) {
        setLogoSuccessMsg('✓ Logo dan Favicon berhasil disimpan & disinkronkan ke Supabase Cloud! Ikon browser tab dan logo aplikasi langsung aktif di semua komputer dan HP.');
        setToastMessage('✓ Logo & Favicon tersinkron!');
      } else {
        setLogoSuccessMsg('Logo & Favicon tersimpan di perangkat ini (tersimpan lokal).');
        setToastMessage('Logo & Favicon tersimpan lokal');
      }
    } catch (err: any) {
      setLogoErrorMsg('Terjadi kesalahan saat menyimpan logo & favicon: ' + (err?.message || 'Error'));
    } finally {
      setIsSavingLogo(false);
      setTimeout(() => {
        setLogoSuccessMsg(null);
      }, 5000);
    }
  };

  const handleResetToDefaultLogo = async () => {
    const defaultLogo = '/logo.svg';
    const defaultFavicon = '/favicon.svg';
    setIsSavingLogo(true);
    setLogoErrorMsg(null);
    setLogoSuccessMsg(null);

    try {
      setLogoUrl(defaultLogo);
      setLogoInputUrl('');
      setFaviconUrl(defaultFavicon);
      setFaviconInputUrl('');
      setUseLogoAsFavicon(true);

      const currentInfo = propPkbmInfo || getPKBMInfo();
      const updatedInfo: PKBMInfo = {
        ...currentInfo,
        logoUrl: defaultLogo,
        faviconUrl: defaultFavicon,
        useLogoAsFavicon: true
      };
      const isOnlineSynced = await savePKBMInfo(updatedInfo);
      setPkbmInfo(updatedInfo);
      updateDocumentFavicon(defaultFavicon);

      if (onPkbmInfoChanged) {
        onPkbmInfoChanged(updatedInfo);
      }

      if (isOnlineSynced) {
        setLogoSuccessMsg('✓ Logo dan Favicon dikembalikan ke standar resmi PKBM Bina Insani dan disinkronkan ke seluruh komputer.');
        setToastMessage('Logo & Favicon kembali ke default resmi');
      } else {
        setLogoSuccessMsg('Logo & Favicon default diterapkan secara lokal.');
      }
    } catch (err: any) {
      setLogoErrorMsg('Gagal mereset logo & favicon: ' + (err?.message || 'Error'));
    } finally {
      setIsSavingLogo(false);
      setTimeout(() => setLogoSuccessMsg(null), 3500);
    }
  };


  const handleToggleActive = (tutor: Tutor) => {
    saveTutor({
      ...tutor,
      active: !tutor.active
    });
    onTutorsChanged();
  };

  const handleResetPin = (tutor: Tutor) => {
    saveTutor({
      ...tutor,
      pin: '1234'
    });
    onTutorsChanged();
    setToastMessage(`PIN untuk ${tutor.name} berhasil direset.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered List
  const filteredList = tutors.filter((t) => {
    const tRole = t.roleType || 'tutor';
    if (activeTab !== 'all' && tRole !== activeTab) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchNip = t.nipCode.toLowerCase().includes(q);
      const matchSpec = t.specialization.toLowerCase().includes(q);
      const matchPos = (t.position || '').toLowerCase().includes(q);
      const matchPhone = t.phone.toLowerCase().includes(q);
      return matchName || matchNip || matchSpec || matchPos || matchPhone;
    }
    return true;
  });

  // Counters
  const countTotal = tutors.length;
  const countTutor = tutors.filter(t => (t.roleType || 'tutor') === 'tutor').length;
  const countPegawai = tutors.filter(t => t.roleType === 'pegawai').length;
  const countPengelola = tutors.filter(t => t.roleType === 'pengelola').length;
  const countActive = tutors.filter(t => t.active).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-emerald-800 text-white px-5 py-3 rounded-2xl shadow-lg font-bold text-xs sm:text-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200 border border-emerald-600">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-300" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-200 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pengaturan Logo Lembaga & Favicon Aplikasi */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0 border-2 border-amber-400 shadow-md">
                <img 
                  src={logoUrl || '/logo.svg'} 
                  alt="Logo Lembaga" 
                  className="w-full h-full object-contain"
                />
              </div>
              {/* Badge mini preview favicon */}
              <div 
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-slate-900 p-0.5 border border-amber-400 shadow-sm flex items-center justify-center"
                title="Favicon Aktif"
              >
                <img 
                  src={useLogoAsFavicon ? (logoUrl || '/logo.svg') : (faviconUrl || '/favicon.svg')} 
                  alt="Favicon" 
                  className="w-full h-full object-contain rounded-md"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-extrabold text-sm sm:text-base text-white">Logo Lembaga & Favicon Aplikasi</h4>
                <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">Kustomisasi</span>
                <span className="text-[10px] bg-blue-500/30 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-400/40">Browser & Mobile</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Ganti logo resmi PKBM untuk Header, Login, Rekapitulasi, sekaligus atur favicon tab browser dan ikon aplikasi Android & iPhone.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsLogoOpen(!isLogoOpen)}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span>{isLogoOpen ? 'Tutup Pengaturan Logo & Favicon' : 'Ganti Logo & Favicon'}</span>
          </button>
        </div>

        {/* Logo & Favicon Customization Panel */}
        {isLogoOpen && (
          <div className="bg-slate-800/90 p-4 sm:p-5 rounded-xl border border-slate-700 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-200">
            {logoSuccessMsg && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 rounded-xl font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{logoSuccessMsg}</span>
              </div>
            )}
            {logoErrorMsg && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-200 rounded-xl font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{logoErrorMsg}</span>
              </div>
            )}

            {/* BAGIAN 1: PENGATURAN LOGO UTAMA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Upload File Logo */}
              <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-slate-700">
                <label className="block font-bold text-amber-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>1. Unggah Berkas Gambar Logo</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Pilih berkas gambar format PNG (latar transparan disarankan), JPG, SVG, atau WebP dari perangkat Anda.
                </p>
                <label className="cursor-pointer border-2 border-dashed border-slate-600 hover:border-amber-400 hover:bg-slate-800/60 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center transition-all block">
                  {isProcessingImage ? (
                    <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-amber-400" />
                  )}
                  <span className="font-extrabold text-white text-xs">
                    {isProcessingImage ? 'Memproses & Mengoptimalkan Gambar...' : 'Pilih File Logo dari Perangkat'}
                  </span>
                  <span className="text-[10px] text-slate-400">Ukuran otomatis dioptimalkan agar ringan & cepat sinkron ke semua komputer</span>
                  <input
                    type="file"
                    disabled={isProcessingImage || isSavingLogo}
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoFileUpload(file);
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Option B: Input URL or Default */}
              <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-slate-700 flex flex-col justify-between">
                <div className="space-y-2">
                  <label className="block font-bold text-blue-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>2. Atau Tempel URL Gambar Logo</span>
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Masukkan alamat link URL logo eksternal yang dapat diakses langsung.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={logoInputUrl}
                      onChange={(e) => setLogoInputUrl(e.target.value)}
                      placeholder="https://... atau /logo.svg"
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 font-mono text-white outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (logoInputUrl.trim()) {
                          setLogoUrl(logoInputUrl.trim());
                          if (useLogoAsFavicon) {
                            setFaviconUrl(logoInputUrl.trim());
                          }
                          setLogoErrorMsg(null);
                        }
                      }}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shrink-0"
                    >
                      Pakai URL
                    </button>
                  </div>
                </div>

                {/* Preview Box */}
                <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white p-1 border border-amber-400 flex items-center justify-center shrink-0 shadow-sm">
                      <img src={logoUrl || '/logo.svg'} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Pratinjau Logo Aktif:</p>
                      <p className="font-bold text-white text-xs truncate max-w-[150px]">
                        {logoUrl.startsWith('data:') ? 'Berkas Baru (Siap Cloud)' : logoUrl}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isSavingLogo}
                    onClick={handleResetToDefaultLogo}
                    className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSavingLogo ? 'animate-spin' : ''}`} />
                    <span>Kembali ke Logo & Favicon Resmi</span>
                  </button>
                </div>
              </div>
            </div>

            {/* BAGIAN 2: PENGATURAN FAVICON & IKON TAB BROWSER */}
            <div className="bg-slate-900/95 p-4 rounded-xl border border-slate-700 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-700/80">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-white text-xs sm:text-sm flex items-center gap-2">
                      <span>Pengaturan Favicon & Ikon Tab Browser</span>
                      <span className="text-[10px] bg-blue-400/20 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-400/30">
                        Web & Mobile App
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Favicon adalah ikon kecil di samping judul tab browser (Google Chrome, Safari, Edge) dan ikon aplikasi saat dipasang ke layar HP Android / iPhone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Checkbox: Sinkron Otomatis dengan Logo Lembaga */}
              <label className="flex items-start gap-3 p-3 bg-slate-800/90 hover:bg-slate-800 rounded-xl border border-slate-700 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={useLogoAsFavicon}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseLogoAsFavicon(checked);
                    if (checked) {
                      setFaviconUrl(logoUrl);
                    }
                  }}
                  className="mt-0.5 w-4 h-4 text-emerald-500 rounded border-slate-600 focus:ring-emerald-400 focus:ring-offset-slate-900 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span>Gunakan Logo Lembaga di atas secara otomatis sebagai Favicon & Ikon Aplikasi</span>
                    {useLogoAsFavicon && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded font-mono">
                        (Aktif Otomatis)
                      </span>
                    )}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Jika dicentang, setiap kali Anda mengganti logo lembaga di atas, favicon tab browser dan ikon aplikasi HP akan otomatis mengikuti gambar logo tersebut.
                  </p>
                </div>
              </label>

              {/* Opsi Kustomisasi Favicon Khusus (jika pengguna ingin favicon terpisah/mandiri) */}
              {!useLogoAsFavicon && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 animate-in fade-in duration-200">
                  {/* Unggah File Khusus Favicon */}
                  <div className="space-y-2 bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                    <label className="block font-bold text-blue-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <Upload className="w-3 h-3" />
                      <span>Unggah Gambar Favicon Khusus</span>
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Disarankan gambar rasio persegi (1:1), format PNG transparan, SVG, atau ICO (resolusi 64x64 atau 128x128 piksel).
                    </p>
                    <label className="cursor-pointer border border-dashed border-slate-600 hover:border-blue-400 hover:bg-slate-700/50 rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 text-center transition-all block">
                      {isProcessingFavicon ? (
                        <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5 text-blue-400" />
                      )}
                      <span className="font-bold text-white text-[11px]">
                        {isProcessingFavicon ? 'Memproses & Memotong Favicon...' : 'Pilih Berkas Favicon (PNG/SVG/ICO)'}
                      </span>
                      <input
                        type="file"
                        disabled={isProcessingFavicon || isSavingLogo}
                        accept="image/png, image/jpeg, image/svg+xml, image/x-icon, image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFaviconFileUpload(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Tempel URL Favicon Khusus */}
                  <div className="space-y-2 bg-slate-800/60 p-3 rounded-xl border border-slate-700 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <label className="block font-bold text-indigo-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon className="w-3 h-3" />
                        <span>Atau Tempel URL Favicon Khusus</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={faviconInputUrl}
                          onChange={(e) => setFaviconInputUrl(e.target.value)}
                          placeholder="https://... atau /favicon.svg"
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg p-1.5 font-mono text-white outline-none focus:ring-2 focus:ring-indigo-400 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (faviconInputUrl.trim()) {
                              setFaviconUrl(faviconInputUrl.trim());
                              setUseLogoAsFavicon(false);
                              setLogoErrorMsg(null);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shrink-0 text-[11px]"
                        >
                          Pakai URL
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Favicon Standar:</span>
                      <button
                        type="button"
                        onClick={handleResetToDefaultFavicon}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Favicon Resmi PKBM</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Pratinjau Interaktif Favicon & Ikon Mobile */}
              <div className="pt-2.5 border-t border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Mockup Tab Browser Chrome / Edge */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-blue-400" />
                      <span>Simulasi Tab Peramban (Browser):</span>
                    </span>
                    <span className="text-[9px] text-emerald-400 font-mono">Live Preview</span>
                  </div>
                  {/* Mini browser tab UI */}
                  <div className="bg-slate-800 rounded-lg p-1.5 flex items-center gap-2 border border-slate-700/70 shadow-inner">
                    <div className="w-5 h-5 rounded bg-white p-0.5 flex items-center justify-center shrink-0 shadow-sm border border-slate-300">
                      <img 
                        src={useLogoAsFavicon ? (logoUrl || '/logo.svg') : (faviconUrl || '/favicon.svg')} 
                        alt="Favicon Tab" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="truncate text-[11px] font-semibold text-slate-200">
                      Presensi Tutor - PKBM Bina Insani
                    </div>
                    <span className="ml-auto text-slate-500 text-[10px] px-1">✕</span>
                  </div>
                </div>

                {/* 2. Mockup Ikon HP Android & iPhone */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-emerald-400" />
                      <span>Simulasi Ikon Layar HP (Android/iOS):</span>
                    </span>
                    <span className="text-[9px] text-slate-400">Home Screen</span>
                  </div>
                  {/* Mini phone screen icon UI */}
                  <div className="flex items-center gap-2.5 bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/60">
                    <div className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 border border-slate-300 shadow-md">
                      <img 
                        src={useLogoAsFavicon ? (logoUrl || '/logo.svg') : (faviconUrl || '/favicon.svg')} 
                        alt="App Icon" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white leading-tight">Presensi PKBM</p>
                      <p className="text-[9px] text-slate-400">Aplikasi Android & iPhone</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setIsLogoOpen(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleSaveLogo}
                disabled={isSavingLogo || isProcessingImage || isProcessingFavicon}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-xl font-extrabold shadow-md flex items-center gap-1.5 transition"
              >
                {isSavingLogo ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Supabase Cloud...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Terapkan & Simpan Logo & Favicon</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Leadership Configuration Banner */}

      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30 shrink-0">
              <Award className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span>Setting Pimpinan & Penanggung Jawab Laporan</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">Kop & TTD Laporan</span>
              </h4>
              <p className="text-xs text-slate-300">
                Atur Pengelola (Yayasan), Kepala PKBM, & Penanggungjawab Absensi untuk tanda tangan dokumen rekapitulasi.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsLeadershipOpen(!isLeadershipOpen)}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isLeadershipOpen ? 'Tutup Setting Pimpinan' : 'Atur Pimpinan & Penanggung Jawab'}</span>
          </button>
        </div>

        {/* Current Leadership Summary Display */}
        {!isLeadershipOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs">
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <p className="text-[10px] text-amber-300 font-bold uppercase">{pkbmInfo.foundationManagerTitle || 'Pengelola Yayasan'}</p>
              <p className="font-extrabold text-white mt-0.5 truncate">{pkbmInfo.foundationManagerName || 'H. Sugeng Wahyudi, S.E.'}</p>
            </div>
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <p className="text-[10px] text-blue-300 font-bold uppercase">Kepala PKBM</p>
              <p className="font-extrabold text-white mt-0.5 truncate">{pkbmInfo.headName || 'Lailatul Arifah, S.H., M.Pd.'}</p>
            </div>
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <p className="text-[10px] text-emerald-300 font-bold uppercase">Penanggungjawab Absensi</p>
              <p className="font-extrabold text-white mt-0.5 truncate">{pkbmInfo.attendanceOfficerName || 'Nunung Khoiriyah'}</p>
            </div>
          </div>
        )}

        {/* Leadership Form */}
        {isLeadershipOpen && (
          <form onSubmit={handleSaveLeadership} className="bg-slate-800/90 p-4 sm:p-5 rounded-xl border border-slate-700 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-200">
            {leadershipSuccessMsg && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 rounded-xl font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{leadershipSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Pengelola Yayasan */}
              <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                <label className="block font-bold text-amber-300 text-[11px] uppercase tracking-wider">
                  1. Pengelola (Yayasan)
                </label>
                <p className="text-[10px] text-slate-400">Jabatan/Gelar:</p>
                <input
                  type="text"
                  value={foundationTitle}
                  onChange={(e) => setFoundationTitle(e.target.value)}
                  placeholder="misal: Pengelola / Ketua Yayasan"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 font-medium text-white outline-none focus:ring-2 focus:ring-amber-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">Nama Pengelola / Ketua Yayasan:</p>
                <input
                  type="text"
                  value={foundationManager}
                  onChange={(e) => setFoundationManager(e.target.value)}
                  placeholder="misal: H. Sugeng Wahyudi, S.E."
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 font-bold text-white outline-none focus:ring-2 focus:ring-amber-400"
                />
                <select
                  onChange={(e) => {
                    if (e.target.value) setFoundationManager(e.target.value);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-300 rounded-lg p-1.5 text-[11px]"
                >
                  <option value="">-- Pilih dari Personel Registered --</option>
                  {tutors.map(t => (
                    <option key={t.id} value={t.name}>{t.name} ({t.position || t.roleType})</option>
                  ))}
                </select>
              </div>

              {/* Kepala PKBM */}
              <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                <label className="block font-bold text-blue-300 text-[11px] uppercase tracking-wider">
                  2. Kepala PKBM Bina Insani
                </label>
                <p className="text-[10px] text-slate-400">Nama Lengkap Kepala PKBM & Gelar:</p>
                <input
                  type="text"
                  required
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  placeholder="misal: Lailatul Arifah, S.H., M.Pd."
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 font-bold text-white outline-none focus:ring-2 focus:ring-blue-400"
                />
                <select
                  onChange={(e) => {
                    if (e.target.value) setHeadName(e.target.value);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-300 rounded-lg p-1.5 text-[11px]"
                >
                  <option value="">-- Pilih dari Personel Registered --</option>
                  {tutors.map(t => (
                    <option key={t.id} value={t.name}>{t.name} ({t.position || t.roleType})</option>
                  ))}
                </select>
              </div>

              {/* Penanggungjawab Absen */}
              <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                <label className="block font-bold text-emerald-300 text-[11px] uppercase tracking-wider">
                  3. Penanggungjawab Absensi
                </label>
                <p className="text-[10px] text-slate-400">Nama Penanggungjawab Absensi:</p>
                <input
                  type="text"
                  required
                  value={attendanceOfficer}
                  onChange={(e) => setAttendanceOfficer(e.target.value)}
                  placeholder="misal: Nunung Khoiriyah"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 font-bold text-white outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <select
                  onChange={(e) => {
                    if (e.target.value) setAttendanceOfficer(e.target.value);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-300 rounded-lg p-1.5 text-[11px]"
                >
                  <option value="">-- Pilih dari Personel Registered --</option>
                  {tutors.map(t => (
                    <option key={t.id} value={t.name}>{t.name} ({t.position || t.roleType})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setIsLeadershipOpen(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold"
              >
                Selesai / Batal
              </button>
              <button
                type="submit"
                disabled={isSavingLeadership}
                className="px-6 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 rounded-xl font-extrabold shadow-md flex items-center gap-1.5 transition"
              >
                {isSavingLeadership ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Cloud...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan Perubahan Pimpinan</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-800 rounded-xl">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Personel</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-800">{countTotal} Orang</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-800 rounded-xl">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tutor / Pendidik</p>
            <p className="text-xl sm:text-2xl font-extrabold text-indigo-900">{countTutor} Orang</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-xl">
            <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pegawai / Staf Admin</p>
            <p className="text-xl sm:text-2xl font-extrabold text-amber-900">{countPegawai + countPengelola} Orang</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-teal-100 text-teal-800 rounded-xl">
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status Aktif</p>
            <p className="text-xl sm:text-2xl font-extrabold text-teal-900">{countActive} Personel</p>
          </div>
        </div>
      </div>

      {/* Main Bar & Actions */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-900 text-amber-400 rounded-2xl shadow">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Kelola Master Data Tutor & Pegawai</h3>
              <p className="text-xs text-slate-500">
                Pusat Data Pendidik & Tenaga Kependidikan PKBM Bina Insani Sumowono
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenSupabaseStatus && (
              <button
                type="button"
                onClick={onOpenSupabaseStatus}
                className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 border border-slate-300 font-bold text-xs sm:text-sm px-4 py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 transition shrink-0"
              >
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Database Supabase</span>
              </button>
            )}

            <button
              onClick={handleOpenAdd}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Tutor / Pegawai Baru</span>
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto text-xs font-bold shrink-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'all' ? 'bg-white text-blue-900 shadow text-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({countTotal})
            </button>
            <button
              onClick={() => setActiveTab('tutor')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'tutor' ? 'bg-blue-600 text-white shadow text-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tutor / Pendidik ({countTutor})
            </button>
            <button
              onClick={() => setActiveTab('pegawai')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'pegawai' ? 'bg-indigo-600 text-white shadow text-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pegawai / Staf ({countPegawai})
            </button>
          </div>

          {/* Search Box & View Mode Toggle */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, NIP, spesialisasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilkan dalam bentuk Tabel Daftar (List)"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Daftar List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilkan dalam bentuk Kartu (Grid)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kartu</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Form Modal / In-page Form */}
      {isFormOpen && (
        <div className="bg-blue-900/10 border-2 border-blue-600/40 p-6 rounded-2xl bg-white shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-200 relative">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-700" />
              {editingId ? 'Edit Data Personel / Tutor / Pegawai' : 'Tambah Personel / Tutor / Pegawai Baru'}
            </h4>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            
            {/* Photo Profile Section */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 p-0.5 shadow border-2 border-amber-400 flex items-center justify-center overflow-hidden shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto Profil" className="w-full h-full object-cover rounded-[14px]" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-white text-lg bg-blue-700 rounded-[14px]">
                    {name ? name.charAt(0).toUpperCase() : <Users className="w-6 h-6" />}
                  </div>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left space-y-1">
                <p className="font-bold text-slate-800 text-xs">Foto Profil Personel</p>
                <p className="text-[11px] text-slate-500">Pasang atau ganti foto profil resmi untuk tutor / staf ini.</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-bold text-xs cursor-pointer shadow-sm inline-flex items-center gap-1.5 transition">
                    <Upload className="w-3.5 h-3.5 text-amber-300" />
                    <span>Pilih / Ganti Foto</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handlePersonPhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs inline-flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Foto</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Role Select */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer font-bold ${
                roleType === 'tutor' ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-white border-slate-200 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="roleType"
                  value="tutor"
                  checked={roleType === 'tutor'}
                  onChange={() => setRoleType('tutor')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Tutor / Pendidik</span>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer font-bold ${
                roleType === 'pegawai' ? 'bg-indigo-50 border-indigo-500 text-indigo-900' : 'bg-white border-slate-200 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="roleType"
                  value="pegawai"
                  checked={roleType === 'pegawai'}
                  onChange={() => setRoleType('pegawai')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <span>Pegawai / Staf Admin</span>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer font-bold ${
                roleType === 'pengelola' ? 'bg-purple-50 border-purple-500 text-purple-900' : 'bg-white border-slate-200 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="roleType"
                  value="pengelola"
                  checked={roleType === 'pengelola'}
                  onChange={() => setRoleType('pengelola')}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <Building className="w-4 h-4 text-purple-600" />
                <span>Pengelola / Pimpinan</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="misal: Tri Wahyuni, S.Pd."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kode NIP / ID Pegawai</label>
                <input
                  type="text"
                  value={nipCode}
                  onChange={(e) => setNipCode(e.target.value)}
                  placeholder={roleType === 'pegawai' ? 'misal: ADM-BIN-003' : 'misal: TUT-BIN-006'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jabatan / Posisi Kerja</label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder={roleType === 'tutor' ? 'misal: Tutor Utama Paket C' : 'misal: Staf Keuangan & BOSP'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Spesialisasi / Keahlian Utama</label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="misal: Matematika Kesetaraan / Administrasi Dapodik"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor HP / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="misal: 081234567890"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">PIN Login Portal (4 Digit)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Masukkan PIN (misal: 4 digit)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Status Toggle */}
            <div className="flex items-center gap-3 pt-2">
              <label className="font-bold text-slate-700">Status Kepegawaian:</label>
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  active ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {active ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                <span>{active ? 'AKTIF (Dapat Presensi & Login)' : 'NON-AKTIF'}</span>
              </button>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={resetForm}
                className="bg-white hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-bold border border-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-2.5 rounded-xl font-bold shadow"
              >
                {editingId ? 'Simpan Perubahan' : 'Tambah Personel Baru'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Data Personel & Tutor (List or Grid View) */}
      {filteredList.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
          <p className="font-bold text-slate-700">Tidak ada data personel ditemukan.</p>
          <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau ganti tab filter.</p>
        </div>
      ) : viewMode === 'list' ? (
        /* TAMPILAN DAFTAR (LIST / TABEL TERSTRUKTUR) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          
          {/* Mobile Friendly Compact List View (Visible on small screens) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredList.map((person, index) => {
              const isPegawai = person.roleType === 'pegawai';
              const isPengelola = person.roleType === 'pengelola';

              return (
                <div 
                  key={person.id} 
                  className={`p-4 space-y-3 transition-colors ${
                    !person.active ? 'bg-slate-50/70 opacity-60' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-mono font-bold text-slate-400 w-5">
                        #{index + 1}
                      </div>
                      <div className={`w-10 h-10 rounded-full font-black flex items-center justify-center text-xs shrink-0 border overflow-hidden ${
                        isPengelola 
                          ? 'bg-purple-100 text-purple-900 border-purple-300' 
                          : isPegawai 
                            ? 'bg-blue-100 text-blue-900 border-blue-300' 
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}>
                        {person.avatarUrl ? (
                          <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                        ) : (
                          person.name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{person.name}</h4>
                        <p className="text-[11px] font-mono text-slate-500">{person.nipCode || '-'}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(person)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${
                        person.active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {person.active ? 'Aktif' : 'Non-Aktif'}
                    </button>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                        isPengelola
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : isPegawai
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {isPengelola ? 'Pengelola' : isPegawai ? 'Pegawai Admin' : 'Tutor Pendidik'}
                      </span>
                      {person.phone && (
                        <a 
                          href={`https://wa.me/${person.phone.replace(/[^0-9]/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-emerald-700 font-semibold flex items-center gap-1 text-xs"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{person.phone}</span>
                        </a>
                      )}
                    </div>
                    {person.position && (
                      <p className="text-slate-700 font-medium">{person.position}</p>
                    )}
                    <p className="text-slate-600">
                      <strong className="text-slate-700">Tugas:</strong> {person.specialization || '-'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => handleResetPin(person)}
                      className="text-slate-500 hover:text-emerald-800 font-medium flex items-center gap-1 text-[11px]"
                    >
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reset PIN</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(person)}
                        className="px-2.5 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-bold flex items-center gap-1 text-[11px]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(person.id, person.name)}
                        className="px-2.5 py-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg font-bold flex items-center gap-1 text-[11px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop & Tablet Full Table View (Clean, highly legible list) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-3 text-center w-12 text-slate-400">No</th>
                  <th className="py-3.5 px-4">Nama Lengkap & NIP</th>
                  <th className="py-3.5 px-4">Peran & Posisi</th>
                  <th className="py-3.5 px-4">Spesialisasi / Tugas</th>
                  <th className="py-3.5 px-4">No. HP / WhatsApp</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredList.map((person, index) => {
                  const isPegawai = person.roleType === 'pegawai';
                  const isPengelola = person.roleType === 'pengelola';

                  return (
                    <tr 
                      key={person.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        !person.active ? 'bg-slate-50/60 opacity-60 text-slate-500' : 'text-slate-800'
                      }`}
                    >
                      {/* No */}
                      <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-xs">
                        {index + 1}
                      </td>

                      {/* Nama & NIP */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full font-black flex items-center justify-center text-xs shrink-0 border overflow-hidden ${
                            isPengelola 
                              ? 'bg-purple-100 text-purple-900 border-purple-300' 
                              : isPegawai 
                                ? 'bg-blue-100 text-blue-900 border-blue-300' 
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}>
                            {person.avatarUrl ? (
                              <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                            ) : (
                              person.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm leading-snug">
                              {person.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              {person.nipCode || '-'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Peran & Posisi */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                            isPengelola
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : isPegawai
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {isPengelola ? (
                              <>
                                <Award className="w-3 h-3" />
                                <span>Pengelola</span>
                              </>
                            ) : isPegawai ? (
                              <>
                                <Briefcase className="w-3 h-3" />
                                <span>Pegawai Admin</span>
                              </>
                            ) : (
                              <>
                                <GraduationCap className="w-3 h-3" />
                                <span>Tutor Pendidik</span>
                              </>
                            )}
                          </span>
                          {person.position && (
                            <p className="text-xs text-slate-600 font-medium truncate max-w-[190px]">
                              {person.position}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Spesialisasi / Tugas */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-[220px]">
                          <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 font-medium rounded-lg text-xs border border-slate-200/80">
                            {person.specialization || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Kontak WhatsApp & PIN */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {person.phone ? (
                            <a 
                              href={`https://wa.me/${person.phone.replace(/[^0-9]/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 text-xs hover:underline"
                              title="Kirim Pesan WhatsApp"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{person.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Lock className="w-2.5 h-2.5 text-slate-400" />
                            <span>PIN: {person.pin ? '••••' : '-'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status Kepegawaian */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(person)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border ${
                            person.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Klik untuk ubah status aktif/nonaktif"
                        >
                          {person.active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3 text-rose-600" />
                              <span>Non-Aktif</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(person)}
                            title="Edit Data Personel"
                            className="p-1.5 text-blue-600 hover:bg-blue-100/80 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResetPin(person)}
                            title="Reset PIN Login"
                            className="p-1.5 text-amber-600 hover:bg-amber-100/80 rounded-lg transition-colors"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(person.id, person.name)}
                            title="Hapus Data Personel"
                            className="p-1.5 text-rose-600 hover:bg-rose-100/80 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer list bar */}
          <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 text-slate-500 text-xs flex items-center justify-between">
            <span>Menampilkan <strong>{filteredList.length}</strong> data personel / tutor</span>
            <span className="text-[11px] text-slate-400">Format: Tabel Daftar (List)</span>
          </div>
        </div>
      ) : (
        /* TAMPILAN KARTU (GRID) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((person) => {
            const isPegawai = person.roleType === 'pegawai';
            const isPengelola = person.roleType === 'pengelola';

            return (
              <div 
                key={person.id} 
                className={`bg-white p-5 rounded-2xl border transition-all space-y-3 relative group shadow-sm hover:shadow-md ${
                  !person.active ? 'opacity-60 bg-slate-50 border-slate-200' : 'border-slate-200'
                }`}
              >
                {/* Header Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full font-extrabold flex items-center justify-center text-sm border shrink-0 overflow-hidden ${
                      isPengelola 
                        ? 'bg-purple-100 text-purple-900 border-purple-300' 
                        : isPegawai 
                          ? 'bg-blue-100 text-blue-900 border-blue-300' 
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    }`}>
                      {person.avatarUrl ? (
                        <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                      ) : (
                        person.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          isPengelola
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : isPegawai
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isPengelola ? 'Pengelola' : isPegawai ? 'Pegawai Admin' : 'Tutor Pendidik'}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-slate-500">
                          {person.nipCode}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight mt-1">{person.name}</h4>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(person)}
                      title="Edit Data"
                      className="text-slate-400 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(person.id, person.name)}
                      title="Hapus Personel"
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Body Information */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                  {person.position && (
                    <p className="text-slate-700 font-semibold flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                      <span>{person.position}</span>
                    </p>
                  )}
                  <p className="text-slate-600">
                    <strong className="text-slate-800">Spesialisasi/Tugas:</strong> {person.specialization}
                  </p>
                  <p className="text-slate-600 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{person.phone}</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-600" />
                      PIN: {person.pin ? '••••' : '-'}
                    </span>
                  </p>
                </div>

                {/* Footer Status & Reset PIN */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => handleToggleActive(person)}
                    className={`font-semibold inline-flex items-center gap-1 hover:underline ${
                      person.active ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {person.active ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Status: Aktif
                      </>
                    ) : (
                      <>
                        <UserX className="w-3.5 h-3.5 text-rose-600" />
                        Status: Non-Aktif
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleResetPin(person)}
                    className="text-slate-500 hover:text-emerald-800 font-medium flex items-center gap-1 underline text-[10px]"
                  >
                    <Key className="w-3 h-3 text-slate-400" />
                    Reset PIN
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {personToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Konfirmasi Hapus Personel</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              Apakah Anda yakin ingin menghapus data <strong>"{personToDelete.name}"</strong> dari daftar tutor & pegawai PKBM?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPersonToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeletePerson}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-extrabold shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};


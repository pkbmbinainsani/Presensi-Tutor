import React, { useState } from 'react';
import { 
  MapPin, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Navigation, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Globe, 
  Info,
  Building2,
  X,
  Compass,
  Radio,
  Table,
  LayoutGrid,
  Lock,
  Unlock
} from 'lucide-react';
import { ClassLocation } from '../types';
import { INITIAL_CLASS_LOCATIONS } from '../data/mockData';
import { MapView } from './MapView';

interface LocationManagerModalProps {
  locations: ClassLocation[];
  onSaveLocations: (updatedLocations: ClassLocation[]) => void;
}

export const LocationManagerModal: React.FC<LocationManagerModalProps> = ({
  locations,
  onSaveLocations
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLocation, setEditingLocation] = useState<ClassLocation | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'table' | 'map'>('table');
  const [isLocationLocked, setIsLocationLocked] = useState<boolean>(() => {
    return localStorage.getItem('pkbm_location_locked') !== 'false';
  });

  const handleToggleLock = () => {
    const newValue = !isLocationLocked;
    setIsLocationLocked(newValue);
    localStorage.setItem('pkbm_location_locked', newValue ? 'true' : 'false');
  };

  // Form State for Adding / Editing
  const [formData, setFormData] = useState<Omit<ClassLocation, 'id'>>({
    name: '',
    address: '',
    latitude: -7.21854,
    longitude: 110.33402,
    radiusMeters: 500,
    isMainBranch: false,
    notes: '',
    active: true
  });

  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  // Filter locations by search
  const filteredLocations = locations.filter(loc => 
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (loc.notes && loc.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle open Add Modal
  const handleOpenAdd = () => {
    setEditingLocation(null);
    setFormData({
      name: '',
      address: '',
      latitude: -7.21854,
      longitude: 110.33402,
      radiusMeters: 500,
      isMainBranch: false,
      notes: '',
      active: true
    });
    setGpsMessage(null);
    setIsAddModalOpen(true);
  };

  // Handle open Edit Modal
  const handleOpenEdit = (loc: ClassLocation) => {
    setEditingLocation(loc);
    setFormData({
      name: loc.name,
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
      radiusMeters: loc.radiusMeters,
      isMainBranch: loc.isMainBranch || false,
      notes: loc.notes || '',
      active: loc.active
    });
    setGpsMessage(null);
    setIsAddModalOpen(true);
  };

  // Get GPS for pre-filling coordinates in form
  const handleFetchCurrentGps = () => {
    if (!navigator.geolocation) {
      setGpsMessage('Perangkat tidak mendukung geolokasi.');
      return;
    }
    setIsGettingGps(true);
    setGpsMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6))
        }));
        setGpsMessage(`📍 Koordinat terkunci dari GPS (Presisi: ±${Math.round(pos.coords.accuracy)}m)`);
        setIsGettingGps(false);
      },
      (err) => {
        console.warn('GPS Error:', err);
        setGpsMessage('Gagal mengambil lokasi GPS. Silakan masukkan koordinat secara manual.');
        setIsGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Save location (Add or Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingLocation) {
      // Edit
      const updated = locations.map(loc => 
        loc.id === editingLocation.id 
          ? { ...editingLocation, ...formData }
          : formData.isMainBranch ? { ...loc, isMainBranch: false } : loc
      );
      onSaveLocations(updated);
    } else {
      // Add
      const newLoc: ClassLocation = {
        id: `loc-${Date.now()}`,
        ...formData
      };
      const updated = formData.isMainBranch
        ? locations.map(l => ({ ...l, isMainBranch: false })).concat(newLoc)
        : [...locations, newLoc];
      onSaveLocations(updated);
    }

    setIsAddModalOpen(false);
  };

  // Delete location
  const handleDeleteLocation = (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus lokasi kelas "${name}"?`)) {
      const updated = locations.filter(l => l.id !== id);
      onSaveLocations(updated);
    }
  };

  // Toggle active status
  const handleToggleActive = (id: string) => {
    const updated = locations.map(l => 
      l.id === id ? { ...l, active: !l.active } : l
    );
    onSaveLocations(updated);
  };

  // Reset default locations
  const handleResetDefault = () => {
    if (window.confirm('Kembalikan daftar lokasi ke 9 titik lokasi standar PKBM Bina Insani? Data lokasi custom yang ditambahkan akan disesuaikan.')) {
      onSaveLocations(INITIAL_CLASS_LOCATIONS);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-blue-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/80 border border-blue-600 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Compass className="w-3.5 h-3.5" />
              <span>Sistem Geofencing Multititik</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
              Pengaturan Titik Lokasi Kelas & Geofence
            </h2>
            <p className="text-blue-200 text-xs sm:text-sm mt-1 max-w-2xl">
              Kelola daftar koordinat GPS dan radius validasi presensi untuk gedung utama, kantor yayasan, dan seluruh kelompok kelas/pondok pesantren mitra PKBM Bina Insani.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-blue-950 font-bold rounded-xl shadow-lg flex items-center gap-2 text-sm transition-all transform hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tambah Lokasi Kelas</span>
            </button>
            <button
              onClick={handleResetDefault}
              title="Reset ke 9 lokasi awal"
              className="px-3 py-2.5 bg-blue-800/80 hover:bg-blue-700 border border-blue-600 text-blue-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset Default</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-blue-800/80 text-xs">
          <div className="bg-blue-950/60 p-3 rounded-xl border border-blue-800/50">
            <p className="text-blue-300 font-medium">Total Titik Lokasi</p>
            <p className="text-xl font-black text-white mt-0.5">{locations.length} Lokasi</p>
          </div>
          <div className="bg-blue-950/60 p-3 rounded-xl border border-blue-800/50">
            <p className="text-blue-300 font-medium">Status Aktif</p>
            <p className="text-xl font-black text-emerald-400 mt-0.5">
              {locations.filter(l => l.active).length} Aktif
            </p>
          </div>
          <div className="bg-blue-950/60 p-3 rounded-xl border border-blue-800/50">
            <p className="text-blue-300 font-medium">Gedung Pusat</p>
            <p className="text-sm font-bold text-amber-300 mt-1 truncate">
              {locations.find(l => l.isMainBranch)?.name || 'Gedung Utama'}
            </p>
          </div>
          <div className="bg-blue-950/60 p-3 rounded-xl border border-blue-800/50">
            <p className="text-blue-300 font-medium">Rata-rata Radius</p>
            <p className="text-xl font-black text-blue-200 mt-0.5">
              {Math.round(locations.reduce((acc, l) => acc + l.radiusMeters, 0) / (locations.length || 1))}m
            </p>
          </div>
        </div>
      </div>

      {/* Admin Geofence Lock Control Banner */}
      <div className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
        isLocationLocked 
          ? 'bg-amber-500/10 border-amber-300/80 bg-gradient-to-r from-amber-50 to-orange-50' 
          : 'bg-slate-100 border-slate-300'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-xl shrink-0 ${
            isLocationLocked ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-300 text-slate-700'
          }`}>
            {isLocationLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-base">
                Status Penguncian Lokasi Presensi (Geofence Lock)
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isLocationLocked ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-200 text-slate-700'
              }`}>
                {isLocationLocked ? '🔒 TERKUNCI (Wajib Dalam Radius)' : '🔓 BEBAS (Di Luar Radius Diizinkan)'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              {isLocationLocked ? (
                <span>
                  <strong>Mode Terkunci Aktif:</strong> Tutor <strong>TIDAK DAPAT</strong> mengirim presensi jika posisi GPS berada di luar radius lokasi kelas yang ditentukan.
                </span>
              ) : (
                <span>
                  <strong>Mode Bebas/Terbuka:</strong> Tutor dapat mengirim presensi meskipun di luar radius (akan dicatat sebagai 'Hadir Lapangan').
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleLock}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition-all shrink-0 flex items-center gap-2 active:scale-95 ${
            isLocationLocked
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {isLocationLocked ? (
            <>
              <Unlock className="w-4 h-4" />
              <span>Buka Kunci Lokasi</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Kunci Lokasi Presensi</span>
            </>
          )}
        </button>
      </div>

      {/* Navigation Toolbar & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama lokasi atau alamat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto justify-center">
          <button
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'table' 
                ? 'bg-white text-blue-900 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-blue-700" />
            <span>Tabel Lokasi ({filteredLocations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'map' 
                ? 'bg-white text-blue-900 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>Peta Interaktif</span>
          </button>
        </div>
      </div>

      {/* Map View Mode */}
      {activeTab === 'map' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Peta Seluruh Titik Lokasi Kelas PKBM Bina Insani</span>
            </h3>
            <span className="text-xs text-slate-500">
              Lingkaran hijau menggambarkan jangkauan radius geofencing presensi
            </span>
          </div>

          <MapView locations={locations} />
        </div>
      )}

      {/* Table View Mode (Clean Managed Table) */}
      {activeTab === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  <th className="py-3.5 px-4 text-center w-12">No</th>
                  <th className="py-3.5 px-4">Nama Titik Lokasi Kelas / PP</th>
                  <th className="py-3.5 px-4">Alamat & Keterangan</th>
                  <th className="py-3.5 px-4">Koordinat GPS</th>
                  <th className="py-3.5 px-4 text-center">Radius</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      Tidak ditemukan data lokasi kelas yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((loc, idx) => (
                    <tr 
                      key={loc.id} 
                      className={`hover:bg-blue-50/40 transition-colors ${
                        !loc.active ? 'bg-slate-50/60 opacity-60' : loc.isMainBranch ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* No */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-500 font-semibold">
                        {idx + 1}
                      </td>

                      {/* Nama Lokasi & Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {loc.name}
                            </span>
                            {loc.isMainBranch && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[10px] font-bold shrink-0">
                                Gedung Utama
                              </span>
                            )}
                          </div>
                          {loc.notes && (
                            <span className="text-[11px] text-slate-500 italic">
                              "{loc.notes}"
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Alamat */}
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                        <div className="flex items-start gap-1.5">
                          <Navigation className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{loc.address}</span>
                        </div>
                      </td>

                      {/* Koordinat */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        <div className="bg-slate-100 px-2 py-1 rounded border border-slate-200 inline-block">
                          Lat: {loc.latitude}<br/>
                          Lng: {loc.longitude}
                        </div>
                      </td>

                      {/* Radius */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs inline-flex items-center gap-1">
                          <Radio className="w-3 h-3 text-emerald-600" />
                          {loc.radiusMeters}m
                        </span>
                      </td>

                      {/* Status Aktif */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(loc.id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 mx-auto transition-transform hover:scale-105 ${
                            loc.active 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : 'bg-slate-200 text-slate-600 border border-slate-300'
                          }`}
                        >
                          {loc.active ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-slate-400" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(loc)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Edit Lokasi"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(loc.id, loc.name)}
                            className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                            title="Hapus Lokasi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Menampilkan <b>{filteredLocations.length}</b> dari <b>{locations.length}</b> lokasi terdaftar</span>
            <span className="italic">Seluruh titik kelas ini terhubung secara otomatis dengan geofencing sistem presensi mandiri tutor.</span>
          </div>
        </div>
      )}

      {/* Modal Dialog for Add / Edit */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-400 rounded-xl text-blue-950 font-bold">
                  <MapPin className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {editingLocation ? 'Edit Titik Lokasi Kelas' : 'Tambah Titik Lokasi Kelas Baru'}
                  </h3>
                  <p className="text-xs text-blue-200">
                    Atur nama lokasi, koordinat GPS, dan radius presensi
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveForm} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Titik Lokasi / PP / Kelas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kelas PP Miftahul Jannah Bedono"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Alamat Lengkap / Keterangan Wilayah
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Dusun Bedono, Desa Bedono, Kec. Jambu, Kab. Semarang"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Coordinates & GPS Button */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Koordinat GPS (Latitude & Longitude)
                  </span>
                  <button
                    type="button"
                    onClick={handleFetchCurrentGps}
                    disabled={isGettingGps}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
                  >
                    <Compass className={`w-3.5 h-3.5 ${isGettingGps ? 'animate-spin' : ''}`} />
                    <span>{isGettingGps ? 'Mendeteksi...' : 'Kunci GPS Saya'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800"
                    />
                  </div>
                </div>

                {gpsMessage && (
                  <p className="text-xs font-medium text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                    {gpsMessage}
                  </p>
                )}
              </div>

              {/* Radius Geofencing */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Radius Geofence Presensi (Meter)
                  </label>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {formData.radiusMeters} Meter
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={50}
                  value={formData.radiusMeters}
                  onChange={(e) => setFormData({ ...formData, radiusMeters: parseInt(e.target.value) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>100m (Ketat)</span>
                  <span>300m</span>
                  <span>500m (Standar PP)</span>
                  <span>1000m</span>
                  <span>2000m (Luas)</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catatan Tambahan / Program Terkait
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Khusus kelas santri Paket C, jadwal Sabtu & Minggu"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.isMainBranch}
                    onChange={(e) => setFormData({ ...formData, isMainBranch: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Jadikan Gedung Utama (Pusat PKBM)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Status Lokasi Aktif</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  {editingLocation ? 'Simpan Perubahan' : 'Tambah Lokasi Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


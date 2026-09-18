import React, { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Clock, User, Award, ShieldCheck, Download, ExternalLink, Maximize2, Smartphone, Monitor, Camera, Loader2 } from 'lucide-react';
import { AttendanceRecord } from '../types';
import { formatWibDateIndo, formatTimeWibDisplay } from '../lib/dateUtils';
import { fetchAttendancePhotoOnline } from '../lib/supabase';

interface PhotoWatermarkModalProps {
  record: AttendanceRecord | null;
  onClose: () => void;
}

export const PhotoWatermarkModal: React.FC<PhotoWatermarkModalProps> = ({ record, onClose }) => {
  if (!record) return null;

  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>(record.photoUrl || '');
  const [isLoadingPhoto, setIsLoadingPhoto] = useState<boolean>(false);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number; isPortrait: boolean } | null>(null);

  useEffect(() => {
    if (!record) return;
    if (record.photoUrl) {
      setCurrentPhotoUrl(record.photoUrl);
      return;
    }
    // If photoUrl was stripped for local storage quota, fetch on-demand from Supabase
    setIsLoadingPhoto(true);
    fetchAttendancePhotoOnline(record.id).then(url => {
      if (url) {
        setCurrentPhotoUrl(url);
      }
      setIsLoadingPhoto(false);
    }).catch(() => {
      setIsLoadingPhoto(false);
    });
  }, [record]);

  const formattedDate = formatWibDateIndo(record.date, 'withDay');

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth || 800;
    const h = img.naturalHeight || 600;
    setImgDimensions({
      width: w,
      height: h,
      isPortrait: h > w
    });
  };

  const handleDownloadPhoto = () => {
    if (!currentPhotoUrl) return;
    const link = document.createElement('a');
    link.href = currentPhotoUrl;
    const safeTutor = record.tutorName.replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `Presensi_${safeTutor}_${record.date}_${imgDimensions?.isPortrait ? 'portrait' : 'landscape'}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700/60 rounded-xl border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base leading-tight">Bukti Presensi &amp; Foto Kegiatan Full</h3>
                {imgDimensions && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                    imgDimensions.isPortrait 
                      ? 'bg-blue-950/80 text-blue-200 border-blue-400/40' 
                      : 'bg-amber-950/80 text-amber-200 border-amber-400/40'
                  }`}>
                    {imgDimensions.isPortrait ? (
                      <>
                        <Smartphone className="w-3 h-3 text-blue-300" />
                        <span>Mode Potret (Tegak) • {imgDimensions.width}×{imgDimensions.height}</span>
                      </>
                    ) : (
                      <>
                        <Monitor className="w-3 h-3 text-amber-300" />
                        <span>Mode Lanskap (Melebar) • {imgDimensions.width}×{imgDimensions.height}</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-200">PKBM BINA INSANI SUMOWONO • Tampilan Pandangan Luas Penuh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1.5 rounded-xl hover:bg-emerald-700/50 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* Photo Frame with Full Adaptive Orientation & Watermark Stamp Overlay */}
          <div className="relative rounded-2xl overflow-hidden border-2 border-slate-900 shadow-xl bg-slate-950 group flex flex-col items-center justify-center min-h-[260px]">
            {isLoadingPhoto ? (
              <div className="py-20 flex flex-col items-center justify-center text-emerald-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-xs text-slate-300 font-medium">Mengunduh foto dokumentasi dari Supabase...</p>
              </div>
            ) : currentPhotoUrl ? (
              <img
                src={currentPhotoUrl}
                alt={record.subjectTitle}
                onLoad={handleImageLoad}
                className="max-h-[60vh] sm:max-h-[65vh] w-auto max-w-full object-contain mx-auto rounded-xl transition-all duration-300"
              />
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Camera className="w-12 h-12 opacity-50" />
                <p className="text-xs text-slate-400">Foto kegiatan tidak dilampirkan atau belum tersedia</p>
              </div>
            )}

            {/* Official Stamped Info Bar */}
            <div className="w-full bg-slate-900 border-t border-slate-800 p-3 sm:p-4 text-white">
              <div className="border-l-4 border-emerald-500 pl-3 py-0.5 space-y-1">
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-black text-emerald-400 tracking-wide uppercase">
                  <span>PKBM BINA INSANI SUMOWONO</span>
                  <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded text-[10px]">
                    VERIFIED GPS
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-white">
                  {record.tutorName} • {record.program}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    {formattedDate} • {formatTimeWibDisplay(record.timeStart)} WIB
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[10px] sm:text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    Lat: {record.location.latitude.toFixed(5)}, Lng: {record.location.longitude.toFixed(5)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-sm">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                Detail Kegiatan Pembelajaran
              </span>
              <div>
                <p className="font-extrabold text-slate-900 text-sm">{record.subjectTitle}</p>
                <p className="text-xs text-slate-600 font-semibold">{record.classGroup}</p>
              </div>
              <div className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 mt-2">
                <strong className="text-slate-900">Materi / Catatan:</strong> {record.activityNotes || '-'}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                Verifikasi Geofence Real-time
              </span>
              <div className="space-y-1 text-xs text-slate-700">
                <p className="flex justify-between">
                  <span className="text-slate-500">Status Titik Presensi:</span>
                  <span className={`font-extrabold px-2 py-0.5 rounded-md ${
                    record.status === 'Dinas Luar'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : record.location.isWithinRadius 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                  }`}>
                    {record.status === 'Dinas Luar' ? '💼 Dinas Luar' : record.status}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Jarak ke Titik Resmi:</span>
                  <span className="font-bold text-slate-800">{record.location.distanceToCenterMeters || 0} meter</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Akurasi GPS HP:</span>
                  <span className="font-bold text-slate-800">±{record.location.accuracy}m</span>
                </p>
                <p className="text-slate-600 pt-1 border-t border-slate-200">
                  <strong className="text-slate-700">Titik / Alamat:</strong><br />
                  {record.location.matchedLocationName || record.location.address || "Kecamatan Sumowono, Kabupaten Semarang"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 sm:px-6 py-3.5 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadPhoto}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
            title="Unduh file foto asli ini ke galeri/komputer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Foto Asli</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

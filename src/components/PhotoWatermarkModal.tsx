import React from 'react';
import { X, MapPin, Calendar, Clock, User, Award, ShieldCheck } from 'lucide-react';
import { AttendanceRecord } from '../types';
import { formatWibDateIndo, formatTimeWibDisplay } from '../lib/dateUtils';

interface PhotoWatermarkModalProps {
  record: AttendanceRecord | null;
  onClose: () => void;
}

export const PhotoWatermarkModal: React.FC<PhotoWatermarkModalProps> = ({ record, onClose }) => {
  if (!record) return null;

  const formattedDate = formatWibDateIndo(record.date, 'withDay');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700/60 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Bukti Presensi & Foto Kegiatan</h3>
              <p className="text-xs text-emerald-200">PKBM BINA INSANI SUMOWONO</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-700/50 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Photo Frame with Watermark Stamp Overlay */}
          <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 shadow-md bg-slate-950 group">
            <img
              src={record.photoUrl}
              alt={record.subjectTitle}
              className="w-full h-80 object-cover object-center"
            />

            {/* Official Stamped Watermark Banner */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-4 text-white">
              <div className="border-l-4 border-emerald-500 pl-3 py-0.5 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 tracking-wide uppercase">
                  <span>PKBM BINA INSANI SUMOWONO</span>
                  <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded text-[10px]">
                    VERIFIED GPS
                  </span>
                </div>
                <div className="text-sm font-bold text-white">
                  {record.tutorName} • {record.program}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    {formattedDate} • {formatTimeWibDisplay(record.timeStart)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    Lat: {record.location.latitude.toFixed(5)}, Lng: {record.location.longitude.toFixed(5)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Detail Kegiatan
              </span>
              <div>
                <p className="font-bold text-slate-800">{record.subjectTitle}</p>
                <p className="text-xs text-slate-600">{record.classGroup}</p>
              </div>
              <div className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200 mt-2">
                <strong>Catatan Materi:</strong> {record.activityNotes}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Verifikasi Lokasi Real-time
              </span>
              <div className="space-y-1 text-xs text-slate-700">
                <p className="flex justify-between">
                  <span className="text-slate-500">Status Geofence:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded ${
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
                  <span className="text-slate-500">Jarak ke Pusat PKBM:</span>
                  <span className="font-semibold text-slate-800">{record.location.distanceToCenterMeters || 0} meter</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Akurasi Perangkat:</span>
                  <span className="font-semibold text-slate-800">±{record.location.accuracy}m</span>
                </p>
                <p className="text-slate-600 pt-1 border-t border-slate-200">
                  <strong className="text-slate-700">Alamat Terdeteksi:</strong><br />
                  {record.location.address || "Kecamatan Sumowono, Kabupaten Semarang"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  X, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'login' | 'floating';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  variant = 'header',
  className = ''
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already running in standalone mode (already launched as installed app)
  if (isInstalled && !showGuideModal) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'accepted') {
        setJustInstalled(true);
        setTimeout(() => setJustInstalled(false), 4000);
      } else if (outcome === 'manual') {
        setShowGuideModal(true);
      }
    } else {
      // On iOS or browsers without native prompt event, show interactive guide
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleInstallClick}
          title="Pasang Aplikasi di Layar Utama HP / Laptop"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 active:scale-95 text-white border border-emerald-400/50 shadow-md shadow-emerald-950/40 text-[11px] font-black transition-all cursor-pointer ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>Pasang Aplikasi</span>
          <span className="hidden sm:inline-block px-1.5 py-0.2 bg-emerald-950/60 text-emerald-200 text-[9px] rounded-full border border-emerald-400/30">PWA</span>
        </button>
      )}

      {variant === 'login' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md border border-emerald-400/40 transition-all active:scale-98 cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4 text-amber-300" />
          <span>Pasang Pintasan Aplikasi di HP (Android & iPhone)</span>
        </button>
      )}

      {/* Guide Modal for iOS Safari / Android Manual */}
      {showGuideModal && (
        <PWAInstallModal
          isIOS={isIOS}
          isAndroid={isAndroid}
          onClose={() => setShowGuideModal(false)}
          onTriggerInstall={isInstallable ? handleInstallClick : undefined}
        />
      )}
    </>
  );
};

interface PWAInstallModalProps {
  isIOS: boolean;
  isAndroid: boolean;
  onClose: () => void;
  onTriggerInstall?: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isIOS,
  isAndroid,
  onClose,
  onTriggerInstall
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Header with App Logo & Title */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-emerald-950 p-6 text-white text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-20 h-20 mx-auto rounded-2xl bg-white p-2.5 shadow-xl border-2 border-amber-400 flex items-center justify-center mb-3">
            <img 
              src="/logo.svg" 
              alt="Icon PKBM" 
              className="w-full h-full object-contain"
            />
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            APLIKASI RESMI PWA
          </span>
          <h3 className="text-lg font-black text-white mt-1.5">
            Absensi Tutor PKBM Bina Insani
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Tambahkan ke Layar Utama HP untuk akses cepat satu ketukan dengan ikon resmi.
          </p>
        </div>

        {/* Modal Body: Instructions */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {isIOS ? (
            /* iOS Safari Step-by-Step */
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-black text-slate-800 pb-1 border-b border-slate-100">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Panduan Pemasangan di iPhone / iPad (Safari)</span>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-xs shadow">
                  1
                </div>
                <div className="text-xs text-slate-700">
                  <p className="font-bold text-slate-900">Ketuk Tombol Bagikan (Share)</p>
                  <p className="text-slate-500 mt-0.5">
                    Pada bilah bawah Safari, ketuk tombol <strong>Bagikan</strong> (ikon kotak dengan panah menghadap ke atas <Share className="w-3.5 h-3.5 inline text-blue-600" />).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-xs shadow">
                  2
                </div>
                <div className="text-xs text-slate-700">
                  <p className="font-bold text-slate-900">Pilih "Tambahkan ke Layar Utama"</p>
                  <p className="text-slate-500 mt-0.5">
                    Gulir ke bawah pada menu pop-up dan ketuk opsi <strong>"Tambahkan ke Layar Utama"</strong> (Add to Home Screen <PlusSquare className="w-3.5 h-3.5 inline text-emerald-600" />).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-xs shadow">
                  3
                </div>
                <div className="text-xs text-slate-700">
                  <p className="font-bold text-slate-900">Ketuk "Tambah" (Add)</p>
                  <p className="text-slate-500 mt-0.5">
                    Ketuk tombol <strong>Tambah</strong> di pojok kanan atas layar iPhone Anda.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <p>
                  Selesai! Ikon resmi <strong>Absensi PKBM</strong> akan langsung tampil di beranda iPhone layaknya aplikasi App Store tanpa batas waktu.
                </p>
              </div>
            </div>
          ) : (
            /* Android / Chrome / General Browser Step-by-Step */
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-black text-slate-800 pb-1 border-b border-slate-100">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Pemasangan di Android / Chrome / Komputer</span>
              </div>

              {onTriggerInstall && (
                <button
                  type="button"
                  onClick={() => {
                    onTriggerInstall();
                    onClose();
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-98 transition-all cursor-pointer"
                >
                  <Download className="w-5 h-5 text-amber-300" />
                  <span>Pasang Sekarang Secara Otomatis</span>
                </button>
              )}

              <div className="text-[11px] text-slate-600 space-y-2 pt-1">
                <p className="font-bold text-slate-800">Jika tombol otomatis tidak muncul:</p>
                <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-mono font-bold text-blue-600">1.</span>
                  <span>Ketuk ikon menu titik tiga (<strong>⋮</strong>) di pojok kanan atas browser Chrome Anda.</span>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-mono font-bold text-blue-600">2.</span>
                  <span>Pilih <strong>"Pasang aplikasi"</strong> atau <strong>"Tambahkan ke Layar utama"</strong> (Install App / Add to Home screen).</span>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-mono font-bold text-blue-600">3.</span>
                  <span>Konfirmasi, dan ikon resmi PKBM Bina Insani akan langsung dibuatkan pintasannya.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs transition-all"
          >
            Mengerti, Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

export const PWAInstallFloatingBanner: React.FC = () => {
  const { isInstalled, isIOS, isInstallable, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('pwa_banner_dismissed') === 'true';
  });
  const [showModal, setShowModal] = useState(false);

  if (isInstalled || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  const handleAction = async () => {
    if (isInstallable) {
      const res = await install();
      if (res === 'manual') setShowModal(true);
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <aside 
        aria-label="Pemberitahuan Pemasangan Aplikasi" 
        className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md z-40 bg-gradient-to-r from-slate-950 via-blue-950 to-emerald-950 text-white p-3.5 sm:p-4 rounded-3xl shadow-2xl border-2 border-emerald-400/50 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-white p-1 shadow shrink-0 border border-amber-400 flex items-center justify-center">
            <img src="/logo.svg" alt="PKBM" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black px-1.5 py-0.2 bg-emerald-500/30 text-emerald-300 rounded border border-emerald-400/30">PINTASAN</span>
              <p className="text-xs font-black text-white truncate">Pasang Absensi PKBM</p>
            </div>
            <p className="text-[11px] text-emerald-100/80 truncate mt-0.5">
              Akses cepat tanpa browser di Android & iPhone
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleAction}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl shadow border border-emerald-300 flex items-center gap-1 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>Pasang</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            title="Tutup Notifikasi"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {showModal && (
        <PWAInstallModal
          isIOS={isIOS}
          isAndroid={!isIOS}
          onClose={() => setShowModal(false)}
          onTriggerInstall={isInstallable ? handleAction : undefined}
        />
      )}
    </>
  );
};

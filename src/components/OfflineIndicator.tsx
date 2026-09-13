import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-2xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xl border border-amber-300 animate-bounce">
      <WifiOff className="w-4 h-4 text-white" />
      <span>Mode Offline — Data tersimpan secara lokal dan otomatis disinkronkan saat tersambung kembali.</span>
    </div>
  );
};

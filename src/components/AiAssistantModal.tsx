import React, { useState } from 'react';
import { Bot, Sparkles, BookOpen, Send, Loader2, Copy, Check, FileText } from 'lucide-react';
import { AttendanceRecord } from '../types';

interface AiAssistantModalProps {
  records: AttendanceRecord[];
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ records }) => {
  const [promptType, setPromptType] = useState<'narrative_report' | 'teaching_tips'>('narrative_report');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setAiResult(null);

    try {
      const response = await fetch('/api/ai/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptType,
          recordsData: records.slice(0, 10), // Pass top recent records
          customPrompt
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Gagal menghasilkan tanggapan AI.');
      }

      setAiResult(data.result);
    } catch (err: any) {
      console.warn("AI Generation note:", err);
      setError(err?.message || 'Terjadi kesalahan saat menghubungkan ke Gemini AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (aiResult) {
      navigator.clipboard.writeText(aiResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-emerald-500/30">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/40">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-900 font-black text-[10px] px-2 py-0.5 rounded-full uppercase">
                Gemini 2.5 AI
              </span>
              <span className="text-xs text-emerald-200">Asisten Digital PKBM</span>
            </div>
            <h2 className="text-xl font-black text-white mt-0.5">Asisten Cerdas Tutor PKBM BINA INSANI</h2>
            <p className="text-xs text-slate-300">
              Menghasilkan narasi evaluasi laporan resmi dan rekomendasi strategi mengajar interaktif untuk warga belajar.
            </p>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Pilih Modul Bantuan AI:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <button
              type="button"
              onClick={() => setPromptType('narrative_report')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                promptType === 'narrative_report'
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Buat Narasi Laporan Resensi PKBM</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menyusun narasi eksekutif berbasis {records.length} data presensi tutor aktif.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPromptType('teaching_tips')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                promptType === 'teaching_tips'
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Saran Strategi & Ice Breaking Tutor</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tips interaktif dan metode andragogi untuk Warga Belajar Paket A/B/C Sumowono.
                </p>
              </div>
            </button>

          </div>
        </div>

        {promptType === 'teaching_tips' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Topik Pembelajaran / Tantangan Mengajar (Opsional)
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="misal: Cara mengatasi Warga Belajar dewasa yang cepat lelah saat belajar malam hari"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white font-extrabold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all active:scale-98 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Sedang Menyusun Tanggapan AI...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-amber-300" />
              Hasilkan Laporan / Saran Cerdas AI Sekarang
            </>
          )}
        </button>

        {error && (
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-rose-800 text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

      </div>

      {/* Output Display Card */}
      {aiResult && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
              <Bot className="w-5 h-5 text-emerald-600" />
              Hasil Generasi AI Asisten PKBM Bina Insani
            </div>
            <button
              onClick={handleCopy}
              className="text-xs font-bold text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin!' : 'Salin Teks'}
            </button>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl text-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-sans border border-slate-200">
            {aiResult}
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { Printer, Calendar, FileText, Download, CheckCircle2, Loader2, ShieldCheck, School, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { AttendanceRecord, PKBMInfo } from '../types';
import { getPKBMInfo } from '../lib/storage';
import { getWibToday, getWibPresetRange, formatWibDateIndo, formatTimeWibDisplay } from '../lib/dateUtils';

interface PrintReportViewProps {
  records: AttendanceRecord[];
  pkbmInfo?: PKBMInfo;
}


// Helper to convert oklch color strings to standard browser rgb/rgba strings for html2canvas compatibility
const parseCssColorToRgb = (colorStr: string): string => {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'inherit' || colorStr === 'currentColor') {
    return colorStr;
  }
  if (!colorStr.includes('oklch') && !colorStr.includes('color(')) {
    return colorStr;
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillStyle = colorStr;
      return ctx.fillStyle; // returns #rrggbb or rgba(...)
    }
  } catch (e) {
    // ignore
  }
  return '#1e293b';
};

// Helper to sanitize oklch colors from style elements
const sanitizeOklchInLiveDocument = () => {
  const styleEls = Array.from(document.querySelectorAll('style'));
  const restored: Array<{ el: HTMLStyleElement; content: string }> = [];

  styleEls.forEach((styleEl) => {
    const text = styleEl.textContent || '';
    if (text.includes('oklch')) {
      restored.push({ el: styleEl, content: text });
      styleEl.textContent = text.replace(/oklch\([^;}]+\)/gi, '#1e293b');
    }
  });

  return () => {
    restored.forEach(({ el, content }) => {
      el.textContent = content;
    });
  };
};

export const PrintReportView: React.FC<PrintReportViewProps> = ({ records, pkbmInfo: propPkbmInfo }) => {
  const pkbmInfo = useMemo(() => propPkbmInfo || getPKBMInfo(), [propPkbmInfo]);


  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [paperSize, setPaperSize] = useState<'F4' | 'A4'>('F4');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  // Quick Preset Period Handler (Murni Zona Waktu WIB UTC+7)
  const setPresetPeriod = (preset: 'thisMonth' | 'last3Months' | 'thisYear' | 'all') => {
    const range = getWibPresetRange(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setSelectedMonthYear('');
  };

  // Filter records for report
  const reportRecords = useMemo(() => {
    return records.filter(r => {
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      if (!startDate && !endDate && selectedMonthYear && !r.date.startsWith(selectedMonthYear)) return false;
      if (selectedProgram !== 'ALL' && r.program !== selectedProgram) return false;
      return true;
    });
  }, [records, startDate, endDate, selectedMonthYear, selectedProgram]);

  // Formatted Month / Period Title
  const formattedPeriodTitle = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) {
        return `TANGGAL ${formatWibDateIndo(startDate, 'long').toUpperCase()}`;
      }
      return `${formatWibDateIndo(startDate, 'long').toUpperCase()} S.D. ${formatWibDateIndo(endDate, 'long').toUpperCase()}`;
    }
    if (startDate) return `SEJAK ${formatWibDateIndo(startDate, 'long').toUpperCase()}`;
    if (endDate) return `SAMPAI ${formatWibDateIndo(endDate, 'long').toUpperCase()}`;
    if (selectedMonthYear) {
      const [year, month] = selectedMonthYear.split('-');
      const safeDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1, 12, 0, 0);
      return safeDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();
    }
    return 'SELURUH PERIODE TANGGAL';
  }, [startDate, endDate, selectedMonthYear]);

  // Handler 1: Direct Window Print (Prints the live on-screen preview with full Tailwind styles & selected paper size)
  const handlePrintToPrinter = () => {
    const isF4 = paperSize === 'F4';
    const styleId = 'dynamic-print-paper-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `@media print { @page { size: ${isF4 ? '215mm 330mm' : '210mm 297mm'}; margin: 10mm; } }`;

    window.print();
  };

  // Helper: Generate jsPDF instance for F4 or A4 directly from the on-screen preview element
  const generatePdfInstance = async () => {
    let restoreStyles: (() => void) | null = null;
    const reportElem = document.getElementById('printable-report-sheet');

    if (!reportElem) {
      throw new Error('Elemen dokumen laporan tidak ditemukan.');
    }

    const origWidth = reportElem.style.width;
    const origMaxWidth = reportElem.style.maxWidth;

    try {
      reportElem.style.width = '960px';
      reportElem.style.maxWidth = '960px';

      // Sanitize live stylesheets to avoid html2canvas oklch crash
      restoreStyles = sanitizeOklchInLiveDocument();

      // Render high-resolution canvas from actual DOM
      const canvas = await html2canvas(reportElem, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024,
        onclone: (clonedDoc) => {
          const clonedReport = clonedDoc.getElementById('printable-report-sheet');
          if (clonedReport) {
            clonedReport.style.width = '960px';
            clonedReport.style.maxWidth = '960px';
            clonedReport.querySelectorAll('[style*="oklch"]').forEach((el) => {
              const s = el.getAttribute('style');
              if (s) el.setAttribute('style', s.replace(/oklch\([^;}]+\)/gi, '#1e293b'));
            });
          }
        }
      });

      // Paper Dimensions in mm
      const isF4 = paperSize === 'F4';
      const pdfWidth = isF4 ? 215 : 210;
      const pdfHeight = isF4 ? 330 : 297;
      const margin = 10;
      const printableWidth = pdfWidth - (margin * 2);
      const printableHeight = pdfHeight - (margin * 2);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isF4 ? [215, 330] : 'a4'
      });

      // Multi-page canvas slicing logic
      const pageCanvasHeight = (printableHeight / printableWidth) * canvas.width;
      let sourceY = 0;
      let pageIndex = 0;

      while (sourceY < canvas.height) {
        const currentChunkHeight = Math.min(pageCanvasHeight, canvas.height - sourceY);
        
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = pageCanvasHeight;
        const pageCtx = pageCanvas.getContext('2d');
        
        if (pageCtx) {
          pageCtx.fillStyle = '#ffffff';
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvasHeight);
          
          pageCtx.drawImage(
            canvas,
            0, sourceY, canvas.width, currentChunkHeight,
            0, 0, canvas.width, currentChunkHeight
          );
        }
        
        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        
        if (pageIndex > 0) {
          pdf.addPage(isF4 ? [215, 330] : 'a4');
        }
        
        const renderHeight = (currentChunkHeight / canvas.width) * printableWidth;
        pdf.addImage(pageImgData, 'JPEG', margin, margin, printableWidth, renderHeight);
        
        sourceY += pageCanvasHeight;
        pageIndex++;
      }

      return pdf;
    } finally {
      reportElem.style.width = origWidth;
      reportElem.style.maxWidth = origMaxWidth;
      if (restoreStyles) {
        restoreStyles();
      }
    }
  };

  // Handler 2: Export PDF Direct Download
  const handleExportPDFDirect = async () => {
    setIsGeneratingPdf(true);
    setPdfSuccessMessage(null);

    try {
      const pdf = await generatePdfInstance();
      const cleanPeriodStr = formattedPeriodTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const filename = `Laporan_Presensi_PKBM_Bina_Insani_${paperSize}_${cleanPeriodStr || 'periode'}.pdf`;

      pdf.save(filename);
      setPdfSuccessMessage(`Dokumen PDF (${paperSize}) "${filename}" berhasil diunduh.`);
      setTimeout(() => setPdfSuccessMessage(null), 5000);
    } catch (err) {
      console.warn("Gagal export PDF note:", err);
      alert("Terjadi kendala saat memproses PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handler: Export to Excel (.xlsx)
  const exportToExcel = () => {
    if (reportRecords.length === 0) {
      alert('Tidak ada data laporan untuk diunduh.');
      return;
    }

    const cleanPeriodStr = formattedPeriodTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    // Prepare structured worksheet data
    const excelRows: (string | number)[][] = [
      ["PUSAT KEGIATAN BELAJAR MASYARAKAT (PKBM) BINA INSANI SUMOWONO"],
      ["LAPORAN REKAPITULASI PRESENSI KEGIATAN TUTOR"],
      [`PERIODE: ${formattedPeriodTitle.toUpperCase()}`],
      [`PROGRAM / KELOMPOK: ${selectedProgram === 'ALL' ? 'SEMUA PROGRAM' : selectedProgram}`],
      [`NPSN: ${pkbmInfo.npsn} | ALAMAT: RT.01/RW.02 Dusun Kawedusan Desa Ngadikerso Sumowono`],
      [], // Empty row
      [
        "NO",
        "TANGGAL",
        "JAM",
        "NAMA TUTOR",
        "PROGRAM",
        "MATA PELAJARAN",
        "KELOMPOK / TINGKAT",
        "JUMLAH WB",
        "KOORDINAT LOKASI",
        "STATUS PRESENSI"
      ]
    ];

    reportRecords.forEach((rec, idx) => {
      excelRows.push([
        idx + 1,
        rec.date,
        `${rec.timeStart} WIB`,
        rec.tutorName,
        rec.program,
        rec.subjectTitle,
        rec.classGroup,
        rec.studentCount || 0,
        `${rec.location.latitude.toFixed(5)}, ${rec.location.longitude.toFixed(5)}`,
        rec.status
      ]);
    });

    // Total Row
    excelRows.push([]);
    excelRows.push([
      "TOTAL WARGA BELAJAR TERLAYANI",
      "", "", "", "", "", "",
      totalWB,
      "",
      `TOTAL ${reportRecords.length} KEGIATAN`
    ]);

    // Signatures
    excelRows.push([]);
    excelRows.push([]);
    excelRows.push(["Mengetahui,", "", "", "Menyetujui,", "", "", `Sumowono, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`]);
    excelRows.push([pkbmInfo.foundationManagerTitle || "Pengelola Yayasan", "", "", "Kepala PKBM BINA INSANI", "", "", "Penanggungjawab Absensi"]);
    excelRows.push([]);
    excelRows.push([]);
    excelRows.push([pkbmInfo.foundationManagerName || "H. Sugeng Wahyudi, S.E.", "", "", pkbmInfo.headName || "Lailatul Arifah, S.H., M.Pd.", "", "", pkbmInfo.attendanceOfficerName || "Nunung Khoiriyah"]);
    excelRows.push([pkbmInfo.foundationManagerNip || "NIY. 19740815 201001 1 001", "", "", pkbmInfo.headNip || "NIY/NIP. 19820512 201202 2 002", "", "", pkbmInfo.attendanceOfficerNip || "ID Pegawai: 19900320 201803 2 003"]);

    const worksheet = XLSX.utils.aoa_to_sheet(excelRows);

    // Set Column Widths
    worksheet['!cols'] = [
      { wch: 6 },  // No
      { wch: 14 }, // Tanggal
      { wch: 16 }, // Jam
      { wch: 28 }, // Nama Tutor
      { wch: 18 }, // Program
      { wch: 25 }, // Mapel
      { wch: 20 }, // Kelompok
      { wch: 12 }, // Jumlah WB
      { wch: 24 }, // Koordinat
      { wch: 16 }  // Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Presensi');

    XLSX.writeFile(workbook, `Laporan_Presensi_PKBM_Bina_Insani_${cleanPeriodStr || 'periode'}.xlsx`);
    setPdfSuccessMessage('Dokumen Excel (.xlsx) berhasil diunduh.');
    setTimeout(() => setPdfSuccessMessage(null), 5000);
  };

  // Handler: Export to CSV (.csv)
  const exportToCSV = () => {
    if (reportRecords.length === 0) {
      alert('Tidak ada data laporan untuk diunduh.');
      return;
    }

    const cleanPeriodStr = formattedPeriodTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    const csvRows: string[][] = [
      ["PKBM BINA INSANI SUMOWONO"],
      ["LAPORAN REKAPITULASI PRESENSI KEGIATAN TUTOR"],
      [`PERIODE: ${formattedPeriodTitle}`],
      [""],
      ["NO", "TANGGAL", "JAM", "NAMA TUTOR", "PROGRAM", "MATA PELAJARAN", "KELOMPOK", "JUMLAH WB", "KOORDINAT LOKASI", "STATUS"]
    ];

    reportRecords.forEach((rec, idx) => {
      csvRows.push([
        (idx + 1).toString(),
        rec.date,
        `"${rec.timeStart} WIB"`,
        `"${rec.tutorName.replace(/"/g, '""')}"`,
        `"${rec.program.replace(/"/g, '""')}"`,
        `"${rec.subjectTitle.replace(/"/g, '""')}"`,
        `"${rec.classGroup.replace(/"/g, '""')}"`,
        (rec.studentCount || 0).toString(),
        `"${rec.location.latitude.toFixed(5)}, ${rec.location.longitude.toFixed(5)}"`,
        rec.status
      ]);
    });

    const csvContent = "\uFEFF" + csvRows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Presensi_PKBM_Bina_Insani_${cleanPeriodStr || 'periode'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setPdfSuccessMessage('Dokumen CSV (.csv) berhasil diunduh.');
    setTimeout(() => setPdfSuccessMessage(null), 5000);
  };

  const totalWB = reportRecords.reduce((acc, curr) => acc + (curr.studentCount || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Print Controls Bar (Hidden during actual print) */}
      <div className="print-hide bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-4">
        
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span>Pengaturan Format Cetak & Ekspor Dokumen</span>
                <span className="text-[10px] bg-emerald-800 text-white font-bold px-2 py-0.5 rounded-full uppercase">Kertas {paperSize}</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Pilih ukuran kertas (F4/A4) lalu cetak ke printer atau unduh PDF resmi.
              </p>
            </div>
          </div>

          {/* Paper Size Selector & Action Buttons Group */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            
            {/* Paper Size Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPaperSize('F4')}
                className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all ${
                  paperSize === 'F4' 
                    ? 'bg-slate-900 text-amber-300 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Kertas F4 / Folio (215 x 330 mm)"
              >
                F4 (Folio)
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('A4')}
                className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all ${
                  paperSize === 'A4' 
                    ? 'bg-slate-900 text-amber-300 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Kertas A4 Standard (210 x 297 mm)"
              >
                A4 Standard
              </button>
            </div>

            {/* Main Action 1: Cetak ke Printer */}
            <button
              type="button"
              onClick={handlePrintToPrinter}
              className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
              title="Cetak langsung ke printer dengan tampilan yang sama persis dengan preview"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Cetak Printer ({paperSize})</span>
            </button>

            {/* Main Action 2: Direct PDF Download */}
            <button
              type="button"
              onClick={handleExportPDFDirect}
              disabled={isGeneratingPdf || reportRecords.length === 0}
              className="bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
              title="Unduh file dokumen PDF resmi dengan tampilan sama persis dengan preview"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
                  <span>Memproses PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-indigo-200" />
                  <span>Unduh PDF ({paperSize})</span>
                </>
              )}
            </button>

            {/* Main Action 3: Excel (.xlsx) Download */}
            <button
              type="button"
              onClick={exportToExcel}
              disabled={reportRecords.length === 0}
              className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
              title="Unduh data laporan presensi ke file Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Unduh Excel (.xlsx)</span>
            </button>

            {/* Main Action 4: CSV (.csv) Download */}
            <button
              type="button"
              onClick={exportToCSV}
              disabled={reportRecords.length === 0}
              className="bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
              title="Unduh data laporan presensi ke file CSV (.csv)"
            >
              <FileText className="w-4 h-4 text-slate-300" />
              <span>Unduh CSV (.csv)</span>
            </button>
          </div>
        </div>

        {/* PDF Success Toast Notification */}
        {pdfSuccessMessage && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{pdfSuccessMessage}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setPdfSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 font-extrabold px-2 py-0.5"
            >
              ×
            </button>
          </div>
        )}

        {/* Date Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedMonthYear('');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelectedMonthYear('');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Program Layanan</label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Program Layanan</option>
              <option value="Paket A (Setara SD)">Paket A (Setara SD)</option>
              <option value="Paket B (Setara SMP)">Paket B (Setara SMP)</option>
              <option value="Paket C (Setara SMA)">Paket C (Setara SMA)</option>
              <option value="Keaksaraan Fungsional (KF)">Keaksaraan Fungsional (KF)</option>
              <option value="Kursus & Keterampilan / Vokasi">Kursus & Keterampilan / Vokasi</option>
            </select>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
            <button
              type="button"
              onClick={() => setPresetPeriod('thisMonth')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-700 hover:text-white text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition-all"
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => setPresetPeriod('last3Months')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-700 hover:text-white text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition-all"
            >
              3 Bulan
            </button>
            <button
              type="button"
              onClick={() => setPresetPeriod('thisYear')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-700 hover:text-white text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition-all"
            >
              Tahun Ini
            </button>
            <button
              type="button"
              onClick={() => setPresetPeriod('all')}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-700 hover:text-white text-rose-800 text-[11px] font-bold rounded-lg border border-rose-200 transition-all"
            >
              Semua
            </button>
          </div>
        </div>

      </div>

      {/* Printable Sheet Container */}
      <div 
        id="printable-report-sheet"
        className="bg-white p-8 md:p-12 rounded-2xl border border-slate-200 shadow-xl max-w-5xl mx-auto text-slate-900 font-sans print:p-0 print:border-none print:shadow-none print:max-w-none"
      >
        
        {/* KOP SURAT PKBM BINA INSANI SUMOWONO (OFFICIAL FORMAT) */}
        <div className="mb-4 text-slate-900">
          <div className="flex items-center justify-between gap-4">
            {/* Left Logo */}
            <div className="w-20 h-20 shrink-0 flex items-center justify-center p-1">
              <img 
                src={pkbmInfo.logoUrl || '/logo.svg'} 
                alt="Logo PKBM Bina Insani" 
                width="75"
                height="75"
                style={{ width: '75px', height: '75px', maxWidth: '75px', maxHeight: '75px', objectFit: 'contain' }}
                className="w-[75px] h-[75px] object-contain shrink-0" 
              />
            </div>
            
            {/* Center Institution Heading */}
            <div className="text-center flex-1 px-1">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 font-serif leading-tight">
                PUSAT KEGIATAN BELAJAR MASYARAKAT (PKBM)
              </h3>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider leading-tight text-slate-900 font-serif my-0.5">
                PKBM BINA INSANI SUMOWONO
              </h1>
              <h4 className="text-xs sm:text-sm font-bold uppercase leading-tight text-slate-900 font-serif">
                DUSUN KAWEDUSAN DESA NGADIKERSO KECAMATAN SUMOWONO KABUPATEN SEMARANG
              </h4>
              <p className="text-[10px] font-medium text-slate-800 mt-1 leading-tight">
                Akta Notaris Achmad Dimyati No. 69 | NPWP: 02.899.463.0-505.000 | NPSN: {pkbmInfo.npsn}
              </p>
              <p className="text-[10px] font-semibold text-slate-800 mt-0.5 leading-tight">
                Alamat: RT.01/RW.02 Dusun Kawedusan Desa Ngadikerso Kode Pos 50662 Telp. 085 290 655 103 | Email: {pkbmInfo.email}
              </p>
            </div>
          </div>

          {/* Double Line Divider (Garis Kop Surat Official) */}
          <div className="mt-2.5">
            <div className="border-b-[3px] border-slate-900 w-full mb-[2px]"></div>
            <div className="border-b border-slate-900 w-full"></div>
          </div>
        </div>

        {/* Report Document Title */}
        <div className="text-center my-6 space-y-1">
          <h2 className="text-base font-extrabold uppercase underline tracking-wider text-slate-900">
            LAPORAN REKAPITULASI PRESENSI KEGIATAN TUTOR
          </h2>
          <p className="text-xs font-semibold text-slate-700">
            PERIODE: <span className="uppercase font-bold text-emerald-900">{formattedPeriodTitle}</span>
          </p>
        </div>

        {/* Attendance Data Table */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-left text-xs border border-slate-900 border-collapse">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-bold uppercase text-[10px] border-b border-slate-900">
                <th className="py-2 px-2 border-r border-slate-900 text-center w-8">No.</th>
                <th className="py-2 px-2 border-r border-slate-900 w-24">Tanggal & Jam</th>
                <th className="py-2 px-3 border-r border-slate-900">Nama Tutor</th>
                <th className="py-2 px-3 border-r border-slate-900">Program & Matpel</th>
                <th className="py-2 px-2 border-r border-slate-900">Pos Belajar</th>
                <th className="py-2 px-2 border-r border-slate-900 text-center w-12">WB</th>
                <th className="py-2 px-2 border-r border-slate-900">Geofence GPS</th>
                <th className="py-2 px-2 text-center w-16">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-medium">
              {reportRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                    Tidak ada catatan presensi pada periode tanggal yang dipilih.
                  </td>
                </tr>
              ) : (
                reportRecords.map((r, index) => (
                  <tr key={r.id} className="border-b border-slate-900">
                    <td className="py-2 px-2 border-r border-slate-900 text-center">{index + 1}.</td>
                    <td className="py-2 px-2 border-r border-slate-900 font-semibold">
                      {formatWibDateIndo(r.date, 'short')}<br />
                      <span className="text-[10px] text-slate-600">{formatTimeWibDisplay(r.timeStart)}</span>
                    </td>
                    <td className="py-2 px-3 border-r border-slate-900 font-bold">{r.tutorName}</td>
                    <td className="py-2 px-3 border-r border-slate-900">
                      <span className="font-bold text-emerald-900">{r.program}</span><br />
                      {r.subjectTitle}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-900">{r.classGroup}</td>
                    <td className="py-2 px-2 border-r border-slate-900 text-center font-bold">{r.studentCount}</td>
                    <td className="py-2 px-2 border-r border-slate-900 text-[10px]">
                      {r.location.latitude.toFixed(4)}, {r.location.longitude.toFixed(4)}<br />
                      <span className="italic">Jarak: {r.location.distanceToCenterMeters || 0}m</span>
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-[10px]">
                      {r.status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-xs">
                <td colSpan={5} className="py-2 px-3 border-r border-slate-900 text-right">TOTAL WARGA BELAJAR TERLAYANI:</td>
                <td className="py-2 px-2 border-r border-slate-900 text-center text-emerald-900 font-extrabold">{totalWB}</td>
                <td colSpan={2} className="py-2 px-2 text-right text-slate-700">Total {reportRecords.length} Kegiatan</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Signature Blocks (3 Columns: Pengelola Yayasan, Kepala PKBM, Penanggungjawab Absen) */}
        <div className="grid grid-cols-3 gap-6 text-xs pt-6 border-t-2 border-slate-900 text-center break-inside-avoid">
          <div>
            <p className="text-slate-700 font-medium">Mengetahui,</p>
            <p className="font-bold text-slate-900 uppercase">{pkbmInfo.foundationManagerTitle || 'Pengelola / Ketua Yayasan'}</p>
            <div className="h-20 sm:h-24"></div>
            <p className="font-bold underline text-slate-900 text-sm">{pkbmInfo.foundationManagerName || 'H. Sugeng Wahyudi, S.E.'}</p>
            <p className="text-[11px] font-bold text-slate-800 mt-0.5">{pkbmInfo.foundationManagerNip || 'NIY. 19740815 201001 1 001'}</p>
          </div>

          <div>
            <p className="text-slate-700 font-medium">Menyetujui,</p>
            <p className="font-bold text-slate-900 uppercase">Kepala PKBM BINA INSANI</p>
            <div className="h-20 sm:h-24"></div>
            <p className="font-bold underline text-slate-900 text-sm">{pkbmInfo.headName || 'Lailatul Arifah, S.H., M.Pd.'}</p>
            <p className="text-[11px] font-bold text-slate-800 mt-0.5">{pkbmInfo.headNip || 'NIY/NIP. 19820512 201202 2 002'}</p>
          </div>

          <div>
            <p className="text-slate-700 font-medium">Sumowono, {formatWibDateIndo(getWibToday(), 'long')}</p>
            <p className="font-bold text-slate-900 uppercase">Penanggungjawab Absensi</p>
            <div className="h-20 sm:h-24"></div>
            <p className="font-bold underline text-slate-900 text-sm">{pkbmInfo.attendanceOfficerName || 'Nunung Khoiriyah'}</p>
            <p className="text-[11px] font-bold text-slate-800 mt-0.5">{pkbmInfo.attendanceOfficerNip || 'ID Pegawai: 19900320 201803 2 003'}</p>
          </div>
        </div>

      </div>

    </div>
  );
};


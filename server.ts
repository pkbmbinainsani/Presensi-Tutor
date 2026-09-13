import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'Sistem Absensi Tutor PKBM Bina Insani Sumowono' });
  });

  // AI Assistant endpoint
  app.post('/api/ai/generate-summary', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const { promptType, recordsData, customPrompt } = req.body;

      if (!apiKey) {
        // Fallback response generator if GEMINI_API_KEY is not set
        if (promptType === 'narrative_report') {
          const totalRecords = Array.isArray(recordsData) ? recordsData.length : 0;
          const totalWB = Array.isArray(recordsData) 
            ? recordsData.reduce((acc: number, r: any) => acc + (r.studentCount || 0), 0) 
            : 0;

          const fallbackText = `[LAPORAN NARASI REKAPITULASI PRESENSI - PKBM BINA INSANI SUMOWONO]

1. RINGKASAN EKSEKUTIF KEGIATAN PEMBELAJARAN
Berdasarkan data presensi terdata sebanyak ${totalRecords} kegiatan pembelajaran dengan total partisipasi Warga Belajar mencapai ${totalWB} orang. Seluruh kegiatan pembelajaran di Gedung Utama, Kantor Yayasan, serta lokasi titik kelas mitra (PP Miftahul Jannah Bedono, PP Darul Himmah Pingit, PP Tajuk Ngaren, PP APIK Tuntang, PP API Darussalam Gondang, PP Ummul Quro' Gedangan) terlaksana dengan teratur dan terverifikasi geofencing.

2. EVALUASI PARTISIPASI WARGA BELAJAR & SEBARAN PROGRAM
- Program Paket A, B, dan C: Partisipasi warga belajar berjalan lancar sesuai jadwal tatap muka dan pembelajaran mandiri.
- Kelas Mitra Pondok Pesantren: Sinergi dengan pesantren mitra berjalan efektif, di mana santri mengikuti pembelajaran kesetaraan secara tertib.

3. REKOMENDASI PENINGKATAN MUTU
- Terus tingkatkan penggunaan media pembelajaran interaktif dan pendampingan modul.
- Optimalkan pemanfaatan titik lokasi terdaftar agar presensi tutor semakin akurat.

💡 (Catatan: Laporan ini dihasilkan dari templat analisis data lokal. Untuk generasi narasi AI dinamis Gemini 2.5 Flash, pastikan GEMINI_API_KEY diisi di menu Secrets).`;
          return res.json({ result: fallbackText });
        } else {
          const fallbackText = `[STRATEGI & TIPS PEMBELAJARAN INTERAKTIF TUTOR PKBM BINA INSANI]

Topik / Fokus: "${customPrompt || 'Metode Pembelajaran Warga Belajar Dewasa (Andragogi)'}"

1. PENDEKATAN ANDRAGOGI BERBASIS PENGALAMAN
Warga belajar dewasa memiliki pengalaman hidup yang kaya. Kaitkan materi pelajaran kesetaraan dengan kehidupan sehari-hari (pertanian, perdagangan, dan potensi lokal Sumowono).

2. ICE-BREAKING & DUKUNGAN SEMANGAT
Lakukan ice-breaking singkat (2-3 menit) sebelum pelajaran dimulai untuk mencairkan suasana, terutama pada kelas sore/malam hari setelah warga belajar bekerja.

3. DISKUSI KELOMPOK INTERAKTIF
Bagi warga belajar menjadi kelompok-kelompok kecil untuk mendiskusikan soal/studi kasus bersama. Hal ini meningkatkan rasa percaya diri dan kerja sama.

4. APRESIASI DAN LINGKUNGAN BELAJAR NYAMAN
Berikan pujian dan dorongan positif atas setiap usaha warga belajar. Ciptakan suasana belajar yang santai, bersahabat, dan tanpa tekanan.

💡 (Catatan: Tips ini disajikan dari modul panduan pengajaran PKBM. Untuk saran dinamis Gemini 2.5 Flash, pastikan GEMINI_API_KEY diisi di menu Secrets).`;
          return res.json({ result: fallbackText });
        }
      }

      let promptText = '';
      if (promptType === 'narrative_report') {
        promptText = `Anda adalah Sekretaris Laporan Pendidikan untuk PKBM BINA INSANI SUMOWONO (Kec. Sumowono, Kab. Semarang).
Buatkan narasi laporan rekapitulasi presensi kegiatan tutor berdasarkan data berikut:
${JSON.stringify(recordsData, null, 2)}

Buatkan dalam format resmi Indonesia meliputi:
1. Ringkasan Eksekutif Kegiatan Pembelajaran
2. Evaluasi Partisipasi Warga Belajar & Sebaran Program (Paket A/B/C/Vokasi/KF)
3. Rekomendasi Peningkatan Mutu Pembelajaran Tutor di PKBM Bina Insani Sumowono.
Gunakan bahasa Indonesia baku, profesional, dan menyentuh nilai-nilai pendidikan masyarakat.`;
      } else if (promptType === 'teaching_tips') {
        promptText = `Anda adalah Konsultan Pembelajaran Pendidikan Masyarakat (PKBM).
Tutor PKBM Bina Insani Sumowono meminta saran strategi mengajar untuk kegiatan: "${customPrompt || 'Pembelajaran Kesetaraan Warga Belajar Adult Learners'}".
Berikan 4 tips praktis interaktif, metode andragogi, dan teknik es ice-breaking yang cocok untuk Warga Belajar Paket A/B/C/Vokasi di daerah pedesaan/perbukitan Sumowono.`;
      } else {
        promptText = customPrompt || 'Berikan analisis singkat mengenai efektivitas presensi tutor PKBM.';
      }

      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: promptText,
        });

        return res.json({ result: response.text });
      } catch (genErr: any) {
        console.error('Gemini API execution error:', genErr);
        return res.status(200).json({ 
          result: `⚠️ [Pemberitahuan Sistem AI]\nGenerasi AI langsung mengalami masalah: ${genErr?.message || 'Error koneksi API'}.\n\nAnda dapat mengonfigurasi GEMINI_API_KEY yang valid pada menu Secrets untuk mengaktifkan kembali Gemini 2.5 Flash.` 
        });
      }
    } catch (err: any) {
      console.error('Error in AI endpoint:', err);
      res.status(500).json({ error: err?.message || 'Gagal menghasilkan tanggapan AI.' });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Absensi PKBM running on http://localhost:${PORT}`);
  });
}

startServer();

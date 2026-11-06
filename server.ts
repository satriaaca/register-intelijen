import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

import {
  ensureTablesExist,
  getSettings,
  updateSettings,
  getOfficers,
  createOfficer,
  updateOfficer,
  deleteOfficer,
  getRegisterEntries,
  saveRegisterEntry,
  deleteRegisterEntry,
  deleteRegisterEntriesBatch,
  importRegisterEntriesBatch,
  getRegistersSummary,
  getStorageCodes,
  saveStorageCode,
  deleteStorageCode,
  seedStorageCodesIfEmpty,
  getRegisterLocks,
  getRegisterLock,
  saveRegisterLock,
  unlockRegister,
  getRegisterRekapitulasi,
  saveRegisterRekapitulasi,
  deleteRegisterRekapitulasi,
  getDatabaseArchiveStats,
  exportYearArchive,
  purgeYearData,
  restoreArchivePackage,
} from "./src/db/queries.js";

import { REGISTER_DEFINITIONS } from "./src/lib/constants.js";
import { ensureRIn3DataSeeded } from "./src/lib/seed-rin3.js";
import { requireAuth, requireArchiveSuperAdmin } from "./src/lib/serverAuth.js";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function parseId(value: string): number | null {
  const id = Number.parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: "5mb" }));

  /*
   * Inisialisasi database dan data dasar.
   * Tidak menghentikan server bila database sementara gagal terhubung,
   * tetapi error akan terlihat pada terminal.
   */
  ensureTablesExist()
    .then(async () => {
      await ensureRIn3DataSeeded();
      await seedStorageCodesIfEmpty();
      console.log("Database tables and initial seed data are ready.");
    })
    .catch((error) => {
      console.error("Failed table check on server startup:", error);
    });

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  // Wajib autentikasi & izin whitelist untuk seluruh endpoint /api di bawah
  app.use("/api", requireAuth);

  // Settings
  app.get("/api/settings", async (_req, res) => {
    try {
      const data = await getSettings();
      res.json(data);
    } catch (error: unknown) {
      console.error("Error fetching settings:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to fetch settings"),
      });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const data = await updateSettings(req.body);
      res.json(data);
    } catch (error: unknown) {
      console.error("Error updating settings:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to update settings"),
      });
    }
  });

  // Officers
  app.get("/api/officers", async (_req, res) => {
    try {
      const list = await getOfficers();
      res.json(list);
    } catch (error: unknown) {
      console.error("Error fetching officers:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to fetch officers"),
      });
    }
  });

  app.post("/api/officers", async (req, res) => {
    try {
      const { nama, pangkat, nip, jabatan } = req.body;

      if (!nama || !pangkat || !nip) {
        return res.status(400).json({
          error: "Nama, Pangkat, dan NIP wajib diisi.",
        });
      }

      const created = await createOfficer({
        nama,
        pangkat,
        nip,
        jabatan,
      });

      res.status(201).json(created);
    } catch (error: unknown) {
      console.error("Error creating officer:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to create officer"),
      });
    }
  });

  app.put("/api/officers/:id", async (req, res) => {
    try {
      const id = parseId(req.params.id);

      if (id === null) {
        return res.status(400).json({ error: "ID petugas tidak valid." });
      }

      const updated = await updateOfficer(id, req.body);
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating officer:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to update officer"),
      });
    }
  });

  app.delete("/api/officers/:id", async (req, res) => {
    try {
      const id = parseId(req.params.id);

      if (id === null) {
        return res.status(400).json({ error: "ID petugas tidak valid." });
      }

      await deleteOfficer(id);
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error deleting officer:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to delete officer"),
      });
    }
  });

  // Register metadata
  app.get("/api/registers", async (_req, res) => {
    try {
      const summary = await getRegistersSummary();

      const registers = REGISTER_DEFINITIONS.map((definition) => ({
        ...definition,
        entryCount: summary.countsByRegister[definition.code] || 0,
      }));

      res.json({ registers, summary });
    } catch (error: unknown) {
      console.error("Error fetching registers:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to fetch registers"),
      });
    }
  });

  // Register entries
  app.get("/api/registers/:code/entries", async (req, res) => {
    try {
      const entries = await getRegisterEntries(req.params.code);
      res.json(entries);
    } catch (error: unknown) {
      console.error(
        `Error fetching entries for ${req.params.code}:`,
        error,
      );

      res.status(500).json({
        error: getErrorMessage(error, "Failed to fetch entries"),
      });
    }
  });

  app.post("/api/registers/:code/entries", async (req, res) => {
    try {
      const { id, nomorUrut, tgl, waktu, data } = req.body;

      const saved = await saveRegisterEntry(req.params.code, {
        id,
        nomorUrut: nomorUrut || 1,
        tgl,
        waktu,
        data,
      });

      res.json(saved);
    } catch (error: unknown) {
      console.error(`Error saving entry for ${req.params.code}:`, error);

      res.status(500).json({
        error: getErrorMessage(error, "Failed to save entry"),
      });
    }
  });

  // Handler fungsi untuk batch-delete baris register
  const handleBatchDeleteEntries = async (req: express.Request, res: express.Response) => {
    try {
      const rawIds = req.body?.ids || req.body?.entryIds;

      if (!Array.isArray(rawIds) || rawIds.length === 0) {
        return res.status(400).json({
          error: "Daftar ID baris register tidak valid atau kosong.",
        });
      }

      const numericIds = rawIds
        .map((val: unknown) => Number(val))
        .filter((num: number) => !isNaN(num) && num > 0);

      if (numericIds.length === 0) {
        return res.status(400).json({
          error: "Daftar ID baris register kosong.",
        });
      }

      const deletedCount = await deleteRegisterEntriesBatch(numericIds);
      res.json({ success: true, count: deletedCount });
    } catch (error: unknown) {
      console.error("Error batch deleting entries:", error);

      res.status(500).json({
        error: getErrorMessage(error, "Failed to batch delete entries"),
      });
    }
  };

  // Daftarkan endpoint batch-delete dengan berbagai format rute & method agar selalu kompatibel
  app.post("/api/registers/:code/entries/batch-delete", handleBatchDeleteEntries);
  app.post("/api/registers/:code/batch-delete", handleBatchDeleteEntries);
  app.delete("/api/registers/:code/entries/batch-delete", handleBatchDeleteEntries);
  app.delete("/api/registers/:code/batch-delete", handleBatchDeleteEntries);
  app.post("/api/registers/batch-delete", handleBatchDeleteEntries);
  app.delete("/api/registers/batch-delete", handleBatchDeleteEntries);

  app.delete("/api/registers/:code/entries/:id", async (req, res) => {
    try {
      const id = parseId(req.params.id);

      if (id === null) {
        return res.status(400).json({
          error: "ID baris register tidak valid.",
        });
      }

      await deleteRegisterEntry(id);
      res.json({ success: true });
    } catch (error: unknown) {
      console.error(`Error deleting entry ${req.params.id}:`, error);

      res.status(500).json({
        error: getErrorMessage(error, "Failed to delete entry"),
      });
    }
  });

  // Storage codes
  app.get("/api/storage-codes", async (_req, res) => {
    try {
      const list = await getStorageCodes();
      res.json(list);
    } catch (error: unknown) {
      console.error("Error getting storage codes:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to fetch storage codes"),
      });
    }
  });

  app.post("/api/storage-codes", async (req, res) => {
    try {
      const { kode, asal, keterangan } = req.body;

      if (!kode || !asal) {
        return res.status(400).json({
          error: "Kode dan Asal Instansi wajib diisi.",
        });
      }

      const created = await saveStorageCode({
        kode,
        asal,
        keterangan,
      });

      res.status(201).json(created);
    } catch (error: unknown) {
      console.error("Error saving storage code:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to save storage code"),
      });
    }
  });

  app.put("/api/storage-codes/:id", async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const { kode, asal, keterangan } = req.body;

      if (id === null) {
        return res.status(400).json({
          error: "ID kode penyimpanan tidak valid.",
        });
      }

      if (!kode || !asal) {
        return res.status(400).json({
          error: "Kode dan Asal Instansi wajib diisi.",
        });
      }

      const updated = await saveStorageCode({
        id,
        kode,
        asal,
        keterangan,
      });

      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating storage code:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to update storage code"),
      });
    }
  });

  app.delete("/api/storage-codes/:id", async (req, res) => {
    try {
      const id = parseId(req.params.id);

      if (id === null) {
        return res.status(400).json({
          error: "ID kode penyimpanan tidak valid.",
        });
      }

      await deleteStorageCode(id);
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error deleting storage code:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to delete storage code"),
      });
    }
  });

  // Register Locks (Penandatangan Terkunci)
  app.get("/api/register-locks", async (req, res) => {
    try {
      const registerCode = req.query.registerCode as string | undefined;
      const periodKey = req.query.periodKey as string | undefined;

      if (registerCode && periodKey) {
        const lock = await getRegisterLock(registerCode, periodKey);
        return res.json(lock);
      }

      const list = await getRegisterLocks(registerCode);
      res.json(list);
    } catch (error: unknown) {
      console.error("Error getting register locks:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to fetch register locks"),
      });
    }
  });

  app.post("/api/register-locks", async (req, res) => {
    try {
      const {
        registerCode,
        periodKey,
        isLocked,
        leftSignerTitle,
        leftSignerName,
        leftSignerPangkatNip,
        rightSignerTitle,
        rightSignerName,
        rightSignerPangkatNip,
        signatureAlignment,
        tempatDokumen,
        closingDate,
        lockedBy,
      } = req.body;

      if (!registerCode || !periodKey) {
        return res.status(400).json({
          error: "registerCode dan periodKey wajib diisi.",
        });
      }

      const saved = await saveRegisterLock({
        registerCode,
        periodKey,
        isLocked: isLocked !== undefined ? isLocked : true,
        leftSignerTitle,
        leftSignerName,
        leftSignerPangkatNip,
        rightSignerTitle,
        rightSignerName,
        rightSignerPangkatNip,
        signatureAlignment,
        tempatDokumen,
        closingDate,
        lockedBy,
      });

      res.status(200).json(saved);
    } catch (error: unknown) {
      console.error("Error saving register lock:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to save register lock"),
      });
    }
  });

  app.post("/api/register-locks/unlock", async (req, res) => {
    try {
      const { registerCode, periodKey } = req.body;

      if (!registerCode || !periodKey) {
        return res.status(400).json({
          error: "registerCode dan periodKey wajib diisi.",
        });
      }

      await unlockRegister(registerCode, periodKey);
      res.json({ success: true, message: "Kunci register berhasil dibuka." });
    } catch (error: unknown) {
      console.error("Error unlocking register:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to unlock register"),
      });
    }
  });

  // Register Rekapitulasi Manual Override
  app.get("/api/register-rekapitulasi", async (req, res) => {
    try {
      const registerCode = req.query.registerCode as string | undefined;
      const periodKey = req.query.periodKey as string | undefined;

      if (!registerCode || !periodKey) {
        return res.status(400).json({
          error: "registerCode dan periodKey wajib diisi.",
        });
      }

      const record = await getRegisterRekapitulasi(registerCode, periodKey);
      res.json(record);
    } catch (error: unknown) {
      console.error("Error getting register rekapitulasi:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to fetch register rekapitulasi"),
      });
    }
  });

  app.post("/api/register-rekapitulasi", async (req, res) => {
    try {
      const { registerCode, periodKey, data } = req.body;

      if (!registerCode || !periodKey || !data || typeof data !== "object") {
        return res.status(400).json({
          error: "registerCode, periodKey, dan data wajib diisi.",
        });
      }

      const saved = await saveRegisterRekapitulasi(registerCode, periodKey, data);
      res.json(saved);
    } catch (error: unknown) {
      console.error("Error saving register rekapitulasi:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to save register rekapitulasi"),
      });
    }
  });

  app.delete("/api/register-rekapitulasi", async (req, res) => {
    try {
      const registerCode = (req.query.registerCode || req.body?.registerCode) as string | undefined;
      const periodKey = (req.query.periodKey || req.body?.periodKey) as string | undefined;

      if (!registerCode || !periodKey) {
        return res.status(400).json({
          error: "registerCode dan periodKey wajib diisi.",
        });
      }

      const success = await deleteRegisterRekapitulasi(registerCode, periodKey);
      res.json({
        success,
        message: "Rekapitulasi manual berhasil direset ke hitungan otomatis.",
      });
    } catch (error: unknown) {
      console.error("Error deleting register rekapitulasi:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to delete register rekapitulasi"),
      });
    }
  });

  // Archive & Database Retention Management (Khusus akun hijau.kn.tabanan@gmail)
  const handleArchiveStats = async (_req: express.Request, res: express.Response) => {
    try {
      const stats = await getDatabaseArchiveStats();
      res.json(stats);
    } catch (error: unknown) {
      console.error("Error fetching archive stats:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to fetch archive stats"),
      });
    }
  };

  app.get("/api/archive/stats", requireArchiveSuperAdmin, handleArchiveStats);
  app.get("/api/stats", requireArchiveSuperAdmin, handleArchiveStats);

  app.get("/api/archive/export/:year", requireArchiveSuperAdmin, async (req, res) => {
    try {
      const year = parseInt(req.params.year, 10);
      if (isNaN(year)) {
        return res.status(400).json({ error: "Tahun tidak valid." });
      }

      const userName = (req as any).user?.name || "Admin Intelijen";
      const pkg = await exportYearArchive(year, userName);
      res.json(pkg);
    } catch (error: unknown) {
      console.error(`Error exporting archive for year ${req.params.year}:`, error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to export archive"),
      });
    }
  });

  app.post("/api/archive/purge/:year", requireArchiveSuperAdmin, async (req, res) => {
    try {
      const year = parseInt(req.params.year, 10);
      if (isNaN(year)) {
        return res.status(400).json({ error: "Tahun tidak valid." });
      }

      const result = await purgeYearData(year);
      res.json({
        success: true,
        message: `Berhasil mengosongkan data tahun ${year} (${result.deletedEntriesCount} entri, ${result.deletedLocksCount} kunci register).`,
        ...result,
      });
    } catch (error: unknown) {
      console.error(`Error purging archive for year ${req.params.year}:`, error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to purge year data"),
      });
    }
  });

  app.post("/api/archive/restore", requireArchiveSuperAdmin, async (req, res) => {
    try {
      const { package: pkg, mode } = req.body;
      if (!pkg || !pkg.year || !Array.isArray(pkg.entries)) {
        return res.status(400).json({
          error: "Berkas paket arsip tidak valid atau struktur tidak sesuai.",
        });
      }

      const result = await restoreArchivePackage(pkg, mode || "replace");
      res.json({
        success: true,
        message: `Berhasil memulihkan ${result.restoredEntries} baris data dan ${result.restoredLocks} kunci register untuk tahun ${pkg.year}.`,
        ...result,
      });
    } catch (error: unknown) {
      console.error("Error restoring archive:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to restore archive"),
      });
    }
  });

  // Batch import
  app.post("/api/registers/:code/import-batch", async (req, res) => {
    try {
      const { entries, clearExisting } = req.body;

      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({
          error: "Data entries harus berupa array dan tidak boleh kosong.",
        });
      }

      const result = await importRegisterEntriesBatch(
        req.params.code,
        entries,
        { clearExisting: Boolean(clearExisting) },
      );

      res.json(result);
    } catch (error: unknown) {
      console.error(
        `Error importing batch for ${req.params.code}:`,
        error,
      );

      res.status(500).json({
        error: getErrorMessage(error, "Failed to import entries batch"),
      });
    }
  });

  // Seed sample data
  app.post("/api/seed-samples", async (_req, res) => {
    try {
      const officersList = await getOfficers();
      const officerIds = officersList.map((officer) => officer.id);

      await saveRegisterEntry("R.IN.1", {
        nomorUrut: 1,
        tgl: "2026-08-20",
        waktu: "09:30",
        data: {
          tgl_terima: "2026-08-20",
          jam_terima: "09:30",
          nomor_surat: "B-142/N.1.17/Dti.1/08/2026",
          tgl_surat: "2026-08-18",
          asal_surat: "Kejaksaan Tinggi Bali",
          perihal:
            "Permintaan Laporan Bulanan Pos Pelayanan Hukum Bulan Agustus 2026",
          tgl_isi_disposisi:
            "2026-08-20 / Kasi Intelijen: Mohon ditindaklanjuti dan siapkan bahan laporan",
          tindak_lanjut: "Telah diteruskan ke Kasubsi PPH",
          keterangan: "Rahasia",
        },
      });

      await saveRegisterEntry("R.IN.1", {
        nomorUrut: 2,
        tgl: "2026-08-21",
        waktu: "11:15",
        data: {
          tgl_terima: "2026-08-21",
          jam_terima: "11:15",
          nomor_surat: "005/782/Bakesbangpol/2026",
          tgl_surat: "2026-08-19",
          asal_surat: "Badan Kesbangpol Kab. Tabanan",
          perihal:
            "Undangan Rapat Koordinasi Tim Pengawasan Aliran Kepercayaan dan Keagamaan (PAKEM)",
          tgl_isi_disposisi:
            "2026-08-21 / Hadiri dan koordinasikan bahan paparan",
          tindak_lanjut: "Kasi Intel dan Tim hadir",
          keterangan: "Biasa",
        },
      });

      await saveRegisterEntry("R.IN.7", {
        nomorUrut: 1,
        tgl: "2026-08-22",
        data: {
          sektor: "Pengawasan orang asing",
          no_tgl_peruntukan:
            "SP.OPS-04/N.1.17/Dip.4/08/2026, Tgl 15 Agustus 2026 untuk Pengawasan WNA di Kawasan Wisata Tanah Lot dan Bedugul",
          nama_petugas_ids: officerIds.slice(0, 3),
          hasil_pelaksanaan:
            "Telah dilaksanakan pemantauan terhadap 12 WNA pengelola akomodasi wisata. Dokumen keimigrasian lengkap dan situasi kondusif.",
          keterangan: "Laporan Informasi Khusus terlampir",
        },
      });

      await saveRegisterEntry("R.IN.10", {
        nomorUrut: 1,
        data: {
          sektor_kegiatan_dana:
            "Pembangunan Jembatan Penghubung Antar Desa, Sumber Dana APBD Kab. Tabanan TA 2026",
          kldi: "Dinas PUPRPKP Kab. Tabanan",
          pagu_anggaran: "Rp 4.500.000.000,-",
          no_tgl_permohonan: "600/124/PUPR, Tgl 10 Juli 2026",
          pemaparan_tempat: "Ruang Rapat Kajari Tabanan",
          pemaparan_tanggal: "2026-07-15",
          telaahan_intelijen: "Layak didampingi (Rekomendasi Walpam)",
          status_diterima: "Diterima",
          status_ditolak: "-",
          sp_walpam_no_tgl:
            "PRINT-89/N.1.17/D.1/07/2026, Tgl 18 Juli 2026",
          nama_petugas_ids: officerIds.slice(0, 2),
          nilai_kontrak: "Rp 4.230.000.000,-",
          efisiensi_anggaran: "Rp 270.000.000,-",
          proyek_selesai: "Tahap 65% on schedule",
          penghentian: "-",
          no_tgl_kertas_kerja:
            "KK-08/PPS/08/2026, Tgl 12 Agustus 2026",
          keterangan: "Monitoring berkala mingguan berjalan lancar",
        },
      });

      await saveRegisterEntry("R.IN.21", {
        nomorUrut: 1,
        tgl: "2026-08-23",
        waktu: "10:00",
        data: {
          nama_petugas_penerima: officerIds[0] || 1,
          waktu_lapor: "2026-08-23 10:00",
          identitas_pelapor:
            "I Made Sukadana, Tabanan 14-04-1980, Jl. Pahlawan No. 12 Tabanan, Laki-laki, 08123456789, Petani/Wiraswasta, NIK: 5102031404800001",
          nama_organisasi: "Kelompok Tani Subak Jatiluwih",
          informasi_disampaikan:
            "Konsultasi hukum terkait tata kelola pengairan dan sertifikasi tanah adat subak",
          surat_dokumen:
            "Surat permohonan penjelasan hukum & fotokopi pipil tanah",
          tanda_tangan: "Terlampir",
          keterangan:
            "Diberikan penerangan hukum di Pos Pelayanan Hukum",
          pelapor_perorangan: "1",
          pelapor_organisasi: "1",
          pelapor_total: "1",
        },
      });

      res.json({
        success: true,
        message: "Sample data seeded successfully",
      });
    } catch (error: unknown) {
      console.error("Error seeding sample data:", error);
      res.status(500).json({
        error: getErrorMessage(error, "Failed to seed sample data"),
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    app.use(express.static(distPath));

    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Kejaksaan Intelligence Register server running on http://localhost:${PORT}`,
    );
  });
}

startServer().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
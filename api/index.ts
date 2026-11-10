import express from "express";

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
} from "../src/db/queries.js";

import { REGISTER_DEFINITIONS } from "../src/lib/constants.js";
import { ensureRIn3DataSeeded } from "../src/lib/seed-rin3.js";
import { requireAuth, requireArchiveSuperAdmin } from "../src/lib/serverAuth.js";

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

function parseId(value: string): number | null {
    const id = Number.parseInt(value, 10);
    return Number.isNaN(id) ? null : id;
}

const app = express();

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

let initialized: Promise<void> | null = null;

function initializeDatabase() {
    if (!initialized) {
        initialized = ensureTablesExist()
            .then(async () => {
                await ensureRIn3DataSeeded();
                await seedStorageCodesIfEmpty();
                console.log("Database tables and initial seed data are ready.");
            })
            .catch((error) => {
                initialized = null;
                console.error("Database initialization failed:", error);
                throw error;
            });
    }

    return initialized;
}

app.use("/api", async (_req, res, next) => {
    try {
        await initializeDatabase();
        next();
    } catch (error) {
        res.status(500).json({
            error: getErrorMessage(error, "Database initialization failed"),
        });
    }
});

app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});

app.use("/api", requireAuth);

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
app.get("/api/settings", async (_req, res) => {
    try {
        res.json(await getSettings());
    } catch (error) {
        console.error("Error fetching settings:", error);
        res.status(500).json({
            error: getErrorMessage(error, "Failed to fetch settings"),
        });
    }
});

app.post("/api/settings", async (req, res) => {
    try {
        res.json(await updateSettings(req.body));
    } catch (error) {
        console.error("Error updating settings:", error);
        res.status(500).json({
            error: getErrorMessage(error, "Failed to update settings"),
        });
    }
});

// ---------------------------------------------------------------------------
// Officers
// ---------------------------------------------------------------------------
app.get("/api/officers", async (_req, res) => {
    try {
        res.json(await getOfficers());
    } catch (error) {
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

        const created = await createOfficer({ nama, pangkat, nip, jabatan });
        res.status(201).json(created);
    } catch (error) {
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

        res.json(await updateOfficer(id, req.body));
    } catch (error) {
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
    } catch (error) {
        console.error("Error deleting officer:", error);
        res.status(500).json({
            error: getErrorMessage(error, "Failed to delete officer"),
        });
    }
});

// ---------------------------------------------------------------------------
// Register metadata
// ---------------------------------------------------------------------------
app.get("/api/registers", async (_req, res) => {
    try {
        const summary = await getRegistersSummary();

        const registers = REGISTER_DEFINITIONS.map((definition) => ({
            ...definition,
            entryCount: summary.countsByRegister[definition.code] || 0,
        }));

        res.json({ registers, summary });
    } catch (error) {
        console.error("Error fetching registers:", error);
        res.status(500).json({
            error: getErrorMessage(error, "Failed to fetch registers"),
        });
    }
});

// ---------------------------------------------------------------------------
// Register entries
// ---------------------------------------------------------------------------
app.get("/api/registers/:code/entries", async (req, res) => {
    try {
        res.json(await getRegisterEntries(req.params.code));
    } catch (error) {
        console.error(`Error fetching entries for ${req.params.code}:`, error);
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
    } catch (error) {
        console.error(`Error saving entry for ${req.params.code}:`, error);
        res.status(500).json({
            error: getErrorMessage(error, "Failed to save entry"),
        });
    }
});

// Batch delete. Harus didaftarkan SEBELUM DELETE /entries/:id
// agar "batch-delete" tidak tertangkap sebagai :id.
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
    } catch (error) {
        console.error(`Error deleting entry ${req.params.id}:`, error);
        res.status(500).json({
            error: getErrorMessage(error, "Failed to delete entry"),
        });
    }
});

// ---------------------------------------------------------------------------
// Storage codes
// ---------------------------------------------------------------------------
app.get("/api/storage-codes", async (_req, res) => {
    try {
        res.json(await getStorageCodes());
    } catch (error) {
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

        const created = await saveStorageCode({ kode, asal, keterangan });
        res.status(201).json(created);
    } catch (error) {
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

        res.json(await saveStorageCode({ id, kode, asal, keterangan }));
    } catch (error) {
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
    } catch (error) {
        console.error("Error deleting storage code:", error);
        res.status(500).json({
            error: getErrorMessage(error, "Failed to delete storage code"),
        });
    }
});

// ---------------------------------------------------------------------------
// Register Locks (Penandatangan Terkunci)
// ---------------------------------------------------------------------------
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
        console.error("Error unlocking register:", error);
        res.status(500).json({
            error: getErrorMessage(error, "Failed to unlock register"),
        });
    }
});

// ---------------------------------------------------------------------------
// Register Rekapitulasi Manual Override
// (mendukung /api/register-rekapitulasi dan /api/registers/:code/rekapitulasi)
// ---------------------------------------------------------------------------
const handleGetRekapitulasi = async (req: express.Request, res: express.Response) => {
    try {
        const registerCode = (req.params.code || req.query.registerCode) as string | undefined;
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
};

const handlePostRekapitulasi = async (req: express.Request, res: express.Response) => {
    try {
        const registerCode = (req.params.code || req.body?.registerCode) as string | undefined;
        const { periodKey, data } = req.body;

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
};

const handleDeleteRekapitulasi = async (req: express.Request, res: express.Response) => {
    try {
        const registerCode = (req.params.code || req.query.registerCode || req.body?.registerCode) as string | undefined;
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
};

app.get("/api/register-rekapitulasi", handleGetRekapitulasi);
app.get("/api/registers/:code/rekapitulasi", handleGetRekapitulasi);
app.post("/api/register-rekapitulasi", handlePostRekapitulasi);
app.post("/api/registers/:code/rekapitulasi", handlePostRekapitulasi);
app.delete("/api/register-rekapitulasi", handleDeleteRekapitulasi);
app.delete("/api/registers/:code/rekapitulasi", handleDeleteRekapitulasi);

// ---------------------------------------------------------------------------
// Batch import
// ---------------------------------------------------------------------------
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
    } catch (error) {
        console.error(`Error importing batch for ${req.params.code}:`, error);
        res.status(500).json({
            error: getErrorMessage(error, "Failed to import entries batch"),
        });
    }
});

// ---------------------------------------------------------------------------
// Archive & Database Retention Management (khusus akun super admin arsip)
// ---------------------------------------------------------------------------
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

export default app;
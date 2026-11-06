import { db, createPool } from "./index.js";
import { officers, registerEntries, registers, settings, storageCodes, registerLocks, registerRekapitulasi } from "./schema.js";
import { eq, desc, asc, and, inArray, sql } from "drizzle-orm";
import { Officer, AppSettings, StorageCodeMapping, RegisterLock, RegisterRekapitulasiRecord, ArchiveYearStats, DatabaseArchiveStats, ArchivePackage } from "../types.js";
import { DEFAULT_SETTINGS, INITIAL_OFFICERS, REGISTER_DEFINITIONS } from "../lib/constants.js";

export async function ensureTablesExist(): Promise<void> {
  try {
    const pool = createPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        kejaksaan_name TEXT NOT NULL DEFAULT 'KEJAKSAAN NEGERI TABANAN',
        tempat_dokumen TEXT NOT NULL DEFAULT 'Tabanan',
        tanggal_dokumen TEXT,
        left_signer_title TEXT NOT NULL DEFAULT 'Mengetahui:\nKEPALA KEJAKSAAN NEGERI TABANAN',
        left_signer_name TEXT NOT NULL DEFAULT 'ZAINUR ARIFIN SYAH, S.H., M.H.',
        left_signer_pangkat_nip TEXT NOT NULL DEFAULT 'Jaksa Utama Pratama / NIP. 19740512 199903 1 002',
        right_signer_title TEXT NOT NULL DEFAULT 'KEPALA SEKSI INTELIJEN',
        right_signer_name TEXT NOT NULL DEFAULT 'I GUSTI NGURAH ANOM SUKASIH, S.H.',
        right_signer_pangkat_nip TEXT NOT NULL DEFAULT 'Jaksa Muda / NIP. 19820815 200712 1 001',
        signature_alignment TEXT DEFAULT 'split',
        available_years TEXT,
        closing_dates TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE settings ADD COLUMN IF NOT EXISTS closing_dates TEXT;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS signature_alignment TEXT DEFAULT 'split';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS available_years TEXT;

      CREATE TABLE IF NOT EXISTS officers (
        id SERIAL PRIMARY KEY,
        nama TEXT NOT NULL,
        pangkat TEXT NOT NULL,
        nip TEXT NOT NULL,
        jabatan TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS registers (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        orientation TEXT NOT NULL DEFAULT 'portrait',
        tahun_takwim INTEGER NOT NULL DEFAULT 2026,
        bidang TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS register_entries (
        id SERIAL PRIMARY KEY,
        register_code TEXT NOT NULL,
        nomor_urut INTEGER NOT NULL,
        tgl TEXT,
        waktu TEXT,
        data_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS storage_codes (
        id SERIAL PRIMARY KEY,
        kode TEXT NOT NULL,
        asal TEXT NOT NULL,
        keterangan TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS register_locks (
        id SERIAL PRIMARY KEY,
        register_code TEXT NOT NULL,
        period_key TEXT NOT NULL,
        is_locked INTEGER NOT NULL DEFAULT 1,
        left_signer_title TEXT,
        left_signer_name TEXT,
        left_signer_pangkat_nip TEXT,
        right_signer_title TEXT,
        right_signer_name TEXT,
        right_signer_pangkat_nip TEXT,
        signature_alignment TEXT DEFAULT 'split',
        tempat_dokumen TEXT,
        closing_date TEXT,
        locked_by TEXT,
        locked_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(register_code, period_key)
      );

      CREATE TABLE IF NOT EXISTS register_rekapitulasi (
        id SERIAL PRIMARY KEY,
        register_code TEXT NOT NULL,
        period_key TEXT NOT NULL,
        data_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(register_code, period_key)
      );

      CREATE INDEX IF NOT EXISTS idx_reg_entries_code ON register_entries (register_code);
      CREATE INDEX IF NOT EXISTS idx_reg_entries_code_urut ON register_entries (register_code, nomor_urut);
      CREATE INDEX IF NOT EXISTS idx_reg_locks_lookup ON register_locks (register_code, period_key);
      CREATE INDEX IF NOT EXISTS idx_reg_rekap_lookup ON register_rekapitulasi (register_code, period_key);
      CREATE INDEX IF NOT EXISTS idx_storage_codes_lookup ON storage_codes (kode);
    `);
    console.log("Database tables and indexes verified/initialized successfully.");
  } catch (error) {
    console.warn("Notice: Table auto-creation check (skipping if tables exist or connecting lazily):", error);
  }
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const list = await db.select().from(settings).limit(1);
    if (list.length > 0) {
      const item = list[0];
      let closingDatesParsed: Record<string, string> | undefined = undefined;
      if (item.closingDates) {
        try {
          closingDatesParsed = JSON.parse(item.closingDates);
        } catch (e) {
          // ignore json parse error
        }
      }

      let availableYearsParsed: number[] | undefined = undefined;
      if (item.availableYears) {
        try {
          availableYearsParsed = JSON.parse(item.availableYears);
        } catch (e) {}
      }

      return {
        id: item.id,
        kejaksaanName: item.kejaksaanName,
        tempatDokumen: item.tempatDokumen,
        tanggalDokumen: item.tanggalDokumen,
        leftSignerTitle: item.leftSignerTitle,
        leftSignerName: item.leftSignerName,
        leftSignerPangkatNip: item.leftSignerPangkatNip,
        rightSignerTitle: item.rightSignerTitle,
        rightSignerName: item.rightSignerName,
        rightSignerPangkatNip: item.rightSignerPangkatNip,
        signatureAlignment: (item.signatureAlignment as "split" | "center") || "split",
        availableYears: availableYearsParsed || [2024, 2025, 2026, 2027, 2028],
        closingDates: closingDatesParsed,
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
      };
    }
    // Seed default settings
    const inserted = await db.insert(settings).values(DEFAULT_SETTINGS).returning();
    const item = inserted[0];
    return {
      id: item.id,
      kejaksaanName: item.kejaksaanName,
      tempatDokumen: item.tempatDokumen,
      tanggalDokumen: item.tanggalDokumen,
      leftSignerTitle: item.leftSignerTitle,
      leftSignerName: item.leftSignerName,
      leftSignerPangkatNip: item.leftSignerPangkatNip,
      rightSignerTitle: item.rightSignerTitle,
      rightSignerName: item.rightSignerName,
      rightSignerPangkatNip: item.rightSignerPangkatNip,
      signatureAlignment: "split",
      availableYears: [2024, 2025, 2026, 2027, 2028],
      closingDates: undefined,
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
    };
  } catch (error) {
    console.error("Failed to get settings:", error);
    return DEFAULT_SETTINGS as AppSettings;
  }
}

export async function updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
  try {
    const list = await db.select().from(settings).limit(1);
    const payload: any = {
      kejaksaanName: data.kejaksaanName || DEFAULT_SETTINGS.kejaksaanName,
      tempatDokumen: data.tempatDokumen || DEFAULT_SETTINGS.tempatDokumen,
      tanggalDokumen: data.tanggalDokumen || null,
      leftSignerTitle: data.leftSignerTitle || DEFAULT_SETTINGS.leftSignerTitle,
      leftSignerName: data.leftSignerName || DEFAULT_SETTINGS.leftSignerName,
      leftSignerPangkatNip: data.leftSignerPangkatNip || DEFAULT_SETTINGS.leftSignerPangkatNip,
      rightSignerTitle: data.rightSignerTitle || DEFAULT_SETTINGS.rightSignerTitle,
      rightSignerName: data.rightSignerName || DEFAULT_SETTINGS.rightSignerName,
      rightSignerPangkatNip: data.rightSignerPangkatNip || DEFAULT_SETTINGS.rightSignerPangkatNip,
      signatureAlignment: data.signatureAlignment || "split",
      updatedAt: new Date(),
    };

    if (data.availableYears !== undefined) {
      payload.availableYears = JSON.stringify(data.availableYears);
    }

    if (data.closingDates !== undefined) {
      payload.closingDates = JSON.stringify(data.closingDates);
    }

    if (list.length > 0) {
      const updated = await db
        .update(settings)
        .set(payload)
        .where(eq(settings.id, list[0].id))
        .returning();
      const item = updated[0];
      let closingDatesParsed: Record<string, string> | undefined = undefined;
      if (item.closingDates) {
        try {
          closingDatesParsed = JSON.parse(item.closingDates);
        } catch (e) {}
      }
      let availableYearsParsed: number[] | undefined = undefined;
      if (item.availableYears) {
        try {
          availableYearsParsed = JSON.parse(item.availableYears);
        } catch (e) {}
      }
      return {
        id: item.id,
        kejaksaanName: item.kejaksaanName,
        tempatDokumen: item.tempatDokumen,
        tanggalDokumen: item.tanggalDokumen,
        leftSignerTitle: item.leftSignerTitle,
        leftSignerName: item.leftSignerName,
        leftSignerPangkatNip: item.leftSignerPangkatNip,
        rightSignerTitle: item.rightSignerTitle,
        rightSignerName: item.rightSignerName,
        rightSignerPangkatNip: item.rightSignerPangkatNip,
        signatureAlignment: (item.signatureAlignment as "split" | "center") || "split",
        availableYears: availableYearsParsed || [2024, 2025, 2026, 2027, 2028],
        closingDates: closingDatesParsed,
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
      };
    } else {
      const inserted = await db.insert(settings).values(payload).returning();
      const item = inserted[0];
      let closingDatesParsed: Record<string, string> | undefined = undefined;
      if (item.closingDates) {
        try {
          closingDatesParsed = JSON.parse(item.closingDates);
        } catch (e) {}
      }
      let availableYearsParsed: number[] | undefined = undefined;
      if (item.availableYears) {
        try {
          availableYearsParsed = JSON.parse(item.availableYears);
        } catch (e) {}
      }
      return {
        id: item.id,
        kejaksaanName: item.kejaksaanName,
        tempatDokumen: item.tempatDokumen,
        tanggalDokumen: item.tanggalDokumen,
        leftSignerTitle: item.leftSignerTitle,
        leftSignerName: item.leftSignerName,
        leftSignerPangkatNip: item.leftSignerPangkatNip,
        rightSignerTitle: item.rightSignerTitle,
        rightSignerName: item.rightSignerName,
        rightSignerPangkatNip: item.rightSignerPangkatNip,
        signatureAlignment: (item.signatureAlignment as "split" | "center") || "split",
        availableYears: availableYearsParsed || [2024, 2025, 2026, 2027, 2028],
        closingDates: closingDatesParsed,
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
      };
    }
  } catch (error) {
    console.error("Failed to update settings:", error);
    throw new Error("Failed to update settings", { cause: error });
  }
}

export async function getOfficers(): Promise<Officer[]> {
  try {
    const list = await db.select().from(officers).orderBy(asc(officers.id));
    if (list.length === 0) {
      // Seed default officers
      for (const off of INITIAL_OFFICERS) {
        await db.insert(officers).values(off);
      }
      const seeded = await db.select().from(officers).orderBy(asc(officers.id));
      return seeded.map((item) => ({
        id: item.id,
        nama: item.nama,
        pangkat: item.pangkat,
        nip: item.nip,
        jabatan: item.jabatan,
        isActive: item.isActive,
        createdAt: item.createdAt ? item.createdAt.toISOString() : null,
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
      }));
    }
    return list.map((item) => ({
      id: item.id,
      nama: item.nama,
      pangkat: item.pangkat,
      nip: item.nip,
      jabatan: item.jabatan,
      isActive: item.isActive,
      createdAt: item.createdAt ? item.createdAt.toISOString() : null,
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
    }));
  } catch (error) {
    console.error("Failed to get officers:", error);
    return INITIAL_OFFICERS.map((o, idx) => ({ ...o, id: idx + 1, isActive: 1 }));
  }
}

export async function createOfficer(data: { nama: string; pangkat: string; nip: string; jabatan?: string }): Promise<Officer> {
  try {
    const result = await db.insert(officers).values(data).returning();
    const item = result[0];
    return {
      id: item.id,
      nama: item.nama,
      pangkat: item.pangkat,
      nip: item.nip,
      jabatan: item.jabatan,
      isActive: item.isActive,
      createdAt: item.createdAt ? item.createdAt.toISOString() : null,
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
    };
  } catch (error) {
    console.error("Failed to create officer:", error);
    throw new Error("Failed to create officer", { cause: error });
  }
}

export async function updateOfficer(id: number, data: Partial<Officer>): Promise<Officer> {
  try {
    const updatePayload: Record<string, any> = { updatedAt: new Date() };
    if (data.nama !== undefined) updatePayload.nama = data.nama;
    if (data.pangkat !== undefined) updatePayload.pangkat = data.pangkat;
    if (data.nip !== undefined) updatePayload.nip = data.nip;
    if (data.jabatan !== undefined) updatePayload.jabatan = data.jabatan;
    if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

    const result = await db
      .update(officers)
      .set(updatePayload)
      .where(eq(officers.id, id))
      .returning();
    const item = result[0];
    return {
      id: item.id,
      nama: item.nama,
      pangkat: item.pangkat,
      nip: item.nip,
      jabatan: item.jabatan,
      isActive: item.isActive,
      createdAt: item.createdAt ? item.createdAt.toISOString() : null,
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
    };
  } catch (error) {
    console.error("Failed to update officer:", error);
    throw new Error("Failed to update officer", { cause: error });
  }
}

export async function deleteOfficer(id: number): Promise<boolean> {
  try {
    await db.delete(officers).where(eq(officers.id, id));
    return true;
  } catch (error) {
    console.error("Failed to delete officer:", error);
    throw new Error("Failed to delete officer", { cause: error });
  }
}

export async function getRegisterEntries(registerCode: string) {
  try {
    const rows = await db
      .select()
      .from(registerEntries)
      .where(eq(registerEntries.registerCode, registerCode))
      .orderBy(asc(registerEntries.nomorUrut), asc(registerEntries.id));

    return rows.map((r) => {
      let parsed = {};
      try {
        parsed = JSON.parse(r.dataJson);
      } catch (e) {
        parsed = {};
      }
      return {
        id: r.id,
        registerCode: r.registerCode,
        nomorUrut: r.nomorUrut,
        tgl: r.tgl,
        waktu: r.waktu,
        data: parsed,
        createdAt: r.createdAt?.toISOString(),
        updatedAt: r.updatedAt?.toISOString(),
      };
    });
  } catch (error) {
    console.error(`Failed to get entries for ${registerCode}:`, error);
    return [];
  }
}

export async function saveRegisterEntry(
  registerCode: string,
  entryData: {
    id?: number;
    nomorUrut: number;
    tgl?: string;
    waktu?: string;
    data: Record<string, any>;
  }
) {
  try {
    const jsonStr = JSON.stringify(entryData.data || {});
    if (entryData.id) {
      const updated = await db
        .update(registerEntries)
        .set({
          nomorUrut: entryData.nomorUrut,
          tgl: entryData.tgl || null,
          waktu: entryData.waktu || null,
          dataJson: jsonStr,
          updatedAt: new Date(),
        })
        .where(eq(registerEntries.id, entryData.id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db
        .insert(registerEntries)
        .values({
          registerCode,
          nomorUrut: entryData.nomorUrut,
          tgl: entryData.tgl || null,
          waktu: entryData.waktu || null,
          dataJson: jsonStr,
        })
        .returning();
      return inserted[0];
    }
  } catch (error) {
    console.error("Failed to save register entry:", error);
    throw new Error("Failed to save register entry", { cause: error });
  }
}

export async function deleteRegisterEntry(id: number): Promise<boolean> {
  try {
    await db.delete(registerEntries).where(eq(registerEntries.id, id));
    return true;
  } catch (error) {
    console.error("Failed to delete register entry:", error);
    throw new Error("Failed to delete register entry", { cause: error });
  }
}

export async function deleteRegisterEntriesBatch(ids: number[]): Promise<number> {
  if (!ids || ids.length === 0) return 0;
  try {
    await db.delete(registerEntries).where(inArray(registerEntries.id, ids));
    return ids.length;
  } catch (error) {
    console.error("Failed to batch delete register entries:", error);
    throw new Error("Failed to batch delete register entries", { cause: error });
  }
}

export async function importRegisterEntriesBatch(
  registerCode: string,
  entriesList: Array<{
    nomorUrut?: number;
    tgl?: string;
    waktu?: string;
    data: Record<string, any>;
  }>,
  options?: { clearExisting?: boolean }
) {
  try {
    if (options?.clearExisting) {
      await db.delete(registerEntries).where(eq(registerEntries.registerCode, registerCode));
    }

    const insertedRows = [];
    for (let i = 0; i < entriesList.length; i++) {
      const item = entriesList[i];
      const noUrut = item.nomorUrut || i + 1;
      const jsonStr = JSON.stringify(item.data || {});

      const res = await db
        .insert(registerEntries)
        .values({
          registerCode,
          nomorUrut: noUrut,
          tgl: item.tgl || null,
          waktu: item.waktu || null,
          dataJson: jsonStr,
        })
        .returning();

      if (res.length > 0) {
        insertedRows.push(res[0]);
      }
    }

    return {
      success: true,
      count: insertedRows.length,
    };
  } catch (error) {
    console.error(`Failed to batch import entries for ${registerCode}:`, error);
    throw new Error(`Failed to batch import entries: ${error}`);
  }
}

export async function getRegistersSummary() {
  try {
    const counts = await db
      .select({
        registerCode: registerEntries.registerCode,
        count: sql<number>`count(*)::int`,
      })
      .from(registerEntries)
      .groupBy(registerEntries.registerCode);

    const officersCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(officers);

    const countMap: Record<string, number> = {};
    let totalEntries = 0;
    for (const row of counts) {
      countMap[row.registerCode] = row.count;
      totalEntries += row.count;
    }

    return {
      totalRegisters: REGISTER_DEFINITIONS.length,
      totalEntries,
      totalOfficers: officersCount[0]?.count || 0,
      countsByRegister: countMap,
    };
  } catch (error) {
    console.error("Failed to get registers summary:", error);
    return {
      totalRegisters: 23,
      totalEntries: 0,
      totalOfficers: 0,
      countsByRegister: {},
    };
  }
}

export async function getStorageCodes(): Promise<StorageCodeMapping[]> {
  try {
    const list = await db.select().from(storageCodes).orderBy(asc(storageCodes.kode), asc(storageCodes.asal));
    return list.map((item) => ({
      id: item.id,
      kode: item.kode,
      asal: item.asal,
      keterangan: item.keterangan || "",
      createdAt: item.createdAt ? item.createdAt.toISOString() : null,
    }));
  } catch (error) {
    console.error("Failed to get storage codes:", error);
    return [];
  }
}

export async function saveStorageCode(payload: {
  id?: number;
  kode: string;
  asal: string;
  keterangan?: string;
}): Promise<StorageCodeMapping> {
  try {
    const { id, kode, asal, keterangan } = payload;
    if (id) {
      const res = await db
        .update(storageCodes)
        .set({
          kode,
          asal,
          keterangan: keterangan || null,
          updatedAt: new Date(),
        })
        .where(eq(storageCodes.id, id))
        .returning();

      return {
        id: res[0].id,
        kode: res[0].kode,
        asal: res[0].asal,
        keterangan: res[0].keterangan,
      };
    } else {
      const res = await db
        .insert(storageCodes)
        .values({
          kode,
          asal,
          keterangan: keterangan || null,
        })
        .returning();

      return {
        id: res[0].id,
        kode: res[0].kode,
        asal: res[0].asal,
        keterangan: res[0].keterangan,
      };
    }
  } catch (error) {
    console.error("Failed to save storage code:", error);
    throw new Error(`Failed to save storage code: ${error}`);
  }
}

export async function deleteStorageCode(id: number): Promise<boolean> {
  try {
    await db.delete(storageCodes).where(eq(storageCodes.id, id));
    return true;
  } catch (error) {
    console.error("Failed to delete storage code:", error);
    throw new Error(`Failed to delete storage code: ${error}`);
  }
}

export const INITIAL_STORAGE_CODE_MAPPINGS: Array<{ kode: string; asal: string; keterangan?: string }> = [
  { kode: "ARSIP-01", asal: "KEJAKSAAN TINGGI BALI | BIDANG PENGAWASAN", keterangan: "Pengawasan Kejati Bali" },
  { kode: "ARSIP-02", asal: "KEJAKSAAN TINGGI BALI | BIDANG INTELIJEN", keterangan: "Intelijen Kejati Bali" },
  { kode: "ARSIP-03", asal: "KEJAKSAAN TINGGI BALI | KEJAKSAAN TINGGI", keterangan: "Surat Umum Kejati Bali" },
  { kode: "ARSIP-04", asal: "KEJAKSAAN AGUNG | KELOMPOK JABATAN FUNGSIONAL", keterangan: "Kejaksaan Agung RI" },
  { kode: "ARSIP-05", asal: "KASI INTEL KN TABANAN", keterangan: "Internal Seksi Intelijen" },
  { kode: "ARSIP-06", asal: "SEKDA KAB TABANAN", keterangan: "Sekretariat Daerah Tabanan" },
  { kode: "ARSIP-07", asal: "SEKDA TABANAN", keterangan: "Sekretariat Daerah Tabanan" },
  { kode: "ARSIP-08", asal: "DINAS PUPR TBN", keterangan: "Dinas PUPR Kabupaten Tabanan" },
  { kode: "ARSIP-09", asal: "Dinas PUPR", keterangan: "Dinas PUPR Kabupaten Tabanan" },
  { kode: "ARSIP-10", asal: "DISPERINDAG TBN", keterangan: "Dinas Perindag Kabupaten Tabanan" },
  { kode: "ARSIP-11", asal: "PLN ULP TABANAN", keterangan: "Instansi BUMN / PLN" },
];

export async function seedStorageCodesIfEmpty(): Promise<void> {
  try {
    const existing = await db.select({ id: storageCodes.id }).from(storageCodes).limit(1);
    if (existing.length === 0) {
      console.log("Seeding initial storage codes mapping...");
      for (const item of INITIAL_STORAGE_CODE_MAPPINGS) {
        await db.insert(storageCodes).values({
          kode: item.kode,
          asal: item.asal,
          keterangan: item.keterangan || null,
        });
      }
      console.log("Initial storage codes seeded successfully.");
    }
  } catch (err) {
    console.warn("Could not seed storage codes:", err);
  }
}

// ----------------- Register Lock Queries -----------------

export async function getRegisterLocks(registerCode?: string): Promise<RegisterLock[]> {
  try {
    let rows;
    if (registerCode) {
      rows = await db
        .select()
        .from(registerLocks)
        .where(eq(registerLocks.registerCode, registerCode));
    } else {
      rows = await db.select().from(registerLocks);
    }

    return rows.map((r) => ({
      id: r.id,
      registerCode: r.registerCode,
      periodKey: r.periodKey,
      isLocked: r.isLocked === 1,
      leftSignerTitle: r.leftSignerTitle || undefined,
      leftSignerName: r.leftSignerName || undefined,
      leftSignerPangkatNip: r.leftSignerPangkatNip || undefined,
      rightSignerTitle: r.rightSignerTitle || undefined,
      rightSignerName: r.rightSignerName || undefined,
      rightSignerPangkatNip: r.rightSignerPangkatNip || undefined,
      signatureAlignment: (r.signatureAlignment as "split" | "center") || "split",
      tempatDokumen: r.tempatDokumen || undefined,
      closingDate: r.closingDate || undefined,
      lockedBy: r.lockedBy || undefined,
      lockedAt: r.lockedAt,
      updatedAt: r.updatedAt,
    }));
  } catch (error) {
    console.error("Failed to get register locks:", error);
    return [];
  }
}

export async function getRegisterLock(
  registerCode: string,
  periodKey: string,
): Promise<RegisterLock | null> {
  try {
    const rows = await db
      .select()
      .from(registerLocks)
      .where(
        and(
          eq(registerLocks.registerCode, registerCode),
          eq(registerLocks.periodKey, periodKey),
        ),
      )
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      registerCode: r.registerCode,
      periodKey: r.periodKey,
      isLocked: r.isLocked === 1,
      leftSignerTitle: r.leftSignerTitle || undefined,
      leftSignerName: r.leftSignerName || undefined,
      leftSignerPangkatNip: r.leftSignerPangkatNip || undefined,
      rightSignerTitle: r.rightSignerTitle || undefined,
      rightSignerName: r.rightSignerName || undefined,
      rightSignerPangkatNip: r.rightSignerPangkatNip || undefined,
      signatureAlignment: (r.signatureAlignment as "split" | "center") || "split",
      tempatDokumen: r.tempatDokumen || undefined,
      closingDate: r.closingDate || undefined,
      lockedBy: r.lockedBy || undefined,
      lockedAt: r.lockedAt,
      updatedAt: r.updatedAt,
    };
  } catch (error) {
    console.error("Failed to get register lock:", error);
    return null;
  }
}

export async function saveRegisterLock(data: RegisterLock): Promise<RegisterLock> {
  try {
    const existing = await db
      .select()
      .from(registerLocks)
      .where(
        and(
          eq(registerLocks.registerCode, data.registerCode),
          eq(registerLocks.periodKey, data.periodKey),
        ),
      )
      .limit(1);

    const values = {
      registerCode: data.registerCode,
      periodKey: data.periodKey,
      isLocked: data.isLocked ? 1 : 0,
      leftSignerTitle: data.leftSignerTitle || null,
      leftSignerName: data.leftSignerName || null,
      leftSignerPangkatNip: data.leftSignerPangkatNip || null,
      rightSignerTitle: data.rightSignerTitle || null,
      rightSignerName: data.rightSignerName || null,
      rightSignerPangkatNip: data.rightSignerPangkatNip || null,
      signatureAlignment: data.signatureAlignment || "split",
      tempatDokumen: data.tempatDokumen || null,
      closingDate: data.closingDate || null,
      lockedBy: data.lockedBy || null,
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      await db
        .update(registerLocks)
        .set(values)
        .where(eq(registerLocks.id, existing[0].id));
      return {
        ...data,
        id: existing[0].id,
      };
    } else {
      const res = await db
        .insert(registerLocks)
        .values({
          ...values,
          lockedAt: new Date(),
        })
        .returning();
      return {
        ...data,
        id: res[0].id,
        lockedAt: res[0].lockedAt,
      };
    }
  } catch (error) {
    console.error("Failed to save register lock:", error);
    throw new Error(`Failed to save register lock: ${error}`);
  }
}

export async function unlockRegister(
  registerCode: string,
  periodKey: string,
): Promise<boolean> {
  try {
    await db
      .delete(registerLocks)
      .where(
        and(
          eq(registerLocks.registerCode, registerCode),
          eq(registerLocks.periodKey, periodKey),
        ),
      );
    return true;
  } catch (error) {
    console.error("Failed to unlock register:", error);
    throw new Error(`Failed to unlock register: ${error}`);
  }
}

// ----------------- Database Archiving & Retention (3-Year Rolling Policy) -----------------

export function extractYearFromEntry(entry: {
  tgl?: string | null;
  dataJson?: string | null;
  createdAt?: Date | null;
}): number {
  if (entry.tgl) {
    const match = String(entry.tgl).match(/\b(19\d\d|20\d\d)\b/);
    if (match) return parseInt(match[1], 10);
  }
  if (entry.dataJson) {
    try {
      const data = typeof entry.dataJson === "string" ? JSON.parse(entry.dataJson) : entry.dataJson;
      const dateKeys = [
        "tgl",
        "tanggal",
        "tgl_terima",
        "tgl_surat",
        "tgl_diterima",
        "tgl_dikirim",
        "tgl_lapinhar",
        "tgl_lapinsus",
        "tgl_lapintel",
        "tgl_prodin",
        "tgl_kegiatan",
        "tgl_operasi",
        "tgl_lid",
        "tgl_pam",
        "tgl_gal",
        "tgl_surat_tugas",
        "tgl_pemantauan",
        "tgl_permohonan",
        "tgl_mulai",
        "tgl_selesai",
        "waktu_kejadian",
        "pemaparan_tanggal",
        "waktu_lapor",
      ];
      for (const key of dateKeys) {
        if (data[key]) {
          const match = String(data[key]).match(/\b(19\d\d|20\d\d)\b/);
          if (match) return parseInt(match[1], 10);
        }
      }
      for (const val of Object.values(data)) {
        if (typeof val === "string") {
          const match = val.match(/\b(19\d\d|20\d\d)\b/);
          if (match) return parseInt(match[1], 10);
        }
      }
    } catch (e) {}
  }
  if (entry.createdAt) {
    return new Date(entry.createdAt).getFullYear();
  }
  return 2026;
}

export function extractYearFromPeriodKey(periodKey: string): number {
  const match = String(periodKey).match(/\b(19\d\d|20\d\d)\b/);
  return match ? parseInt(match[1], 10) : 2026;
}

export async function getDatabaseArchiveStats(): Promise<DatabaseArchiveStats> {
  try {
    const [allEntries, allLocks, currentSettings] = await Promise.all([
      db.select().from(registerEntries),
      db.select().from(registerLocks),
      getSettings(),
    ]);

    const currentYear = new Date().getFullYear(); // e.g. 2026
    const retentionYears = [currentYear - 2, currentYear - 1, currentYear]; // [2024, 2025, 2026]

    const yearStatsMap: Record<
      number,
      { entryCount: number; lockCount: number; estimatedBytes: number }
    > = {};

    // Initialize configured available years or standard years
    const defaultYears = currentSettings.availableYears || [2023, 2024, 2025, 2026, 2027];
    for (const y of defaultYears) {
      yearStatsMap[y] = { entryCount: 0, lockCount: 0, estimatedBytes: 0 };
    }

    let totalEstimatedBytes = 0;

    for (const entry of allEntries) {
      const year = extractYearFromEntry(entry);
      if (!yearStatsMap[year]) {
        yearStatsMap[year] = { entryCount: 0, lockCount: 0, estimatedBytes: 0 };
      }
      const entryBytes =
        (entry.dataJson?.length || 0) +
        (entry.tgl?.length || 0) +
        (entry.registerCode?.length || 0) +
        64; // row overhead

      yearStatsMap[year].entryCount += 1;
      yearStatsMap[year].estimatedBytes += entryBytes;
      totalEstimatedBytes += entryBytes;
    }

    for (const lock of allLocks) {
      const year = extractYearFromPeriodKey(lock.periodKey);
      if (!yearStatsMap[year]) {
        yearStatsMap[year] = { entryCount: 0, lockCount: 0, estimatedBytes: 0 };
      }
      const lockBytes = 256;
      yearStatsMap[year].lockCount += 1;
      yearStatsMap[year].estimatedBytes += lockBytes;
      totalEstimatedBytes += lockBytes;
    }

    const yearsList: ArchiveYearStats[] = Object.keys(yearStatsMap)
      .map(Number)
      .sort((a, b) => b - a)
      .map((year) => ({
        year,
        entryCount: yearStatsMap[year].entryCount,
        lockCount: yearStatsMap[year].lockCount,
        estimatedBytes: yearStatsMap[year].estimatedBytes,
        isRetentionActive: retentionYears.includes(year) || year > currentYear,
      }));

    return {
      totalEntries: allEntries.length,
      totalLocks: allLocks.length,
      totalEstimatedBytes,
      currentYear,
      retentionYears,
      years: yearsList,
    };
  } catch (error) {
    console.error("Failed to get database archive stats:", error);
    throw new Error("Failed to get database archive stats", { cause: error });
  }
}

export async function exportYearArchive(
  year: number,
  exportedBy: string = "Admin Intelijen"
): Promise<ArchivePackage> {
  try {
    const [allEntries, allLocks, currentSettings] = await Promise.all([
      db.select().from(registerEntries),
      db.select().from(registerLocks),
      getSettings(),
    ]);

    const matchingEntries = allEntries.filter((e) => extractYearFromEntry(e) === year);
    const matchingLocks = allLocks.filter((l) => extractYearFromPeriodKey(l.periodKey) === year);

    const formattedEntries = matchingEntries.map((e) => {
      let parsed = {};
      try {
        parsed = JSON.parse(e.dataJson);
      } catch (err) {
        parsed = {};
      }
      return {
        registerCode: e.registerCode,
        nomorUrut: e.nomorUrut,
        tgl: e.tgl,
        waktu: e.waktu,
        data: parsed,
      };
    });

    const formattedLocks = matchingLocks.map((l) => ({
      registerCode: l.registerCode,
      periodKey: l.periodKey,
      isLocked: l.isLocked === 1,
      leftSignerTitle: l.leftSignerTitle || undefined,
      leftSignerName: l.leftSignerName || undefined,
      leftSignerPangkatNip: l.leftSignerPangkatNip || undefined,
      rightSignerTitle: l.rightSignerTitle || undefined,
      rightSignerName: l.rightSignerName || undefined,
      rightSignerPangkatNip: l.rightSignerPangkatNip || undefined,
      signatureAlignment: (l.signatureAlignment as "split" | "center") || "split",
      tempatDokumen: l.tempatDokumen || undefined,
      closingDate: l.closingDate || undefined,
      lockedBy: l.lockedBy || undefined,
      lockedAt: l.lockedAt,
      updatedAt: l.updatedAt,
    }));

    return {
      version: "1.0",
      app: `AMERTA - ${currentSettings.kejaksaanName || "Kejaksaan Negeri Tabanan"}`,
      year,
      exportedAt: new Date().toISOString(),
      exportedBy,
      totalEntries: formattedEntries.length,
      totalLocks: formattedLocks.length,
      entries: formattedEntries,
      locks: formattedLocks,
    };
  } catch (error) {
    console.error(`Failed to export archive for year ${year}:`, error);
    throw new Error(`Failed to export archive for year ${year}`, { cause: error });
  }
}

export async function purgeYearData(
  year: number
): Promise<{ deletedEntriesCount: number; deletedLocksCount: number }> {
  try {
    const [allEntries, allLocks] = await Promise.all([
      db.select().from(registerEntries),
      db.select().from(registerLocks),
    ]);

    const entryIdsToDelete = allEntries
      .filter((e) => extractYearFromEntry(e) === year)
      .map((e) => e.id);

    const lockIdsToDelete = allLocks
      .filter((l) => extractYearFromPeriodKey(l.periodKey) === year)
      .map((l) => l.id);

    for (const id of entryIdsToDelete) {
      await db.delete(registerEntries).where(eq(registerEntries.id, id));
    }

    for (const id of lockIdsToDelete) {
      await db.delete(registerLocks).where(eq(registerLocks.id, id));
    }

    return {
      deletedEntriesCount: entryIdsToDelete.length,
      deletedLocksCount: lockIdsToDelete.length,
    };
  } catch (error) {
    console.error(`Failed to purge data for year ${year}:`, error);
    throw new Error(`Failed to purge data for year ${year}`, { cause: error });
  }
}

export async function restoreArchivePackage(
  pkg: ArchivePackage,
  mode: "replace" | "merge" = "replace"
): Promise<{ restoredEntries: number; restoredLocks: number }> {
  try {
    if (!pkg || !pkg.year || !Array.isArray(pkg.entries)) {
      throw new Error("Format berkas arsip tidak valid atau rusak.");
    }

    if (mode === "replace") {
      await purgeYearData(pkg.year);
    }

    let restoredEntries = 0;
    for (const entry of pkg.entries) {
      const jsonStr = JSON.stringify(entry.data || {});
      await db.insert(registerEntries).values({
        registerCode: entry.registerCode,
        nomorUrut: entry.nomorUrut || 1,
        tgl: entry.tgl || null,
        waktu: entry.waktu || null,
        dataJson: jsonStr,
      });
      restoredEntries += 1;
    }

    let restoredLocks = 0;
    if (Array.isArray(pkg.locks)) {
      for (const lock of pkg.locks) {
        await saveRegisterLock(lock);
        restoredLocks += 1;
      }
    }

    return {
      restoredEntries,
      restoredLocks,
    };
  } catch (error) {
    console.error("Failed to restore archive package:", error);
    throw new Error(`Failed to restore archive package: ${error}`, { cause: error });
  }
}

export async function getRegisterRekapitulasi(
  registerCode: string,
  periodKey: string
): Promise<RegisterRekapitulasiRecord | null> {
  try {
    const list = await db
      .select()
      .from(registerRekapitulasi)
      .where(
        and(
          eq(registerRekapitulasi.registerCode, registerCode),
          eq(registerRekapitulasi.periodKey, periodKey)
        )
      )
      .limit(1);

    if (list.length === 0) return null;
    const item = list[0];
    let parsedData: Record<string, number | string> = {};
    try {
      parsedData = JSON.parse(item.dataJson || "{}");
    } catch (e) {
      console.error("Failed to parse rekapitulasi dataJson:", e);
    }

    return {
      id: item.id,
      registerCode: item.registerCode,
      periodKey: item.periodKey,
      data: parsedData,
      createdAt: item.createdAt ? item.createdAt.toISOString() : null,
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
    };
  } catch (error) {
    console.error("Failed to get register rekapitulasi:", error);
    return null;
  }
}

export async function saveRegisterRekapitulasi(
  registerCode: string,
  periodKey: string,
  data: Record<string, number | string>
): Promise<RegisterRekapitulasiRecord> {
  try {
    const existing = await db
      .select()
      .from(registerRekapitulasi)
      .where(
        and(
          eq(registerRekapitulasi.registerCode, registerCode),
          eq(registerRekapitulasi.periodKey, periodKey)
        )
      )
      .limit(1);

    const dataJson = JSON.stringify(data);
    const now = new Date();

    if (existing.length > 0) {
      await db
        .update(registerRekapitulasi)
        .set({
          dataJson,
          updatedAt: now,
        })
        .where(eq(registerRekapitulasi.id, existing[0].id));

      return {
        id: existing[0].id,
        registerCode,
        periodKey,
        data,
        createdAt: existing[0].createdAt ? existing[0].createdAt.toISOString() : null,
        updatedAt: now.toISOString(),
      };
    } else {
      const inserted = await db
        .insert(registerRekapitulasi)
        .values({
          registerCode,
          periodKey,
          dataJson,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const item = inserted[0];
      return {
        id: item.id,
        registerCode: item.registerCode,
        periodKey: item.periodKey,
        data,
        createdAt: item.createdAt ? item.createdAt.toISOString() : null,
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
      };
    }
  } catch (error) {
    console.error("Failed to save register rekapitulasi:", error);
    throw error;
  }
}

export async function deleteRegisterRekapitulasi(
  registerCode: string,
  periodKey: string
): Promise<boolean> {
  try {
    await db
      .delete(registerRekapitulasi)
      .where(
        and(
          eq(registerRekapitulasi.registerCode, registerCode),
          eq(registerRekapitulasi.periodKey, periodKey)
        )
      );
    return true;
  } catch (error) {
    console.error("Failed to delete register rekapitulasi:", error);
    return false;
  }
}



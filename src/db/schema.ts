import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  nip: text("nip"),
  pangkat: text("pangkat"),
  jabatan: text("jabatan"),
  role: text("role").default("operator"), // "admin" | "kasi_intel" | "operator" | "petugas"
  satker: text("satker").default("KEJAKSAAN NEGERI TABANAN"),
  photoUrl: text("photo_url"),
  ssoProvider: text("sso_provider").default("kejaksaan_sso"),
  lastLogin: timestamp("last_login").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const officers = pgTable("officers", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  pangkat: text("pangkat").notNull(),
  nip: text("nip").notNull(),
  jabatan: text("jabatan"),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  kejaksaanName: text("kejaksaan_name").notNull().default("KEJAKSAAN NEGERI TABANAN"),
  tempatDokumen: text("tempat_dokumen").notNull().default("Tabanan"),
  tanggalDokumen: text("tanggal_dokumen"),
  leftSignerTitle: text("left_signer_title").notNull().default("Mengetahui:\nKEPALA KEJAKSAAN NEGERI TABANAN"),
  leftSignerName: text("left_signer_name").notNull().default("ZAINUR ARIFIN SYAH, S.H., M.H."),
  leftSignerPangkatNip: text("left_signer_pangkat_nip").notNull().default("Jaksa Utama Pratama / NIP. 19740512 199903 1 002"),
  rightSignerTitle: text("right_signer_title").notNull().default("KEPALA SEKSI INTELIJEN"),
  rightSignerName: text("right_signer_name").notNull().default("I GUSTI NGURAH ANOM SUKASIH, S.H."),
  rightSignerPangkatNip: text("right_signer_pangkat_nip").notNull().default("Jaksa Muda / NIP. 19820815 200712 1 001"),
  signatureAlignment: text("signature_alignment").default("split"),
  availableYears: text("available_years"),
  closingDates: text("closing_dates"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const registers = pgTable("registers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // R.IN.1 to R.IN.23
  title: text("title").notNull(),
  orientation: text("orientation").notNull().default("portrait"), // portrait | landscape
  tahunTakwim: integer("tahun_takwim").notNull().default(2026),
  bidang: text("bidang"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const registerEntries = pgTable("register_entries", {
  id: serial("id").primaryKey(),
  registerCode: text("register_code").notNull(),
  nomorUrut: integer("nomor_urut").notNull(),
  tgl: text("tgl"),
  waktu: text("waktu"),
  dataJson: text("data_json").notNull(), // JSON payload of all fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const storageCodes = pgTable("storage_codes", {
  id: serial("id").primaryKey(),
  kode: text("kode").notNull(),
  asal: text("asal").notNull(),
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const registerLocks = pgTable("register_locks", {
  id: serial("id").primaryKey(),
  registerCode: text("register_code").notNull(),
  periodKey: text("period_key").notNull(),
  isLocked: integer("is_locked").notNull().default(1),
  leftSignerTitle: text("left_signer_title"),
  leftSignerName: text("left_signer_name"),
  leftSignerPangkatNip: text("left_signer_pangkat_nip"),
  rightSignerTitle: text("right_signer_title"),
  rightSignerName: text("right_signer_name"),
  rightSignerPangkatNip: text("right_signer_pangkat_nip"),
  signatureAlignment: text("signature_alignment").default("split"),
  tempatDokumen: text("tempat_dokumen"),
  closingDate: text("closing_date"),
  lockedBy: text("locked_by"),
  lockedAt: timestamp("locked_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


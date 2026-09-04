export interface Officer {
  id: number;
  nama: string;
  pangkat: string;
  nip: string;
  jabatan?: string | null;
  isActive?: number | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export interface AppSettings {
  id?: number;
  kejaksaanName: string;
  tempatDokumen: string;
  tanggalDokumen?: string | null;
  leftSignerTitle: string;
  leftSignerName: string;
  leftSignerPangkatNip: string;
  rightSignerTitle: string;
  rightSignerName: string;
  rightSignerPangkatNip: string;
  signatureAlignment?: "split" | "center"; // "split" = Left/Right (Kajari kiri, Kasi Intel kanan), "center" = Centered blocks
  availableYears?: number[]; // list of customizable years, e.g. [2024, 2025, 2026, 2027, 2028]
  closingDates?: Record<string, string>; // e.g. { "2026-01": "2026-01-31", "2026-02": "2026-02-28", ... }
  updatedAt?: string | Date | null;
}

export type DocumentOrientation = 'portrait' | 'landscape';

export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'date' 
  | 'time' 
  | 'datetime' 
  | 'officer_single' 
  | 'officer_multi' 
  | 'select' 
  | 'number';

export interface ColumnDefinition {
  key: string;
  label: string;
  colNumber: number | string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  subColumns?: {
    key: string;
    label: string;
    colNumber: number | string;
    type: FieldType;
  }[];
  widthPercent?: number;
}

export interface RegisterDefinition {
  code: string; // e.g. 'R.IN.1'
  number: number;
  title: string;
  subtitle?: string;
  category: 'Surat & Berita' | 'Kerja & Produk' | 'Kegiatan Intelijen' | 'Operasi Intelijen' | 'Layanan & Penyuluhan';
  orientation: DocumentOrientation;
  bidangOptions?: string[];
  hasRekapitulasi?: boolean;
  rekapitulasiFields?: { label: string; key: string; suffix?: string }[];
  columns: ColumnDefinition[];
  notes?: string;
}

export interface RegisterEntryRow {
  id: number;
  registerCode: string;
  nomorUrut: number;
  tgl?: string | null;
  waktu?: string | null;
  data: Record<string, any>;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface StorageCodeMapping {
  id?: number;
  kode: string; // e.g. "ARSIP-001" or "01"
  asal: string; // e.g. "KEJAKSAAN TINGGI BALI | BIDANG PENGAWASAN"
  keterangan?: string | null;
  createdAt?: string | null;
}

export interface RegisterLock {
  id?: number;
  registerCode: string;
  periodKey: string; // e.g. "2026-08", "2026-all", "all"
  isLocked: boolean;
  leftSignerTitle?: string;
  leftSignerName?: string;
  leftSignerPangkatNip?: string;
  rightSignerTitle?: string;
  rightSignerName?: string;
  rightSignerPangkatNip?: string;
  signatureAlignment?: "split" | "center";
  tempatDokumen?: string;
  closingDate?: string;
  lockedBy?: string;
  lockedAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export const RIN3_CATEGORIES = [
  "IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN",
  "SOSIAL BUDAYA DAN KEMASYARAKATAN",
  "EKONOMI DAN KEUANGAN",
  "PENGAMANAN PEMBANGUNAN STRATEGIS",
  "TEKNOLOGI INFORMASI DAN PRODUKSI INTELIJEN",
] as const;

export type Rin3CategoryType = typeof RIN3_CATEGORIES[number];

export type UserRole =
  | "admin"
  | "kasi_intel"
  | "operator"
  | "petugas"
  | "Kasi Intelijen"
  | "Jaksa Fungsional Intelijen"
  | "Staf Intelijen"
  | "Administrator";

export interface AppUser {
  id?: number;
  uid: string;
  name: string;
  email: string;
  username?: string;
  nip?: string;
  pangkat?: string;
  jabatan?: string;
  role: UserRole;
  unit?: string;
  satker?: string;
  photoUrl?: string;
  photoURL?: string;
  isLoggedIn?: boolean;
  ssoProvider?: "kejaksaan_sso" | "google" | "simkari" | "passkey";
  token?: string;
  lastLogin?: string;
}

export type User = AppUser;

export interface ArchiveYearStats {
  year: number;
  entryCount: number;
  lockCount: number;
  estimatedBytes: number;
  isRetentionActive: boolean;
}

export interface DatabaseArchiveStats {
  totalEntries: number;
  totalLocks: number;
  totalEstimatedBytes: number;
  currentYear: number;
  retentionYears: number[];
  years: ArchiveYearStats[];
}

export interface ArchivePackage {
  version: string;
  app: string;
  year: number;
  exportedAt: string;
  exportedBy?: string;
  totalEntries: number;
  totalLocks: number;
  entries: Array<{
    registerCode: string;
    nomorUrut: number;
    tgl?: string | null;
    waktu?: string | null;
    data: Record<string, any>;
  }>;
  locks: RegisterLock[];
}

export interface SsoPresetProfile {
  id: string;
  name: string;
  email: string;
  nip: string;
  pangkat: string;
  jabatan: string;
  role: UserRole;
  satker: string;
  description: string;
  avatarColor: string;
}



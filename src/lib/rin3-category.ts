import { RegisterEntryRow, RIN3_CATEGORIES, Rin3CategoryType } from "../types.js";

/**
 * Pemetaan Kode Surat Resmi Intelijen Kejaksaan RI ke Kategori R.IN.3:
 * - Dip = IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN
 * - Dsb = SOSIAL BUDAYA DAN KEMASYARAKATAN
 * - Dek = EKONOMI DAN KEUANGAN
 * - Dpp = PENGAMANAN PEMBANGUNAN STRATEGIS
 * - Dti = TEKNOLOGI INFORMASI DAN PRODUKSI INTELIJEN
 */
export const RIN3_CODE_MAP: Record<string, Rin3CategoryType> = {
  Dip: "IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN",
  Dsb: "SOSIAL BUDAYA DAN KEMASYARAKATAN",
  Dek: "EKONOMI DAN KEUANGAN",
  Dpp: "PENGAMANAN PEMBANGUNAN STRATEGIS",
  Dti: "TEKNOLOGI INFORMASI DAN PRODUKSI INTELIJEN",
};

export const RIN3_CATEGORY_CODE_MAP: Record<Rin3CategoryType, "Dip" | "Dsb" | "Dek" | "Dpp" | "Dti"> = {
  "IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN": "Dip",
  "SOSIAL BUDAYA DAN KEMASYARAKATAN": "Dsb",
  "EKONOMI DAN KEUANGAN": "Dek",
  "PENGAMANAN PEMBANGUNAN STRATEGIS": "Dpp",
  "TEKNOLOGI INFORMASI DAN PRODUKSI INTELIJEN": "Dti",
};

/**
 * Deteksi kategori R.IN.3 berdasarkan kode surat Kejaksaan:
 * - Dip (Ideologi, Politik, Pertahanan dan Keamanan)
 * - Dsb (Sosial Budaya dan Kemasyarakatan)
 * - Dek (Ekonomi dan Keuangan)
 * - Dpp (Pengamanan Pembangunan Strategis)
 * - Dti (Teknologi Informasi dan Produksi Intelijen)
 *
 * Mampu membaca format nomor surat seperti:
 * - R-1113/N.1.17.2/Dsb.4/07/2026
 * - R-1112/N.1.17.2/Dek.3/07/2026
 * - R-1102/N.1.17.2/Dip.2/07/2026
 * - PRINT-05/N.1.17/Dpp.1/04/2026
 * - SP.OPS-01/N.1.17/Dti.2/08/2026
 * - Serta kode mandiri "Dip", "Dsb", "Dek", "Dpp", "Dti"
 */
export function detectCategoryFromLetterCode(text?: string | null): Rin3CategoryType | null {
  if (!text || typeof text !== "string") return null;

  // Catatan: Gunakan batas karakter non-alfanumerik agar tidak mencocokkan kata pasif seperti "diproses", "diperiksa", "dipimpin".
  if (/(?:^|[^a-zA-Z0-9])dsb(?:[.-][0-9]+)?(?:$|[^a-zA-Z0-9])/i.test(text)) {
    return "SOSIAL BUDAYA DAN KEMASYARAKATAN";
  }
  if (/(?:^|[^a-zA-Z0-9])dek(?:[.-][0-9]+)?(?:$|[^a-zA-Z0-9])/i.test(text)) {
    return "EKONOMI DAN KEUANGAN";
  }
  if (/(?:^|[^a-zA-Z0-9])dpp(?:[.-][0-9]+)?(?:$|[^a-zA-Z0-9])/i.test(text)) {
    return "PENGAMANAN PEMBANGUNAN STRATEGIS";
  }
  if (/(?:^|[^a-zA-Z0-9])dti(?:[.-][0-9]+)?(?:$|[^a-zA-Z0-9])/i.test(text)) {
    return "TEKNOLOGI INFORMASI DAN PRODUKSI INTELIJEN";
  }
  if (/(?:^|[^a-zA-Z0-9])dip(?:[.-][0-9]+)?(?:$|[^a-zA-Z0-9])/i.test(text)) {
    return "IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN";
  }

  return null;
}

/**
 * Normalisasi string menjadi salah satu dari 5 kategori resmi R.IN.3.
 */
export function normalizeRin3Category(raw?: string | null): Rin3CategoryType | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Cek kode surat terlebih dahulu (misal: "Dip", "Dsb", "Dek", "Dpp", "Dti" atau nomor surat)
  const fromCode = detectCategoryFromLetterCode(trimmed);
  if (fromCode) return fromCode;

  const lower = trimmed.toLowerCase();

  if (
    lower.includes("ideologi") ||
    lower.includes("politik") ||
    lower.includes("pertahanan") ||
    lower.includes("keamanan") ||
    lower.includes("ideopol") ||
    lower.includes("hankam")
  ) {
    return "IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN";
  }

  if (
    lower.includes("sosial") ||
    lower.includes("budaya") ||
    lower.includes("masyarakat") ||
    lower.includes("sosbud") ||
    lower.includes("sosbudmas") ||
    lower.includes("agama") ||
    lower.includes("aliran")
  ) {
    return "SOSIAL BUDAYA DAN KEMASYARAKATAN";
  }

  if (
    lower.includes("ekonomi") ||
    lower.includes("keuangan") ||
    lower.includes("ekkeu") ||
    lower.includes("ekokeu") ||
    lower.includes("pajak") ||
    lower.includes("cukai") ||
    lower.includes("bank") ||
    lower.includes("moneter")
  ) {
    return "EKONOMI DAN KEUANGAN";
  }

  if (
    lower.includes("pembangunan") ||
    lower.includes("strategis") ||
    lower.includes("pps") ||
    lower.includes("infrastruktur") ||
    lower.includes("proyek")
  ) {
    return "PENGAMANAN PEMBANGUNAN STRATEGIS";
  }

  if (
    lower.includes("teknologi") ||
    lower.includes("informasi") ||
    lower.includes("produksi") ||
    lower.includes("sandi") ||
    lower.includes("siber") ||
    lower.includes("ti_intel") ||
    lower.includes("ti intel") ||
    lower.includes("sinyal")
  ) {
    return "TEKNOLOGI INFORMASI DAN PRODUKSI INTELIJEN";
  }

  return null;
}

/**
 * Deteksi kategori R.IN.3 secara cerdas:
 * 1. PRIORITAS UTAMA: Kode surat resmi Kejaksaan (Dip, Dsb, Dek, Dpp, Dti) dari nomor surat / tindak lanjut.
 * 2. Cek field eksplisit data?.kategori / data?.bidang / data?.sektor jika sudah diatur.
 * 3. Analisis uraian peristiwa atau sumber bapul berdasarkan kata kunci intelijen.
 * 4. Fallback default: "IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN".
 */
export function detectRin3Category(entryOrData: RegisterEntryRow | Record<string, any>): Rin3CategoryType {
  const data: Record<string, any> =
    (entryOrData as RegisterEntryRow).data !== undefined
      ? (entryOrData as RegisterEntryRow).data || {}
      : (entryOrData as Record<string, any>) || {};

  // 1. PRIORITAS TERTINGGI: Deteksi dari Kode Surat (Dip, Dsb, Dek, Dpp, Dti)
  // Periksa field yang memuat nomor surat atau tindak lanjut
  const highPriorityCodeFields = [
    String(data.nomor_surat || ""),
    String(data.nomorSurat || ""),
    String(data.tindak_lanjut || ""),
    String(data.catatan || ""),
  ];

  for (const field of highPriorityCodeFields) {
    if (field) {
      const detected = detectCategoryFromLetterCode(field);
      if (detected) return detected;
    }
  }

  // 2. Cek field eksplisit kategori / bidang / sektor jika sudah diatur
  const explicit =
    normalizeRin3Category(typeof data.kategori === "string" ? data.kategori : undefined) ||
    normalizeRin3Category(typeof data.bidang === "string" ? data.bidang : undefined) ||
    normalizeRin3Category(typeof data.sektor === "string" ? data.sektor : undefined);

  if (explicit) return explicit;

  // 3. Cek kode surat di field lainnya (uraian_peristiwa, sumber_bapul, dll.)
  const secondaryCodeFields = [
    String(data.uraian_peristiwa || ""),
    String(data.sumber_bapul || ""),
    String(data.keterangan || ""),
  ];

  for (const field of secondaryCodeFields) {
    if (field) {
      const detected = detectCategoryFromLetterCode(field);
      if (detected) return detected;
    }
  }

  // 4. Analisis kata kunci teks jika kode surat tidak ada
  const corpus = [
    ...highPriorityCodeFields,
    ...secondaryCodeFields,
  ]
    .join(" ")
    .toLowerCase();

  // Keyword Matching
  // PPS (Pengamanan Pembangunan Strategis)
  if (
    corpus.includes("pps") ||
    corpus.includes("pengamanan pembangunan strategis") ||
    corpus.includes("proyek strategis") ||
    corpus.includes("pupr") ||
    corpus.includes("infrastruktur") ||
    corpus.includes("bendungan") ||
    corpus.includes("jembatan") ||
    corpus.includes("tender") ||
    corpus.includes("pengadaan tanah") ||
    corpus.includes("pln ulp") ||
    corpus.includes("dinas pupr")
  ) {
    return "PENGAMANAN PEMBANGUNAN STRATEGIS";
  }

  // Ekonomi & Keuangan
  if (
    corpus.includes("ekonomi") ||
    corpus.includes("keuangan") ||
    corpus.includes("pajak") ||
    corpus.includes("cukai") ||
    corpus.includes("bea cukai") ||
    corpus.includes("lembaga keuangan") ||
    corpus.includes("investasi") ||
    corpus.includes("penanaman modal") ||
    corpus.includes("perbankan") ||
    corpus.includes("perdagangan") ||
    corpus.includes("perindustrian") ||
    corpus.includes("disperindag") ||
    corpus.includes("sembako") ||
    corpus.includes("inflasi") ||
    corpus.includes("agraria") ||
    corpus.includes("pertanahan") ||
    corpus.includes("lingkungan hidup") ||
    corpus.includes("kehutanan") ||
    corpus.includes("perikanan")
  ) {
    return "EKONOMI DAN KEUANGAN";
  }

  // Sosial Budaya & Kemasyarakatan
  if (
    corpus.includes("sosial") ||
    corpus.includes("budaya") ||
    corpus.includes("kemasyarakatan") ||
    corpus.includes("ngaben") ||
    corpus.includes("pitra yadnya") ||
    corpus.includes("upacara adat") ||
    corpus.includes("upacara keagamaan") ||
    corpus.includes("desa adat") ||
    corpus.includes("melayat") ||
    corpus.includes("sambang duka") ||
    corpus.includes("aliran kepercayaan") ||
    /\bormas\b/i.test(corpus) ||
    /\blsm\b/i.test(corpus) ||
    corpus.includes("barang cetakan") ||
    corpus.includes("buku") ||
    corpus.includes("kerukunan umat")
  ) {
    return "SOSIAL BUDAYA DAN KEMASYARAKATAN";
  }

  // TI & Produksi Intelijen
  if (
    corpus.includes("teknologi informasi") ||
    corpus.includes("produksi intelijen") ||
    corpus.includes("siber") ||
    corpus.includes("cyber") ||
    corpus.includes("sandi") ||
    corpus.includes("sinyal") ||
    corpus.includes("klandestin") ||
    corpus.includes("digital forensik") ||
    corpus.includes("transmisi berita") ||
    corpus.includes("server") ||
    corpus.includes("aplikasi intelijen")
  ) {
    return "TEKNOLOGI INFORMASI DAN PRODUKSI INTELIJEN";
  }

  // Fallback default
  return "IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN";
}

/**
 * Filter daftar baris R.IN.3 berdasarkan kategori
 */
export function filterRin3EntriesByCategory(
  entries: RegisterEntryRow[],
  category: Rin3CategoryType | "all",
): RegisterEntryRow[] {
  if (category === "all") return entries;
  return entries.filter((entry) => detectRin3Category(entry) === category);
}

/**
 * Hitung jumlah entri per kategori R.IN.3
 */
export function countRin3EntriesByCategory(
  entries: RegisterEntryRow[],
): Record<string, number> {
  const counts: Record<string, number> = {
    all: entries.length,
  };

  RIN3_CATEGORIES.forEach((cat) => {
    counts[cat] = 0;
  });

  entries.forEach((entry) => {
    const cat = detectRin3Category(entry);
    if (counts[cat] !== undefined) {
      counts[cat]++;
    }
  });

  return counts;
}

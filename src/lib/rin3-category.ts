import { RegisterEntryRow, RIN3_CATEGORIES, Rin3CategoryType } from "../types.js";

/**
 * Normalisasi string menjadi salah satu dari 5 kategori resmi R.IN.3.
 */
export function normalizeRin3Category(raw?: string | null): Rin3CategoryType | null {
  if (!raw || typeof raw !== "string") return null;
  const lower = raw.toLowerCase().trim();

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
 * 1. Prioritaskan field data?.kategori / data?.bidang / data?.sektor jika sudah diisi.
 * 2. Analisis uraian peristiwa, bapul, atau tindak lanjut berdasarkan kata kunci intelijen.
 * 3. Fallback default: "IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN".
 */
export function detectRin3Category(entryOrData: RegisterEntryRow | Record<string, any>): Rin3CategoryType {
  const data: Record<string, any> =
    (entryOrData as RegisterEntryRow).data !== undefined
      ? (entryOrData as RegisterEntryRow).data || {}
      : (entryOrData as Record<string, any>) || {};

  // 1. Cek field eksplisit
  const explicit =
    normalizeRin3Category(typeof data.kategori === "string" ? data.kategori : undefined) ||
    normalizeRin3Category(typeof data.bidang === "string" ? data.bidang : undefined) ||
    normalizeRin3Category(typeof data.sektor === "string" ? data.sektor : undefined);

  if (explicit) return explicit;

  // 2. Analisis teks uraian dan tindak lanjut
  const corpus = [
    String(data.uraian_peristiwa || ""),
    String(data.tindak_lanjut || ""),
    String(data.sumber_bapul || ""),
    String(data.catatan || ""),
    String(data.keterangan || ""),
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

  // Ideologi, Politik, Hankam (Default untuk patroli kepolisian, polsek, pemilu, pilkada, keamanan wilayah)
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

import { StorageCodeMapping, RegisterDefinition } from "../types.js";

export interface ParsedCsvRow {
  [key: string]: string;
}

/**
 * Baris R.IN.3 dengan kolom Hal yang dimulai dari prefix ini tidak diimpor.
 */
const RIN3_IGNORED_HAL_PREFIXES = [
  "laporan bulanan",
  "surat pengantar",
];

/**
 * Robust CSV parser that handles quotes, escaped quotes, commas, and newlines.
 */
export function parseCsv(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let currentValue = "";
  let inQuotes = false;
  let index = 0;

  while (index < text.length) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentValue += '"';
          index += 2;
          continue;
        }

        inQuotes = false;
        index++;
        continue;
      }

      currentValue += char;
      index++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      index++;
      continue;
    }

    if (char === ",") {
      row.push(currentValue.trim());
      currentValue = "";
      index++;
      continue;
    }

    if (char === "\r") {
      if (nextChar === "\n") {
        index++;
      }

      row.push(currentValue.trim());
      currentValue = "";

      if (row.some((cell) => cell.length > 0)) {
        result.push(row);
      }

      row = [];
      index++;
      continue;
    }

    if (char === "\n") {
      row.push(currentValue.trim());
      currentValue = "";

      if (row.some((cell) => cell.length > 0)) {
        result.push(row);
      }

      row = [];
      index++;
      continue;
    }

    currentValue += char;
    index++;
  }

  if (currentValue.length > 0 || row.length > 0) {
    row.push(currentValue.trim());

    if (row.some((cell) => cell.length > 0)) {
      result.push(row);
    }
  }

  return result;
}

/**
 * Generate a random time between startHour and endHour.
 * Example output: 09:35, 11:20, 14:15.
 */
export function getRandomTimeBetween(
  startHour: number = 9,
  endHour: number = 15,
): string {
  const hour =
    Math.floor(Math.random() * (endHour - startHour + 1)) + startHour;

  const minute = Math.floor(Math.random() * 60);

  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Normalize date to ISO YYYY-MM-DD.
 * Supports DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, and YYYY/MM/DD.
 */
export function normalizeDateToIso(dateStr: string): string {
  if (!dateStr) {
    return "";
  }

  const trimmed = dateStr.trim();

  const dmyMatch = trimmed.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/,
  );

  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];

    return `${year}-${month}-${day}`;
  }

  const ymdMatch = trimmed.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/,
  );

  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

/**
 * Menghilangkan spasi berlebih tetapi tidak mengubah karakter nomor surat.
 *
 * Contoh:
 * R-484/N.1.17/Dsb.4/08/2026
 * tetap tersimpan lengkap seperti semula.
 */
function normalizeLetterNumber(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Menemukan indeks header secara aman dengan prioritas kondisi.
 */
function findColumnIndex(
  headers: string[],
  conditions: Array<(header: string) => boolean>,
): number {
  for (const condition of conditions) {
    const idx = headers.findIndex((header) => condition(header));
    if (idx !== -1) {
      return idx;
    }
  }
  return -1;
}

/**
 * Konfigurasi kolom standar berdasarkan struktur CSV:
 *
 * No | Satker | Jenis Surat | Sifat Surat | No Register Surat | Tanggal
 * | Nomor | Asal | Tujuan | Hal | Status
 *
 * Sangat penting:
 * - "No" adalah nomor urut tabel.
 * - "Satker" adalah satuan kerja pengguna (BUKAN asal surat).
 * - "Asal" adalah instansi pengirim surat / asal surat.
 * - "No Register Surat" adalah register angka, misalnya 484.
 * - "Nomor" adalah nomor surat lengkap, misalnya:
 *   R-484/N.1.17/Dsb.4/08/2026
 */
/**
 * Helper to identify standard column indexes across various CSV formats,
 * including both simple headers ("No", "Tanggal", "Nomor", "Asal", "Hal")
 * and detailed ones ("Jenis Surat", "Sifat Surat", "No Register Surat", "Tujuan", "Status").
 */
function getStandardCsvColumnIndexes(headers: string[]) {
  const noIdx = findColumnIndex(headers, [
    (header) => header === "no",
    (header) => header === "no.",
    (header) => header === "nomor urut",
    (header) => header === "no urut",
  ]);

  const tanggalIdx = findColumnIndex(headers, [
    (header) => header === "tanggal",
    (header) => header === "tgl",
    (header) => header === "tanggal surat",
    (header) => header === "tgl surat",
    (header) => header.includes("tanggal"),
    (header) => header.includes("tgl"),
  ]);

  /*
   * Header harus tepat "nomor" atau "nomor surat".
   * Jangan gunakan "No Register Surat", karena nilai kolom itu hanya angka.
   */
  const nomorSuratIdx = findColumnIndex(headers, [
    (header) => header === "nomor",
    (header) => header === "nomor surat",
    (header) => header === "no surat",
    (header) => header === "no. surat",
    (header) => header === "no_surat",
  ]);

  /*
   * Header untuk asal surat (kolom "Satker" tidak dimasukkan sebagai asal).
   */
  const asalIdx = findColumnIndex(headers, [
    (header) => header === "asal",
    (header) => header === "asal surat",
    (header) => header === "diterima dari",
    (header) => header === "pengirim",
    (header) => header === "asal / pengirim",
    (header) => header === "dari",
    (header) => header === "satker asal",
    (header) => header === "satker pengirim",
    (header) => header.includes("pengirim"),
  ]);

  const tujuanIdx = findColumnIndex(headers, [
    (header) => header === "tujuan",
    (header) => header === "kepada",
    (header) => header === "diteruskan kepada",
    (header) => header === "tujuan surat",
    (header) => header.includes("tujuan"),
    (header) => header.includes("kepada"),
  ]);

  const halIdx = findColumnIndex(headers, [
    (header) => header === "hal",
    (header) => header === "perihal",
    (header) => header === "uraian",
    (header) => header.includes("perihal"),
    (header) => header.includes("uraian"),
  ]);

  const statusIdx = findColumnIndex(headers, [
    (header) => header === "status",
    (header) => header === "keterangan",
    (header) => header === "ket",
    (header) => header.includes("status"),
  ]);

  const sifatIdx = findColumnIndex(headers, [
    (header) => header === "sifat surat",
    (header) => header === "sifat",
    (header) => header.includes("sifat"),
  ]);

  const jenisSuratIdx = findColumnIndex(headers, [
    (header) => header === "jenis surat",
    (header) => header === "jenis",
    (header) => header.includes("jenis"),
  ]);

  const noRegisterIdx = findColumnIndex(headers, [
    (header) => header === "no register surat",
    (header) => header === "no register",
    (header) => header === "nomor register",
    (header) => header === "no agenda",
    (header) => header.includes("register"),
  ]);

  return {
    noIdx,
    tanggalIdx,
    nomorSuratIdx,
    asalIdx,
    tujuanIdx,
    halIdx,
    statusIdx,
    sifatIdx,
    jenisSuratIdx,
    noRegisterIdx,
  };
}

function getCell(row: string[], index: number): string {
  return index >= 0 ? row[index] || "" : "";
}

function getNomorUrut(
  rawNumber: string,
  fallbackNumber: number,
): number {
  const parsed = Number.parseInt(rawNumber, 10);

  return Number.isNaN(parsed) ? fallbackNumber : parsed;
}

/**
 * Helper to clean and split the 'Hal' / 'Perihal' column.
 * Handles formats like:
 * - "Lapinhar Perihal - Pelaksanaan Rekrutmen Dokter..."
 * - "Lapinhar Perihal -3.Penerbitan Keputusan Bupati..."
 * - "Laporan informasi harian - Pelaksanaan Kegiatan..."
 * - Strips trailing document extensions (.docx, .doc, .pdf)
 */
export function parseHalField(hal: string): {
  judulSurat: string;
  uraianMasalah: string;
} {
  let text = (hal || "").trim();
  text = text.replace(/\.{1,2}(docx|doc|pdf)$/i, "").trim();

  const dashIndex = text.indexOf("-");
  if (dashIndex !== -1) {
    let prefix = text.slice(0, dashIndex).trim();
    let suffix = text.slice(dashIndex + 1).trim();

    prefix = prefix.replace(/\s+perihal\b/gi, "").trim();
    if (!prefix) {
      prefix = "Lapinhar";
    }

    // Strip leading list numbers like "3.", "9.", "- "
    suffix = suffix.replace(/^[0-9]+[\.\)\-]\s*/, "").trim();

    return {
      judulSurat: prefix,
      uraianMasalah: suffix || text,
    };
  }

  return {
    judulSurat: "Lapinhar",
    uraianMasalah: text,
  };
}

/**
 * Transform CSV to R.IN.1.
 */
export function transformCsvToRIn1(rows: string[][]): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.toLowerCase().trim());

  const {
    noIdx,
    tanggalIdx,
    nomorSuratIdx,
    asalIdx,
    tujuanIdx,
    halIdx,
    statusIdx,
  } = getStandardCsvColumnIndexes(headers);

  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    if (row.length === 0 || row.every((cell) => !cell.trim())) {
      continue;
    }

    const rawNo = getCell(row, noIdx);
    const rawTanggal = getCell(row, tanggalIdx);
    const rawNomorSurat = getCell(row, nomorSuratIdx);
    const rawAsal = getCell(row, asalIdx);
    const rawTujuan = getCell(row, tujuanIdx);
    const rawHal = getCell(row, halIdx);
    const rawStatus = getCell(row, statusIdx);

    const nomorUrut = getNomorUrut(rawNo, result.length + 1);
    const isoDate = normalizeDateToIso(rawTanggal);
    const randomJam = getRandomTimeBetween(9, 15);
    const { uraianMasalah } = parseHalField(rawHal);

    const disposisiText = rawTujuan.trim()
      ? `${isoDate} - Kepada: ${rawTujuan.trim()}`
      : isoDate;

    result.push({
      nomorUrut,
      tgl: isoDate,
      waktu: randomJam,
      data: {
        tgl_terima: isoDate,
        jam_terima: randomJam,
        nomor_surat: normalizeLetterNumber(rawNomorSurat),
        tgl_surat: isoDate,
        asal_surat: rawAsal.trim() || "Kasi Intel Kejari Tabanan",
        perihal: uraianMasalah || rawHal.trim(),
        tgl_isi_disposisi: disposisiText,
        tindak_lanjut: "DITINDAKLANJUTI DAN DIARSIPKAN",
        keterangan: rawStatus.trim() || "-",
      },
    });
  }

  return result;
}

/**
 * Transform CSV to R.IN.3.
 *
 * Aturan:
 * - Waktu diterima = tanggal CSV.
 * - Sumber/Bapul = Organik Intelijen Kejari Tabanan (atau kolom Asal).
 * - Nilai informasi = A1.
 * - Uraian masalah = isi Hal setelah tanda "-" pertama (dibersihkan).
 * - Disposisi/Tindakan = Dilaporkan Kepada Pimpinan.
 * - Tindak lanjut = isi Hal sebelum "-" + nomor surat lengkap.
 * - Hal yang berawalan "Laporan Bulanan" atau "Surat Pengantar" diabaikan.
 */
export function transformCsvToRIn3(rows: string[][]): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.toLowerCase().trim());

  const {
    noIdx,
    tanggalIdx,
    nomorSuratIdx,
    asalIdx,
    halIdx,
    statusIdx,
  } = getStandardCsvColumnIndexes(headers);

  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    if (row.length === 0 || row.every((cell) => !cell.trim())) {
      continue;
    }

    const rawNo = getCell(row, noIdx);
    const rawTanggal = getCell(row, tanggalIdx);
    const rawNomorSurat = getCell(row, nomorSuratIdx);
    const rawAsal = getCell(row, asalIdx);
    const rawHal = getCell(row, halIdx);
    const rawStatus = getCell(row, statusIdx);

    const hal = rawHal.trim();

    /*
     * Normalisasi membuat semua variasi berikut tetap terdeteksi:
     * - LAPORAN BULANAN ...
     * - Surat Pengantar ...
     * - "  Surat   Pengantar ..."
     */
    const normalizedHal = hal.toLowerCase().replace(/\s+/g, " ");

    const shouldIgnore = RIN3_IGNORED_HAL_PREFIXES.some((prefix) =>
      normalizedHal.startsWith(prefix),
    );

    if (shouldIgnore) {
      continue;
    }

    const nomorUrut = getNomorUrut(rawNo, result.length + 1);
    const isoDate = normalizeDateToIso(rawTanggal);
    const nomorSurat = normalizeLetterNumber(rawNomorSurat);
    const { judulSurat, uraianMasalah } = parseHalField(hal);

    const tindakLanjut = nomorSurat
      ? `${judulSurat} Nomor: ${nomorSurat}`
      : judulSurat;

    result.push({
      nomorUrut,
      tgl: isoDate,
      waktu: "08:00",
      data: {
        waktu_diterima: isoDate,
        sumber_bapul: rawAsal.trim() || "Organik Intelijen Kejari Tabanan",
        nilai_data: "A1",
        uraian_peristiwa: uraianMasalah,
        catatan: "-",
        disposisi_tindakan: "Dilaporkan Kepada Pimpinan",
        tindak_lanjut: tindakLanjut,
        keterangan: rawStatus.trim() || "-",
      },
    });
  }

  return result;
}

/**
 * Transform CSV to R.IN.6.
 */
export function transformCsvToRIn6(
  rows: string[][],
  storageCodeMappings: StorageCodeMapping[] = [],
): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.toLowerCase().trim());

  const {
    noIdx,
    tanggalIdx,
    nomorSuratIdx,
    asalIdx,
    halIdx,
    statusIdx,
  } = getStandardCsvColumnIndexes(headers);

  const lookupKodeByAsal = (asalName: string): string => {
    const cleanAsal = asalName.trim().toLowerCase();

    if (!cleanAsal) {
      return "";
    }

    const exact = storageCodeMappings.find(
      (mapping) => mapping.asal.trim().toLowerCase() === cleanAsal,
    );

    if (exact) {
      return exact.kode;
    }

    const partial = storageCodeMappings.find((mapping) => {
      const mappingAsal = mapping.asal.trim().toLowerCase();

      return (
        cleanAsal.includes(mappingAsal) ||
        mappingAsal.includes(cleanAsal)
      );
    });

    return partial?.kode || "";
  };

  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    if (row.length === 0 || row.every((cell) => !cell.trim())) {
      continue;
    }

    const rawNo = getCell(row, noIdx);
    const rawTanggal = getCell(row, tanggalIdx);
    const rawNomorSurat = getCell(row, nomorSuratIdx);
    const rawAsal = getCell(row, asalIdx);
    const rawHal = getCell(row, halIdx);
    const rawStatus = getCell(row, statusIdx);

    const nomorUrut = getNomorUrut(rawNo, result.length + 1);
    const isoDate = normalizeDateToIso(rawTanggal);
    const randomJam = getRandomTimeBetween(9, 15);

    const nomorSurat = normalizeLetterNumber(rawNomorSurat);
    const tanggalSurat = rawTanggal.trim() || isoDate;

    const noTglSurat = nomorSurat
      ? `${nomorSurat} tgl. ${tanggalSurat}`
      : tanggalSurat;

    let kodePenyimpanan = lookupKodeByAsal(rawAsal);
    if (!kodePenyimpanan) {
      const lowerNomor = rawNomorSurat.toLowerCase();
      if (lowerNomor.includes("dsb.4") || lowerNomor.includes("dsb")) kodePenyimpanan = "ARSIP-DSB.04";
      else if (lowerNomor.includes("dek.1") || lowerNomor.includes("dek")) kodePenyimpanan = "ARSIP-DEK.01";
      else if (lowerNomor.includes("dip.4") || lowerNomor.includes("dip")) kodePenyimpanan = "ARSIP-DIP.04";
      else if (lowerNomor.includes("dpp.2") || lowerNomor.includes("dpp")) kodePenyimpanan = "ARSIP-DPP.02";
      else if (lowerNomor.includes("kph.2") || lowerNomor.includes("kph")) kodePenyimpanan = "ARSIP-KPH.02";
      else if (lowerNomor.includes("dti.4") || lowerNomor.includes("dti")) kodePenyimpanan = "ARSIP-DTI.04";
      else kodePenyimpanan = "ARSIP-01";
    }

    const waktuTerima = isoDate
      ? `${isoDate} ${randomJam}`
      : randomJam;

    const { uraianMasalah } = parseHalField(rawHal);

    result.push({
      nomorUrut,
      tgl: isoDate,
      waktu: randomJam,
      data: {
        waktu_terima: waktuTerima,
        diterima_dari: rawAsal.trim() || "Kasi Intel Kejari Tabanan",
        no_tgl_surat: noTglSurat,
        perihal: uraianMasalah || rawHal.trim(),
        lampiran: "-",
        kode_penyimpanan: kodePenyimpanan,
        keterangan: rawStatus.trim() || "DISIMPAN DALAM ARSIP",
      },
    });
  }

  return result;
}

/**
 * Helper to get all leaf columns for any register (excluding the 'no' column).
 */
export function getRegisterLeafColumns(register: RegisterDefinition): Array<{
  key: string;
  label: string;
  type: string;
}> {
  const result: Array<{ key: string; label: string; type: string }> = [];
  for (const col of register.columns) {
    if (col.subColumns && col.subColumns.length > 0) {
      for (const sub of col.subColumns) {
        if (sub.key !== "no") {
          result.push({ key: sub.key, label: sub.label, type: sub.type });
        }
      }
    } else {
      if (col.key !== "no") {
        result.push({ key: col.key, label: col.label, type: col.type });
      }
    }
  }
  return result;
}

/**
 * Transform CSV to R.IN.2 (Register Surat Keluar Biasa/Rahasia).
 */
export function transformCsvToRIn2(rows: string[][]): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const { noIdx, tanggalIdx, nomorSuratIdx, asalIdx, halIdx } = getStandardCsvColumnIndexes(headers);

  const tujuanIdx = findColumnIndex(headers, [
    (h) => h === "kepada",
    (h) => h === "tujuan",
    (h) => h.includes("kepada"),
    (h) => h.includes("tujuan"),
  ]);

  const lampiranIdx = findColumnIndex(headers, [
    (h) => h === "lampiran",
    (h) => h === "lamp",
    (h) => h.includes("lampiran"),
  ]);

  const keteranganIdx = findColumnIndex(headers, [
    (h) => h === "keterangan",
    (h) => h === "ket",
    (h) => h === "status",
    (h) => h.includes("keterangan"),
  ]);

  const tglNoSuratIdx = findColumnIndex(headers, [
    (h) => h === "tgl dan no surat",
    (h) => h === "tgl_no_surat",
    (h) => h === "no dan tgl surat",
    (h) => h === "no_tgl_surat",
    (h) => h.includes("tgl") && h.includes("surat"),
  ]);

  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.length === 0 || row.every((cell) => !cell.trim())) continue;

    const rawNo = getCell(row, noIdx);
    const rawTanggal = getCell(row, tanggalIdx);
    const rawNomor = getCell(row, nomorSuratIdx);
    const rawTglNo = getCell(row, tglNoSuratIdx);
    const rawKepada = getCell(row, tujuanIdx) || getCell(row, asalIdx);
    const rawHal = getCell(row, halIdx);
    const rawLampiran = getCell(row, lampiranIdx);
    const rawKet = getCell(row, keteranganIdx);

    const nomorUrut = getNomorUrut(rawNo, result.length + 1);
    const isoDate = normalizeDateToIso(rawTanggal);

    let tglNoSurat = rawTglNo.trim();
    if (!tglNoSurat) {
      const normNomor = normalizeLetterNumber(rawNomor);
      const displayTgl = rawTanggal.trim() || isoDate;
      tglNoSurat = normNomor ? `${normNomor} tgl. ${displayTgl}` : displayTgl;
    }

    result.push({
      nomorUrut,
      tgl: isoDate,
      waktu: getRandomTimeBetween(9, 15),
      data: {
        tgl_no_surat: tglNoSurat,
        kepada: rawKepada.trim() || "Kepala Kejaksaan Tinggi Bali",
        perihal: rawHal.trim() || "-",
        lampiran: rawLampiran.trim() || "-",
        keterangan: rawKet.trim() || "Terkirim",
      },
    });
  }

  return result;
}

/**
 * Transform CSV to R.IN.4 (Register Ekspedisi Surat Biasa/Rahasia).
 */
export function transformCsvToRIn4(rows: string[][]): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const { noIdx, tanggalIdx, nomorSuratIdx, asalIdx, halIdx } = getStandardCsvColumnIndexes(headers);

  const noTglSuratIdx = findColumnIndex(headers, [
    (h) => h === "no dan tgl surat",
    (h) => h === "no_tgl_surat",
    (h) => h === "tgl dan no surat",
    (h) => h.includes("no") && h.includes("surat"),
  ]);

  const kepadaIdx = findColumnIndex(headers, [
    (h) => h === "kepada",
    (h) => h === "tujuan",
    (h) => h.includes("kepada"),
    (h) => h.includes("tujuan"),
  ]);

  const lampiranIdx = findColumnIndex(headers, [
    (h) => h === "lampiran",
    (h) => h === "lamp",
  ]);

  const waktuIdx = findColumnIndex(headers, [
    (h) => h === "waktu",
    (h) => h === "waktu_terima",
    (h) => h === "jam",
  ]);

  const namaParafIdx = findColumnIndex(headers, [
    (h) => h === "nama dan paraf",
    (h) => h === "nama_paraf",
    (h) => h.includes("paraf"),
    (h) => h.includes("penerima"),
  ]);

  const ketIdx = findColumnIndex(headers, [
    (h) => h === "keterangan",
    (h) => h === "ket",
    (h) => h === "status",
  ]);

  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.length === 0 || row.every((cell) => !cell.trim())) continue;

    const rawNo = getCell(row, noIdx);
    const rawTanggal = getCell(row, tanggalIdx);
    const rawNomor = getCell(row, nomorSuratIdx);
    const rawNoTgl = getCell(row, noTglSuratIdx);
    const rawKepada = getCell(row, kepadaIdx) || getCell(row, asalIdx);
    const rawHal = getCell(row, halIdx);
    const rawLampiran = getCell(row, lampiranIdx);
    const rawWaktu = getCell(row, waktuIdx);
    const rawNamaParaf = getCell(row, namaParafIdx);
    const rawKet = getCell(row, ketIdx);

    const nomorUrut = getNomorUrut(rawNo, result.length + 1);
    const isoDate = normalizeDateToIso(rawTanggal);
    const randomJam = getRandomTimeBetween(9, 15);

    let noTglSurat = rawNoTgl.trim();
    if (!noTglSurat) {
      const normNomor = normalizeLetterNumber(rawNomor);
      const displayTgl = rawTanggal.trim() || isoDate;
      noTglSurat = normNomor ? `${normNomor} tgl. ${displayTgl}` : displayTgl;
    }

    const waktuTerima = rawWaktu.trim() || (isoDate ? `${isoDate} ${randomJam}` : randomJam);

    result.push({
      nomorUrut,
      tgl: isoDate,
      waktu: randomJam,
      data: {
        no_tgl_surat: noTglSurat,
        kepada: rawKepada.trim() || "Kejaksaan Tinggi Bali",
        perihal: rawHal.trim() || "-",
        lampiran: rawLampiran.trim() || "-",
        waktu_terima: waktuTerima,
        nama_paraf: rawNamaParaf.trim() || "Staf Tata Usaha",
        keterangan: rawKet.trim() || "Diterima lengkap",
      },
    });
  }

  return result;
}

/**
 * Transform CSV to R.IN.5 (Register Produk Intelijen).
 */
export function transformCsvToRIn5(rows: string[][]): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const { noIdx, tanggalIdx, nomorSuratIdx, asalIdx, halIdx } = getStandardCsvColumnIndexes(headers);

  const jenisProdukIdx = findColumnIndex(headers, [
    (h) => h === "jenis produk intelijen",
    (h) => h === "jenis produk",
    (h) => h === "jenis_produk",
    (h) => h.includes("produk"),
  ]);

  const noTglProdukIdx = findColumnIndex(headers, [
    (h) => h === "nomor dan tanggal produk intelijen",
    (h) => h === "nomor dan tanggal",
    (h) => h === "nomor_tgl_produk",
  ]);

  const subditIdx = findColumnIndex(headers, [
    (h) => h === "subdit/seksi/subseksi",
    (h) => h === "subdit/seksi",
    (h) => h === "subdit_seksi",
    (h) => h === "seksi",
  ]);

  const disposisiIdx = findColumnIndex(headers, [
    (h) => h === "disposisi pimpinan",
    (h) => h === "disposisi_pimpinan",
    (h) => h.includes("disposisi"),
  ]);

  const ketIdx = findColumnIndex(headers, [
    (h) => h === "keterangan",
    (h) => h === "ket",
    (h) => h === "status",
  ]);

  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.length === 0 || row.every((cell) => !cell.trim())) continue;

    const rawNo = getCell(row, noIdx);
    const rawTanggal = getCell(row, tanggalIdx);
    const rawNomor = getCell(row, nomorSuratIdx);
    const rawJenis = getCell(row, jenisProdukIdx);
    const rawNoTgl = getCell(row, noTglProdukIdx);
    const rawSubdit = getCell(row, subditIdx) || getCell(row, asalIdx);
    const rawHal = getCell(row, halIdx);
    const rawDisposisi = getCell(row, disposisiIdx);
    const rawKet = getCell(row, ketIdx);

    const nomorUrut = getNomorUrut(rawNo, result.length + 1);
    const isoDate = normalizeDateToIso(rawTanggal);

    let noTglProduk = rawNoTgl.trim();
    if (!noTglProduk) {
      const normNomor = normalizeLetterNumber(rawNomor);
      const displayTgl = rawTanggal.trim() || isoDate;
      noTglProduk = normNomor ? `${normNomor} tgl. ${displayTgl}` : displayTgl;
    }

    const hal = rawHal.trim();
    const { uraianMasalah } = parseHalField(hal);

    let jenisProduk = rawJenis.trim();
    if (!jenisProduk) {
      const lowerHal = hal.toLowerCase();
      if (lowerHal.includes("lapinsus") || lowerHal.includes("khusus")) {
        jenisProduk = "Laporan Informasi Khusus (LIK)";
      } else if (lowerHal.includes("telaahan")) {
        jenisProduk = "Telaahan Intelijen";
      } else if (lowerHal.includes("laporan bulanan") || lowerHal.includes("atensi")) {
        jenisProduk = "Laporan Atensi Intelijen";
      } else {
        jenisProduk = "Laporan Informasi Harian (LIH)";
      }
    }

    let subditSeksi = rawSubdit.trim();
    if (!subditSeksi || subditSeksi === "Kasi Intel Kejari Tabanan") {
      const lowerNomor = rawNomor.toLowerCase();
      if (lowerNomor.includes("dsb")) {
        subditSeksi = "Seksi Intelijen (Sosbudmas)";
      } else if (lowerNomor.includes("dek")) {
        subditSeksi = "Seksi Intelijen (Ekkeu)";
      } else if (lowerNomor.includes("dip")) {
        subditSeksi = "Seksi Intelijen (Ipolhankam)";
      } else if (lowerNomor.includes("dpp")) {
        subditSeksi = "Seksi Intelijen (PPS)";
      } else if (lowerNomor.includes("dti")) {
        subditSeksi = "Seksi Intelijen (TI & Sandi)";
      } else if (lowerNomor.includes("kph")) {
        subditSeksi = "Seksi Intelijen (Penkum)";
      } else {
        subditSeksi = rawSubdit.trim() || "Seksi Intelijen";
      }
    }

    const disposisiPimpinan =
      rawDisposisi.trim() ||
      (rawKet.trim() === "Diproses"
        ? "Diproses - Monitor perkembangan"
        : "Ditindaklanjuti dan monitor perkembangan");

    result.push({
      nomorUrut,
      tgl: isoDate,
      waktu: getRandomTimeBetween(9, 15),
      data: {
        jenis_produk: jenisProduk,
        nomor_tgl_produk: noTglProduk,
        subdit_seksi: subditSeksi,
        perihal: uraianMasalah || hal,
        disposisi_pimpinan: disposisiPimpinan,
        keterangan: rawKet.trim() || "Selesai",
      },
    });
  }

  return result;
}

/**
 * Transform CSV to R.IN.17 (Register Berita Masuk Biasa/Rahasia - Kamar Sandi).
 */
export function transformCsvToRIn17(rows: string[][]): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const { noIdx, tanggalIdx, nomorSuratIdx, asalIdx, halIdx } = getStandardCsvColumnIndexes(headers);

  const noTglBeritaIdx = findColumnIndex(headers, [
    (h) => h === "no & tgl berita",
    (h) => h === "no_tgl_berita",
    (h) => h === "nomor & tgl berita",
  ]);

  const dariIdx = findColumnIndex(headers, [
    (h) => h === "dari",
    (h) => h === "pengirim",
    (h) => h.includes("dari"),
  ]);

  const kepadaIdx = findColumnIndex(headers, [
    (h) => h === "kepada",
    (h) => h === "tujuan",
    (h) => h.includes("kepada"),
  ]);

  const waktuDiterimaIdx = findColumnIndex(headers, [
    (h) => h === "tgl/jam diterima",
    (h) => h === "tgl_jam_diterima",
    (h) => h.includes("diterima"),
  ]);

  const halamanIdx = findColumnIndex(headers, [
    (h) => h === "jumlah halaman",
    (h) => h === "jumlah_halaman",
    (h) => h.includes("halaman"),
  ]);

  const petugasIdx = findColumnIndex(headers, [
    (h) => h === "nama petugas",
    (h) => h === "petugas",
    (h) => h === "nama_petugas_ids",
  ]);

  const ketIdx = findColumnIndex(headers, [
    (h) => h === "ket",
    (h) => h === "keterangan",
    (h) => h === "status",
  ]);

  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.length === 0 || row.every((cell) => !cell.trim())) continue;

    const rawNo = getCell(row, noIdx);
    const rawTanggal = getCell(row, tanggalIdx);
    const rawNomor = getCell(row, nomorSuratIdx);
    const rawNoTgl = getCell(row, noTglBeritaIdx);
    const rawDari = getCell(row, dariIdx) || getCell(row, asalIdx);
    const rawKepada = getCell(row, kepadaIdx);
    const rawHal = getCell(row, halIdx);
    const rawWaktu = getCell(row, waktuDiterimaIdx);
    const rawHalaman = getCell(row, halamanIdx);
    const rawPetugas = getCell(row, petugasIdx);
    const rawKet = getCell(row, ketIdx);

    const nomorUrut = getNomorUrut(rawNo, result.length + 1);
    const isoDate = normalizeDateToIso(rawTanggal);
    const randomJam = getRandomTimeBetween(9, 15);

    let noTglBerita = rawNoTgl.trim();
    if (!noTglBerita) {
      const normNomor = normalizeLetterNumber(rawNomor);
      const displayTgl = rawTanggal.trim() || isoDate;
      noTglBerita = normNomor ? `${normNomor} tgl. ${displayTgl}` : displayTgl;
    }

    result.push({
      nomorUrut,
      tgl: isoDate,
      waktu: randomJam,
      data: {
        tanggal: isoDate,
        no_tgl_berita: noTglBerita,
        dari: rawDari.trim() || "Kejaksaan Tinggi Bali",
        kepada: rawKepada.trim() || "Kepala Kejaksaan Negeri Tabanan",
        perihal: rawHal.trim() || "-",
        tgl_jam_diterima: rawWaktu.trim() || (isoDate ? `${isoDate} ${randomJam}` : randomJam),
        jumlah_halaman: rawHalaman.trim() || "2 Halaman",
        nama_petugas_ids: rawPetugas.trim() || "Made Ardika",
        keterangan: rawKet.trim() || "Rahasia",
      },
    });
  }

  return result;
}

/**
 * Transform CSV to R.IN.18 (Register Berita Keluar Biasa/Rahasia - Kamar Sandi).
 */
export function transformCsvToRIn18(rows: string[][]): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const { noIdx, tanggalIdx, nomorSuratIdx, asalIdx, halIdx } = getStandardCsvColumnIndexes(headers);

  const nomorTglBeritaIdx = findColumnIndex(headers, [
    (h) => h === "nomor & tgl berita",
    (h) => h === "nomor_tgl_berita",
    (h) => h === "no & tgl berita",
  ]);

  const dariIdx = findColumnIndex(headers, [
    (h) => h === "dari",
    (h) => h === "pengirim",
  ]);

  const kepadaIdx = findColumnIndex(headers, [
    (h) => h === "kepada",
    (h) => h === "tujuan",
    (h) => h.includes("kepada"),
  ]);

  const waktuDikirimIdx = findColumnIndex(headers, [
    (h) => h === "tanggal dan jam dikirim",
    (h) => h === "tgl_jam_dikirim",
    (h) => h.includes("dikirim"),
  ]);

  const halamanIdx = findColumnIndex(headers, [
    (h) => h === "jumlah halaman",
    (h) => h === "jumlah_halaman",
  ]);

  const petugasIdx = findColumnIndex(headers, [
    (h) => h === "nama petugas",
    (h) => h === "petugas",
    (h) => h === "nama_petugas_ids",
  ]);

  const ketIdx = findColumnIndex(headers, [
    (h) => h === "ket",
    (h) => h === "keterangan",
    (h) => h === "status",
  ]);

  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.length === 0 || row.every((cell) => !cell.trim())) continue;

    const rawNo = getCell(row, noIdx);
    const rawTanggal = getCell(row, tanggalIdx);
    const rawNomor = getCell(row, nomorSuratIdx);
    const rawNoTgl = getCell(row, nomorTglBeritaIdx);
    const rawDari = getCell(row, dariIdx) || getCell(row, asalIdx);
    const rawKepada = getCell(row, kepadaIdx);
    const rawHal = getCell(row, halIdx);
    const rawWaktu = getCell(row, waktuDikirimIdx);
    const rawHalaman = getCell(row, halamanIdx);
    const rawPetugas = getCell(row, petugasIdx);
    const rawKet = getCell(row, ketIdx);

    const nomorUrut = getNomorUrut(rawNo, result.length + 1);
    const isoDate = normalizeDateToIso(rawTanggal);
    const randomJam = getRandomTimeBetween(9, 15);

    let noTglBerita = rawNoTgl.trim();
    if (!noTglBerita) {
      const normNomor = normalizeLetterNumber(rawNomor);
      const displayTgl = rawTanggal.trim() || isoDate;
      noTglBerita = normNomor ? `${normNomor} tgl. ${displayTgl}` : displayTgl;
    }

    result.push({
      nomorUrut,
      tgl: isoDate,
      waktu: randomJam,
      data: {
        tanggal: isoDate,
        nomor_tgl_berita: noTglBerita,
        dari: rawDari.trim() || "Kepala Kejaksaan Negeri Tabanan",
        kepada: rawKepada.trim() || "Kejaksaan Tinggi Bali",
        perihal: rawHal.trim() || "-",
        tgl_jam_dikirim: rawWaktu.trim() || (isoDate ? `${isoDate} ${randomJam}` : randomJam),
        jumlah_halaman: rawHalaman.trim() || "3 Halaman",
        nama_petugas_ids: rawPetugas.trim() || "Made Ardika",
        keterangan: rawKet.trim() || "Terkirim",
      },
    });
  }

  return result;
}

/**
 * Transform CSV to R.IN.19 (Register Telaahan Intelijen).
 */
export function transformCsvToRIn19(rows: string[][]): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const { noIdx, tanggalIdx, nomorSuratIdx, asalIdx, halIdx } = getStandardCsvColumnIndexes(headers);

  const tglNoTelaahanIdx = findColumnIndex(headers, [
    (h) => h === "tgl dan no. telaahan intelijen",
    (h) => h === "tgl dan no. telaahan",
    (h) => h === "tgl dan no telaahan",
    (h) => h === "tgl_no_telaahan",
    (h) => h.includes("telaahan"),
  ]);

  const pembuatIdx = findColumnIndex(headers, [
    (h) => h === "pembuat",
    (h) => h === "pemrakarsa",
    (h) => h.includes("pembuat"),
  ]);

  const lampiranIdx = findColumnIndex(headers, [
    (h) => h === "lampiran",
    (h) => h.includes("lampiran"),
  ]);

  const tindakLanjutIdx = findColumnIndex(headers, [
    (h) => h === "tindak lanjut",
    (h) => h === "tindak_lanjut",
    (h) => h.includes("tindak"),
  ]);

  const ketIdx = findColumnIndex(headers, [
    (h) => h === "ket",
    (h) => h === "keterangan",
    (h) => h === "status",
  ]);

  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.length === 0 || row.every((cell) => !cell.trim())) continue;

    const rawNo = getCell(row, noIdx);
    const rawTanggal = getCell(row, tanggalIdx);
    const rawNomor = getCell(row, nomorSuratIdx);
    const rawTglNo = getCell(row, tglNoTelaahanIdx);
    const rawPembuat = getCell(row, pembuatIdx) || getCell(row, asalIdx);
    const rawHal = getCell(row, halIdx);
    const rawLampiran = getCell(row, lampiranIdx);
    const rawTindakLanjut = getCell(row, tindakLanjutIdx);
    const rawKet = getCell(row, ketIdx);

    const nomorUrut = getNomorUrut(rawNo, result.length + 1);
    const isoDate = normalizeDateToIso(rawTanggal);

    let tglNoTelaahan = rawTglNo.trim();
    if (!tglNoTelaahan) {
      const normNomor = normalizeLetterNumber(rawNomor);
      const displayTgl = rawTanggal.trim() || isoDate;
      tglNoTelaahan = normNomor ? `${displayTgl} / ${normNomor}` : displayTgl;
    }

    result.push({
      nomorUrut,
      tgl: isoDate,
      waktu: getRandomTimeBetween(9, 15),
      data: {
        tgl_no_telaahan: tglNoTelaahan,
        pembuat: rawPembuat.trim() || "Kasi Intel Kejari Tabanan",
        perihal: rawHal.trim() || "-",
        lampiran: rawLampiran.trim() || "1 Berkas",
        tindak_lanjut: rawTindakLanjut.trim() || "Diteruskan ke Pimpinan untuk arahan dan penerbitan sprintug",
        keterangan: rawKet.trim() || "Disposisi Kajari",
      },
    });
  }

  return result;
}

/**
 * Transform CSV to R.IN.20 (Register Ekspedisi Berita Biasa/Rahasia - Kamar Sandi).
 */
export function transformCsvToRIn20(rows: string[][]): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const { noIdx, tanggalIdx, nomorSuratIdx } = getStandardCsvColumnIndexes(headers);

  const noBeritaIdx = findColumnIndex(headers, [
    (h) => h === "no. berita",
    (h) => h === "no berita",
    (h) => h === "no_berita",
    (h) => h.includes("berita"),
  ]);

  const kepadaIdx = findColumnIndex(headers, [
    (h) => h === "kepada",
    (h) => h === "tujuan",
    (h) => h.includes("kepada"),
  ]);

  const namaTtdIdx = findColumnIndex(headers, [
    (h) => h === "nama & ttd penerima",
    (h) => h === "nama dan ttd penerima",
    (h) => h === "nama_ttd_penerima",
    (h) => h.includes("penerima"),
    (h) => h.includes("ttd"),
  ]);

  const ketIdx = findColumnIndex(headers, [
    (h) => h === "ket",
    (h) => h === "keterangan",
    (h) => h === "status",
  ]);

  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.length === 0 || row.every((cell) => !cell.trim())) continue;

    const rawNo = getCell(row, noIdx);
    const rawTanggal = getCell(row, tanggalIdx);
    const rawNomor = getCell(row, nomorSuratIdx);
    const rawNoBerita = getCell(row, noBeritaIdx);
    const rawKepada = getCell(row, kepadaIdx);
    const rawNamaTtd = getCell(row, namaTtdIdx);
    const rawKet = getCell(row, ketIdx);

    const nomorUrut = getNomorUrut(rawNo, result.length + 1);
    const isoDate = normalizeDateToIso(rawTanggal);
    const noBerita = (rawNoBerita || rawNomor).trim();

    result.push({
      nomorUrut,
      tgl: isoDate,
      waktu: getRandomTimeBetween(9, 15),
      data: {
        no_berita: noBerita || `B-0${nomorUrut}/CS/08/2026`,
        kepada: rawKepada.trim() || "Kajari Tabanan",
        nama_ttd_penerima: rawNamaTtd.trim() || "Diterima lengkap",
        keterangan: rawKet.trim() || "-",
      },
    });
  }

  return result;
}

/**
 * Universal generic transformer for any register.
 * Automatically inspects leaf columns of register definition and matches CSV headers.
 */
export function transformCsvGeneric(
  rows: string[][],
  register: RegisterDefinition,
): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const cleanHeaders = headers.map((h) => h.replace(/[^a-z0-9]/g, ""));
  const leafCols = getRegisterLeafColumns(register);

  const { noIdx, tanggalIdx, nomorSuratIdx, asalIdx, halIdx } = getStandardCsvColumnIndexes(headers);

  // Map each leaf column to a column index in the CSV
  const colIndexMap: Record<string, number> = {};

  leafCols.forEach((leaf) => {
    const cleanKey = leaf.key.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanLabel = leaf.label.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Exact key or label match
    let matchedIdx = headers.findIndex(
      (h, idx) =>
        h === leaf.key.toLowerCase() ||
        h === leaf.label.toLowerCase() ||
        cleanHeaders[idx] === cleanKey ||
        cleanHeaders[idx] === cleanLabel,
    );

    // Common synonyms
    if (matchedIdx === -1) {
      if (leaf.key.includes("kepada") || cleanKey.includes("tujuan")) {
        matchedIdx = findColumnIndex(headers, [
          (h) => h.includes("kepada") || h.includes("tujuan"),
        ]);
      } else if (leaf.key.includes("perihal") || cleanKey.includes("masalah") || cleanKey.includes("uraian")) {
        matchedIdx = halIdx;
      } else if (leaf.key.includes("asal") || cleanKey.includes("pembuat") || cleanKey.includes("dari")) {
        matchedIdx = asalIdx;
      } else if (leaf.key.includes("lampiran")) {
        matchedIdx = findColumnIndex(headers, [(h) => h.includes("lampiran") || h === "lamp"]);
      } else if (leaf.key.includes("ket") || leaf.key.includes("keterangan")) {
        matchedIdx = findColumnIndex(headers, [
          (h) => h === "keterangan" || h === "ket" || h === "status",
        ]);
      } else if (leaf.key.includes("petugas")) {
        matchedIdx = findColumnIndex(headers, [
          (h) => h.includes("petugas") || h.includes("pelaksana"),
        ]);
      } else if (leaf.key.includes("sektor")) {
        matchedIdx = findColumnIndex(headers, [(h) => h.includes("sektor")]);
      } else if (leaf.key.includes("hasil")) {
        matchedIdx = findColumnIndex(headers, [(h) => h.includes("hasil")]);
      } else if (leaf.key.includes("surat_perintah") || leaf.key.includes("peruntukan") || leaf.key.includes("sp_")) {
        matchedIdx = findColumnIndex(headers, [
          (h) => h.includes("surat perintah") || h.includes("perintah") || h.includes("sp"),
        ]);
      }
    }

    if (matchedIdx !== -1) {
      colIndexMap[leaf.key] = matchedIdx;
    }
  });

  const result: Array<{
    nomorUrut: number;
    tgl: string;
    waktu?: string;
    data: Record<string, any>;
  }> = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.length === 0 || row.every((cell) => !cell.trim())) continue;

    const rawNo = getCell(row, noIdx);
    const rawTanggal = getCell(row, tanggalIdx);
    const rawNomorSurat = getCell(row, nomorSuratIdx);

    const nomorUrut = getNomorUrut(rawNo, result.length + 1);
    let detectedTgl = normalizeDateToIso(rawTanggal);

    const rowData: Record<string, any> = {};

    leafCols.forEach((leaf) => {
      const idx = colIndexMap[leaf.key];
      let val = idx !== undefined && idx >= 0 ? getCell(row, idx) : "";

      // If combined field like no_tgl_... and empty, try combining nomor + tanggal
      if (
        !val &&
        (leaf.key.includes("no_tgl") || leaf.key.includes("tgl_no") || leaf.key.includes("nomor_tgl"))
      ) {
        const normNomor = normalizeLetterNumber(rawNomorSurat);
        const displayTgl = rawTanggal.trim() || detectedTgl;
        if (normNomor && displayTgl) {
          val = `${normNomor} tgl. ${displayTgl}`;
        } else if (normNomor) {
          val = normNomor;
        } else if (displayTgl) {
          val = displayTgl;
        }
      }

      // Check if date can be detected from date fields
      if (!detectedTgl && (leaf.type === "date" || leaf.type === "datetime") && val) {
        const iso = normalizeDateToIso(val);
        if (iso) detectedTgl = iso;
      }

      rowData[leaf.key] = val || "-";
    });

    // Final check for date
    if (!detectedTgl) {
      for (const cell of row) {
        const iso = normalizeDateToIso(cell);
        if (iso && iso.match(/^\d{4}-\d{2}-\d{2}$/)) {
          detectedTgl = iso;
          break;
        }
      }
    }

    result.push({
      nomorUrut,
      tgl: detectedTgl || new Date().toISOString().split("T")[0],
      waktu: getRandomTimeBetween(9, 15),
      data: rowData,
    });
  }

  return result;
}

/**
 * Universal CSV router for all registers (R.IN.1 through R.IN.23).
 */
export function transformCsvToRegister(
  rows: string[][],
  register: RegisterDefinition,
  storageCodeMappings: StorageCodeMapping[] = [],
): Array<{
  nomorUrut: number;
  tgl: string;
  waktu?: string;
  data: Record<string, any>;
}> {
  if (register.code === "R.IN.1") {
    return transformCsvToRIn1(rows);
  }
  if (register.code === "R.IN.2") {
    return transformCsvToRIn2(rows);
  }
  if (register.code === "R.IN.3") {
    return transformCsvToRIn3(rows);
  }
  if (register.code === "R.IN.4") {
    return transformCsvToRIn4(rows);
  }
  if (register.code === "R.IN.5") {
    return transformCsvToRIn5(rows);
  }
  if (register.code === "R.IN.6") {
    return transformCsvToRIn6(rows, storageCodeMappings);
  }
  if (register.code === "R.IN.17") {
    return transformCsvToRIn17(rows);
  }
  if (register.code === "R.IN.18") {
    return transformCsvToRIn18(rows);
  }
  if (register.code === "R.IN.19") {
    return transformCsvToRIn19(rows);
  }
  if (register.code === "R.IN.20") {
    return transformCsvToRIn20(rows);
  }
  return transformCsvGeneric(rows, register);
}

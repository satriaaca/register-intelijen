import { AppSettings, RegisterEntryRow } from "../types.js";

export const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const MONTH_SHORT_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Ags",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export const DAY_NAMES_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

/**
 * Returns the default closing date (last calendar day of the given month) in YYYY-MM-DD format
 */
export function getDefaultClosingDate(year: number, month1Indexed: number): string {
  // Day 0 of the next month is the last day of the current month
  const lastDay = new Date(year, month1Indexed, 0).getDate();
  const mStr = String(month1Indexed).padStart(2, "0");
  const dStr = String(lastDay).padStart(2, "0");
  return `${year}-${mStr}-${dStr}`;
}

/**
 * Formats a YYYY-MM-DD string into Indonesian date string, e.g. "31 Januari 2026"
 * or "Jumat, 31 Januari 2026" if withDayName is true.
 */
export function formatDateIndonesian(
  dateInput?: string | null,
  withDayName: boolean = false
): string {
  if (!dateInput) return "";

  // Handle ISO string or simple YYYY-MM-DD
  const rawDate = dateInput.includes("T") ? dateInput.split("T")[0] : dateInput.split(" ")[0];
  const parts = rawDate.split("-");
  if (parts.length < 3) return dateInput;

  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(monthIdx) || isNaN(day) || monthIdx < 0 || monthIdx > 11) {
    return dateInput;
  }

  const monthName = MONTH_NAMES_ID[monthIdx] || "";
  const dateObj = new Date(year, monthIdx, day);
  const dayName = withDayName ? `${DAY_NAMES_ID[dateObj.getDay()]}, ` : "";

  return `${dayName}${day} ${monthName} ${year}`;
}

/**
 * Gets the configured or default closing date for a specific year and month
 */
export function getClosingDateForPeriod(
  settings?: AppSettings | null,
  year: number = 2026,
  month1Indexed: number = 1
): string {
  const monthKey = `${year}-${String(month1Indexed).padStart(2, "0")}`;
  if (settings?.closingDates && settings.closingDates[monthKey]) {
    return settings.closingDates[monthKey];
  }
  return getDefaultClosingDate(year, month1Indexed);
}

/**
 * Extracts a date from a RegisterEntryRow (checks tgl or common date fields in data)
 */
export function extractDateFromEntry(entry: RegisterEntryRow): string | null {
  if (entry.tgl && typeof entry.tgl === "string" && entry.tgl.trim()) {
    const trimmed = entry.tgl.trim();
    // Return standard YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
  }

  const data = entry.data || {};
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
    "waktu_diterima",
    "waktu_terima",
    "waktu_lapor",
    "tgl_jam_diterima",
    "tgl_jam_dikirim",
    "waktu",
  ];

  for (const key of dateKeys) {
    if (data[key] && typeof data[key] === "string" && data[key].trim()) {
      const val = data[key].trim();
      const match = val.match(/\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
  }

  // Scan any other property in data for a YYYY-MM-DD date string
  for (const val of Object.values(data)) {
    if (typeof val === "string") {
      const match = val.match(/\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
  }

  if (entry.createdAt) {
    const raw = String(entry.createdAt);
    return raw.split("T")[0];
  }

  return null;
}

/**
 * Filters entries by Year and Month
 */
export function filterEntriesByPeriod(
  entries: RegisterEntryRow[],
  year: number,
  month1Indexed: number | "all"
): RegisterEntryRow[] {
  if (month1Indexed === "all") {
    // Check if entry belongs to year
    return entries.filter((e) => {
      const d = extractDateFromEntry(e);
      if (!d) return true; // Include if no date is specified
      return d.startsWith(`${year}-`) || !d.includes("-");
    });
  }

  const prefix = `${year}-${String(month1Indexed).padStart(2, "0")}`;
  return entries.filter((e) => {
    const d = extractDateFromEntry(e);
    if (!d) return true; // Fallback include
    return d.startsWith(prefix);
  });
}

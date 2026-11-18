import type { AppSettings } from "../types.js";
import {
  getClosingDateForPeriod,
  MONTH_NAMES_ID,
  MONTH_SHORT_ID,
} from "./date-utils.js";

export function formatLockPangkatNip(value: string): string {
  return value
    .replace(/\s*\/\s*(?=NIP\b)/gi, " ")
    .replace(/\//g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export interface BatchLockItemDescriptor {
  registerCode: string;
  periodKey: string;
  closingDate: string;
}

export function buildBatchLockItems({
  registerCodes,
  year,
  months,
  settings,
}: {
  registerCodes: string[];
  year: number;
  months: number[];
  settings?: AppSettings | null;
}): BatchLockItemDescriptor[] {
  const uniqueCodes = Array.from(
    new Set(registerCodes.map((c) => c.trim()).filter(Boolean))
  );
  const sortedMonths = Array.from(new Set(months))
    .filter((m) => m >= 1 && m <= 12)
    .sort((a, b) => a - b);

  const items: BatchLockItemDescriptor[] = [];
  for (const registerCode of uniqueCodes) {
    for (const month of sortedMonths) {
      const periodKey = `${year}-${String(month).padStart(2, "0")}`;
      const closingDate = getClosingDateForPeriod(settings, year, month);
      items.push({ registerCode, periodKey, closingDate });
    }
  }
  return items;
}

export function formatMonthSummaryId(
  months: number[],
  short: boolean = false
): string {
  const sorted = Array.from(new Set(months))
    .filter((m) => m >= 1 && m <= 12)
    .sort((a, b) => a - b);
  if (sorted.length === 0) return "";

  const names = short ? MONTH_SHORT_ID : MONTH_NAMES_ID;
  if (sorted.length === 1) {
    return names[sorted[0] - 1];
  }

  let isContiguous = true;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      isContiguous = false;
      break;
    }
  }

  if (isContiguous) {
    return `${names[sorted[0] - 1]}–${names[sorted[sorted.length - 1] - 1]}`;
  }

  return sorted.map((m) => MONTH_SHORT_ID[m - 1]).join(", ");
}

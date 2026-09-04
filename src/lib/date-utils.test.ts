import { describe, it, expect } from "vitest";
import {
  getDefaultClosingDate,
  formatDateIndonesian,
  getClosingDateForPeriod,
  extractDateFromEntry,
  filterEntriesByPeriod,
} from "./date-utils.js";
import { RegisterEntryRow, AppSettings } from "../types.js";

describe("date-utils", () => {
  describe("getDefaultClosingDate", () => {
    it("should return the correct last day for January (31 days)", () => {
      expect(getDefaultClosingDate(2026, 1)).toBe("2026-01-31");
    });

    it("should return the correct last day for April (30 days)", () => {
      expect(getDefaultClosingDate(2026, 4)).toBe("2026-04-30");
    });

    it("should handle February in non-leap year (28 days)", () => {
      expect(getDefaultClosingDate(2025, 2)).toBe("2025-02-28");
    });

    it("should handle February in leap year (29 days)", () => {
      expect(getDefaultClosingDate(2024, 2)).toBe("2024-02-29");
    });
  });

  describe("formatDateIndonesian", () => {
    it("should format YYYY-MM-DD into Indonesian date string", () => {
      expect(formatDateIndonesian("2026-08-17")).toBe("17 Agustus 2026");
      expect(formatDateIndonesian("2026-01-01")).toBe("1 Januari 2026");
    });

    it("should optionally include the Indonesian day name", () => {
      // 2026-08-17 is a Monday (Senin)
      expect(formatDateIndonesian("2026-08-17", true)).toBe("Senin, 17 Agustus 2026");
    });

    it("should handle empty or null inputs gracefully", () => {
      expect(formatDateIndonesian(null)).toBe("");
      expect(formatDateIndonesian("")).toBe("");
    });
  });

  describe("getClosingDateForPeriod", () => {
    it("should return custom closing date if configured in settings", () => {
      const mockSettings: Partial<AppSettings> = {
        closingDates: {
          "2026-03": "2026-03-25",
        },
      };

      const result = getClosingDateForPeriod(mockSettings as AppSettings, 2026, 3);
      expect(result).toBe("2026-03-25");
    });

    it("should fallback to default closing date if not configured in settings", () => {
      const result = getClosingDateForPeriod(null, 2026, 3);
      expect(result).toBe("2026-03-31");
    });
  });

  describe("extractDateFromEntry", () => {
    it("should extract date from tgl property if available", () => {
      const entry: Partial<RegisterEntryRow> = {
        id: 1,
        tgl: "2026-05-10",
        data: {},
      };
      expect(extractDateFromEntry(entry as RegisterEntryRow)).toBe("2026-05-10");
    });

    it("should extract date from nested data object if tgl is not present", () => {
      const entry: Partial<RegisterEntryRow> = {
        id: 2,
        data: {
          tgl_surat: "2026-06-15",
        },
      };
      expect(extractDateFromEntry(entry as RegisterEntryRow)).toBe("2026-06-15");
    });

    it("should return null if no date is found", () => {
      const entry: Partial<RegisterEntryRow> = {
        id: 3,
        data: {
          perihal: "Surat Biasa",
        },
      };
      expect(extractDateFromEntry(entry as RegisterEntryRow)).toBeNull();
    });
  });

  describe("filterEntriesByPeriod", () => {
    const mockEntries: Partial<RegisterEntryRow>[] = [
      { id: 1, tgl: "2026-01-15", data: {} },
      { id: 2, tgl: "2026-01-28", data: {} },
      { id: 3, tgl: "2026-02-10", data: {} },
      { id: 4, tgl: "2025-12-31", data: {} },
    ];

    it("should filter entries for a specific year and month", () => {
      const filtered = filterEntriesByPeriod(
        mockEntries as RegisterEntryRow[],
        2026,
        1
      );
      expect(filtered.map((e) => e.id)).toEqual([1, 2]);
    });

    it("should include all months of a year when month is 'all'", () => {
      const filtered = filterEntriesByPeriod(
        mockEntries as RegisterEntryRow[],
        2026,
        "all"
      );
      expect(filtered.map((e) => e.id)).toEqual([1, 2, 3]);
    });
  });
});

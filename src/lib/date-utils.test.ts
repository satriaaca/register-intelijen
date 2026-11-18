import { describe, it, expect } from "vitest";
import {
  getDefaultClosingDate,
  formatDateIndonesian,
  getClosingDateForPeriod,
  extractDateFromEntry,
  filterEntriesByPeriod,
  getMonthsBeforeCurrentMonth,
  isMonthBeforeCurrentMonth,
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
    it("should extract date from Indonesian DD-MM-YYYY format inside data fields", () => {
      const entry: Partial<RegisterEntryRow> = {
        id: 5,
        data: {
          tgl_no_surat: "R-2029/N.1.17.2/Dsb.4/10/2026 tgl. 22-10-2026",
        },
      };
      expect(extractDateFromEntry(entry as RegisterEntryRow)).toBe("2026-10-04");
    });

    it("should prioritize explicit YYYY-MM-DD in data_tgl_surat over letter number", () => {
      const entry: Partial<RegisterEntryRow> = {
        id: 6,
        tgl: "2026-10-22",
        data: {
          tgl_no_surat: "R-2029/N.1.17.2/Dsb.4/10/2026 tgl. 22-10-2026",
        },
      };
      expect(extractDateFromEntry(entry as RegisterEntryRow)).toBe("2026-10-22");
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

    it("should return empty array when filtering a year with no entries", () => {
      const filtered = filterEntriesByPeriod(
        mockEntries as RegisterEntryRow[],
        2024,
        "all"
      );
      expect(filtered).toEqual([]);
    });
  });

  describe("getMonthsBeforeCurrentMonth & isMonthBeforeCurrentMonth", () => {
    const nov2026 = new Date(2026, 10, 17); // November 17, 2026
    const jan2026 = new Date(2026, 0, 5); // January 5, 2026

    it("returns months 1..10 when selectedYear is current year (Nov 2026)", () => {
      expect(getMonthsBeforeCurrentMonth(2026, nov2026)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      ]);
      expect(isMonthBeforeCurrentMonth(2026, 10, nov2026)).toBe(true);
      expect(isMonthBeforeCurrentMonth(2026, 11, nov2026)).toBe(false);
      expect(isMonthBeforeCurrentMonth(2026, 12, nov2026)).toBe(false);
    });

    it("returns all 12 months when selectedYear is before reference year", () => {
      expect(getMonthsBeforeCurrentMonth(2025, nov2026)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
      ]);
      expect(isMonthBeforeCurrentMonth(2025, 12, nov2026)).toBe(true);
    });

    it("returns empty array when selectedYear is after reference year or in January of current year", () => {
      expect(getMonthsBeforeCurrentMonth(2027, nov2026)).toEqual([]);
      expect(getMonthsBeforeCurrentMonth(2026, jan2026)).toEqual([]);
      expect(isMonthBeforeCurrentMonth(2027, 1, nov2026)).toBe(false);
      expect(isMonthBeforeCurrentMonth(2026, 1, jan2026)).toBe(false);
    });
  });
});

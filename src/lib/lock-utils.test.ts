import { describe, it, expect } from "vitest";
import {
  buildBatchLockItems,
  formatLockPangkatNip,
  formatMonthSummaryId,
} from "./lock-utils.js";
import type { AppSettings } from "../types.js";

describe("lock-utils", () => {
  describe("formatLockPangkatNip", () => {
    it("removes slashes and converts text to uppercase", () => {
      expect(
        formatLockPangkatNip("Jaksa Utama Pratama / NIP. 19740512 199903 1 002")
      ).toBe("JAKSA UTAMA PRATAMA NIP. 19740512 199903 1 002");
      expect(formatLockPangkatNip("jaksa muda/nip. 123/456")).toBe(
        "JAKSA MUDA NIP. 123456"
      );
    });
  });

  describe("buildBatchLockItems", () => {
    it("builds chronological period items with custom and default closing dates", () => {
      const mockSettings = {
        closingDates: {
          "2026-02": "2026-02-27",
        },
      } as Partial<AppSettings> as AppSettings;

      const items = buildBatchLockItems({
        registerCodes: ["R.IN.1", "R.IN.2", "R.IN.1"],
        year: 2026,
        months: [3, 1, 2],
        settings: mockSettings,
      });

      expect(items).toEqual([
        { registerCode: "R.IN.1", periodKey: "2026-01", closingDate: "2026-01-31" },
        { registerCode: "R.IN.1", periodKey: "2026-02", closingDate: "2026-02-27" },
        { registerCode: "R.IN.1", periodKey: "2026-03", closingDate: "2026-03-31" },
        { registerCode: "R.IN.2", periodKey: "2026-01", closingDate: "2026-01-31" },
        { registerCode: "R.IN.2", periodKey: "2026-02", closingDate: "2026-02-27" },
        { registerCode: "R.IN.2", periodKey: "2026-03", closingDate: "2026-03-31" },
      ]);
    });
  });

  describe("formatMonthSummaryId", () => {
    it("formats contiguous ranges, single months, and non-contiguous selections", () => {
      expect(formatMonthSummaryId([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(
        "Januari–Oktober"
      );
      expect(formatMonthSummaryId([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], true)).toBe(
        "Jan–Okt"
      );
      expect(formatMonthSummaryId([1])).toBe("Januari");
      expect(formatMonthSummaryId([1, 3, 5])).toBe("Jan, Mar, Mei");
      expect(formatMonthSummaryId([])).toBe("");
    });
  });
});

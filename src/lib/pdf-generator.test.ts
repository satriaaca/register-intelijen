import { describe, it, expect } from "vitest";
import { generateMultiMonthRegisterPdf } from "./pdf-generator.js";
import { REGISTER_DEFINITIONS, DEFAULT_SETTINGS } from "./constants.js";
import { filterEntriesByPeriod } from "./date-utils.js";
import type { AppSettings, RegisterEntryRow } from "../types.js";

describe("generateMultiMonthRegisterPdf", () => {
  it("merges selected months into 1 PDF sorted chronologically from January onwards", () => {
    const register = REGISTER_DEFINITIONS[0]; // R.IN.1
    const settings: AppSettings = {
      ...(DEFAULT_SETTINGS as AppSettings),
      signatureAlignment: "split",
      availableYears: [2026],
    };

    const entries: RegisterEntryRow[] = [
      {
        id: 1,
        registerCode: "R.IN.1",
        nomorUrut: 1,
        tgl: "2026-03-10",
        data: { tgl_terima: "2026-03-10", perihal: "Surat Bulan Maret" },
      },
      {
        id: 2,
        registerCode: "R.IN.1",
        nomorUrut: 1,
        tgl: "2026-01-05",
        data: { tgl_terima: "2026-01-05", perihal: "Surat Bulan Januari" },
      },
    ];

    // Pass unsorted months [3, 1, 2] to ensure sorting from January -> February -> March
    const doc = generateMultiMonthRegisterPdf({
      register,
      entries,
      settings,
      officers: [],
      tahunTakwim: 2026,
      selectedMonths: [3, 1, 2],
      filterEntriesFn: (all, yr, m) => filterEntriesByPeriod(all, yr, m),
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    expect(pageCount).toBeGreaterThanOrEqual(3);

    // Check internal page stream text order: page 1 -> JANUARI, page 2 -> FEBRUARI, page 3 -> MARET
    const pages = (doc as any).internal.pages as string[][];
    const page1Content = (pages[1] || []).join("\n");
    const page2Content = (pages[2] || []).join("\n");
    const page3Content = (pages[3] || []).join("\n");

    expect(page1Content).toContain("PERIODE: BULAN JANUARI - TAHUN 2026");
    expect(page2Content).toContain("PERIODE: BULAN FEBRUARI - TAHUN 2026");
    expect(page3Content).toContain("PERIODE: BULAN MARET - TAHUN 2026");
  });
});

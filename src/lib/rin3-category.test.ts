import { describe, it, expect } from "vitest";
import {
  normalizeRin3Category,
  detectRin3Category,
  detectCategoryFromLetterCode,
  RIN3_CODE_MAP,
  RIN3_CATEGORY_CODE_MAP,
} from "./rin3-category.js";

describe("rin3-category", () => {
  describe("letter code mappings (user requirements)", () => {
    it("should correctly map all 5 official Kejaksaan letter codes", () => {
      expect(RIN3_CODE_MAP.Dip).toBe("IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN");
      expect(RIN3_CODE_MAP.Dsb).toBe("SOSIAL BUDAYA DAN KEMASYARAKATAN");
      expect(RIN3_CODE_MAP.Dek).toBe("EKONOMI DAN KEUANGAN");
      expect(RIN3_CODE_MAP.Dpp).toBe("PENGAMANAN PEMBANGUNAN STRATEGIS");
      expect(RIN3_CODE_MAP.Dti).toBe("TEKNOLOGI INFORMASI DAN PRODUKSI INTELIJEN");

      expect(RIN3_CATEGORY_CODE_MAP["IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN"]).toBe("Dip");
      expect(RIN3_CATEGORY_CODE_MAP["SOSIAL BUDAYA DAN KEMASYARAKATAN"]).toBe("Dsb");
      expect(RIN3_CATEGORY_CODE_MAP["EKONOMI DAN KEUANGAN"]).toBe("Dek");
      expect(RIN3_CATEGORY_CODE_MAP["PENGAMANAN PEMBANGUNAN STRATEGIS"]).toBe("Dpp");
      expect(RIN3_CATEGORY_CODE_MAP["TEKNOLOGI INFORMASI DAN PRODUKSI INTELIJEN"]).toBe("Dti");
    });

    it("should detect categories from standalone codes", () => {
      expect(detectCategoryFromLetterCode("Dip")).toBe("IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN");
      expect(detectCategoryFromLetterCode("Dsb")).toBe("SOSIAL BUDAYA DAN KEMASYARAKATAN");
      expect(detectCategoryFromLetterCode("Dek")).toBe("EKONOMI DAN KEUANGAN");
      expect(detectCategoryFromLetterCode("Dpp")).toBe("PENGAMANAN PEMBANGUNAN STRATEGIS");
      expect(detectCategoryFromLetterCode("Dti")).toBe("TEKNOLOGI INFORMASI DAN PRODUKSI INTELIJEN");
    });

    it("should detect categories from real Kejaksaan letter numbers", () => {
      // Dsb (Sosial Budaya)
      expect(detectCategoryFromLetterCode("R-1113/N.1.17.2/Dsb.4/07/2026")).toBe(
        "SOSIAL BUDAYA DAN KEMASYARAKATAN"
      );
      expect(detectCategoryFromLetterCode("R-1105/N.1.17.2/Dsb.4/07/2026")).toBe(
        "SOSIAL BUDAYA DAN KEMASYARAKATAN"
      );

      // Dek (Ekonomi dan Keuangan)
      expect(detectCategoryFromLetterCode("R-1112/N.1.17.2/Dek.3/07/2026")).toBe(
        "EKONOMI DAN KEUANGAN"
      );
      expect(detectCategoryFromLetterCode("R-1111/N.1.17.2/Dek.2/07/2026")).toBe(
        "EKONOMI DAN KEUANGAN"
      );

      // Dip (Ideopolhankam)
      expect(detectCategoryFromLetterCode("R-1102/N.1.17.2/Dip.2/07/2026")).toBe(
        "IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN"
      );
      expect(detectCategoryFromLetterCode("R-1094/N.1.17.2/Dip.4/07/2026")).toBe(
        "IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN"
      );

      // Dpp (Pengamanan Pembangunan Strategis)
      expect(detectCategoryFromLetterCode("PRINT-05/N.1.17/Dpp.1/04/2026")).toBe(
        "PENGAMANAN PEMBANGUNAN STRATEGIS"
      );

      // Dti (Teknologi Informasi & Sandi)
      expect(detectCategoryFromLetterCode("SP.OPS-01/N.1.17/Dti.2/08/2026")).toBe(
        "TEKNOLOGI INFORMASI DAN PRODUKSI INTELIJEN"
      );
    });

    it("should not falsely match words containing 'dip' like 'Diproses'", () => {
      expect(detectCategoryFromLetterCode("Diproses")).toBeNull();
      expect(detectCategoryFromLetterCode("Sedang diproses oleh staf")).toBeNull();
      expect(detectCategoryFromLetterCode("diperiksa oleh tim")).toBeNull();
    });
  });

  describe("normalizeRin3Category", () => {
    it("should recognize codes directly in normalizeRin3Category", () => {
      expect(normalizeRin3Category("Dip")).toBe("IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN");
      expect(normalizeRin3Category("Dsb")).toBe("SOSIAL BUDAYA DAN KEMASYARAKATAN");
      expect(normalizeRin3Category("Dek")).toBe("EKONOMI DAN KEUANGAN");
      expect(normalizeRin3Category("Dpp")).toBe("PENGAMANAN PEMBANGUNAN STRATEGIS");
      expect(normalizeRin3Category("Dti")).toBe("TEKNOLOGI INFORMASI DAN PRODUKSI INTELIJEN");
    });

    it("should recognize IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN", () => {
      expect(normalizeRin3Category("Ideologi dan Politik")).toBe(
        "IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN"
      );
      expect(normalizeRin3Category("HANKAM")).toBe(
        "IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN"
      );
    });

    it("should recognize SOSIAL BUDAYA DAN KEMASYARAKATAN", () => {
      expect(normalizeRin3Category("Sosbud dan Aliran Agama")).toBe(
        "SOSIAL BUDAYA DAN KEMASYARAKATAN"
      );
    });

    it("should recognize EKONOMI DAN KEUANGAN", () => {
      expect(normalizeRin3Category("Sektor Perbankan & Moneter")).toBe(
        "EKONOMI DAN KEUANGAN"
      );
    });

    it("should recognize PENGAMANAN PEMBANGUNAN STRATEGIS", () => {
      expect(normalizeRin3Category("Proyek PPS Infrastruktur")).toBe(
        "PENGAMANAN PEMBANGUNAN STRATEGIS"
      );
    });

    it("should recognize TEKNOLOGI INFORMASI DAN PRODUKSI INTELIJEN", () => {
      expect(normalizeRin3Category("Siber dan Sandi Intelijen")).toBe(
        "TEKNOLOGI INFORMASI DAN PRODUKSI INTELIJEN"
      );
    });

    it("should return null for unrecognized input", () => {
      expect(normalizeRin3Category("random input string")).toBeNull();
      expect(normalizeRin3Category(null)).toBeNull();
      expect(normalizeRin3Category("")).toBeNull();
    });
  });

  describe("detectRin3Category", () => {
    it("should prioritize letter code in tindak_lanjut over generic text keywords", () => {
      // Row with Dsb.4 code mentioning infrastructure/bendungan should be SOSIAL BUDAYA
      const dataDsb = {
        tindak_lanjut: "Lapinhar Nomor: R-1113/N.1.17.2/Dsb.4/07/2026",
        uraian_peristiwa: "Pembangunan bendungan PPS jalan raya di desa adat",
      };
      expect(detectRin3Category(dataDsb)).toBe("SOSIAL BUDAYA DAN KEMASYARAKATAN");

      // Row with Dek.3 code should be EKONOMI DAN KEUANGAN
      const dataDek = {
        tindak_lanjut: "Lapinhar Nomor: R-1112/N.1.17.2/Dek.3/07/2026",
        uraian_peristiwa: "Penanganan aksi unjuk rasa ormas di lapangan",
      };
      expect(detectRin3Category(dataDek)).toBe("EKONOMI DAN KEUANGAN");

      // Row with Dip.2 code should be IDEOPOLHANKAM
      const dataDip = {
        tindak_lanjut: "Lapinhar Nomor: R-1102/N.1.17.2/Dip.2/07/2026",
        uraian_peristiwa: "Seleksi Terbuka Pengisian Tiga Jabatan Pimpinan Tinggi",
      };
      expect(detectRin3Category(dataDip)).toBe("IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN");

      // Row with Dpp.1 code should be PPS
      const dataDpp = {
        tindak_lanjut: "Lapinhar Nomor: PRINT-05/N.1.17/Dpp.1/04/2026",
        uraian_peristiwa: "Pengamanan proyek strategis",
      };
      expect(detectRin3Category(dataDpp)).toBe("PENGAMANAN PEMBANGUNAN STRATEGIS");

      // Row with Dti.2 code should be TI
      const dataDti = {
        tindak_lanjut: "Lapinhar Nomor: R-01/N.1.17/Dti.2/08/2026",
        uraian_peristiwa: "Pengamanan data server",
      };
      expect(detectRin3Category(dataDti)).toBe("TEKNOLOGI INFORMASI DAN PRODUKSI INTELIJEN");
    });

    it("should prioritize explicit bidang or kategori field if no conflicting letter code exists", () => {
      const data = {
        kategori: "Ekonomi",
        uraian_peristiwa: "Pembangunan bendungan PPS jalan raya",
      };
      expect(detectRin3Category(data)).toBe("EKONOMI DAN KEUANGAN");
    });

    it("should detect PPS from uraian keywords if no letter code or category is given", () => {
      const data = {
        uraian_peristiwa: "Rapat koordinasi pengamanan pembangunan strategis bendungan",
      };
      expect(detectRin3Category(data)).toBe("PENGAMANAN PEMBANGUNAN STRATEGIS");
    });

    it("should fallback to default Ideopolhankam if no keywords or letter codes match", () => {
      const data = {
        uraian_peristiwa: "Catatan informasi umum harian",
      };
      expect(detectRin3Category(data)).toBe(
        "IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN"
      );
    });
  });
});

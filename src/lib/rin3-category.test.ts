import { describe, it, expect } from "vitest";
import {
  normalizeRin3Category,
  detectRin3Category,
} from "./rin3-category.js";

describe("rin3-category", () => {
  describe("normalizeRin3Category", () => {
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
    it("should prioritize explicit bidang or kategori field", () => {
      const data = {
        kategori: "Ekonomi",
        uraian_peristiwa: "Pembangunan bendungan PPS jalan raya",
      };
      expect(detectRin3Category(data)).toBe("EKONOMI DAN KEUANGAN");
    });

    it("should detect PPS from uraian keywords if no category is given", () => {
      const data = {
        uraian_peristiwa: "Rapat koordinasi pengamanan pembangunan strategis bendungan",
      };
      expect(detectRin3Category(data)).toBe("PENGAMANAN PEMBANGUNAN STRATEGIS");
    });

    it("should fallback to default Ideopolhankam if no keywords match", () => {
      const data = {
        uraian_peristiwa: "Catatan informasi umum harian",
      };
      expect(detectRin3Category(data)).toBe(
        "IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN"
      );
    });
  });
});

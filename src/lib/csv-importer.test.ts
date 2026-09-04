import { describe, it, expect } from "vitest";
import { parseCsv } from "./csv-importer.js";

describe("csv-importer", () => {
  describe("parseCsv", () => {
    it("should parse simple comma-separated rows", () => {
      const csv = "col1,col2,col3\nval1,val2,val3\nval4,val5,val6";
      const result = parseCsv(csv);
      expect(result).toEqual([
        ["col1", "col2", "col3"],
        ["val1", "val2", "val3"],
        ["val4", "val5", "val6"],
      ]);
    });

    it("should parse quoted values containing commas", () => {
      const csv = 'nomor,hal\n1,"Perihal laporan, koordinasi dan evaluasi"';
      const result = parseCsv(csv);
      expect(result).toEqual([
        ["nomor", "hal"],
        ["1", "Perihal laporan, koordinasi dan evaluasi"],
      ]);
    });

    it("should parse escaped quotes correctly", () => {
      const csv = 'nomor,hal\n1,"Dokumen bertanda ""RAHASIA"" intelijen"';
      const result = parseCsv(csv);
      expect(result).toEqual([
        ["nomor", "hal"],
        ["1", 'Dokumen bertanda "RAHASIA" intelijen'],
      ]);
    });

    it("should handle multiline quoted fields", () => {
      const csv = 'id,catatan\n1,"Baris pertama\nBaris kedua"';
      const result = parseCsv(csv);
      expect(result).toEqual([
        ["id", "catatan"],
        ["1", "Baris pertama\nBaris kedua"],
      ]);
    });

    it("should ignore trailing empty lines", () => {
      const csv = "a,b\n1,2\n\n";
      const result = parseCsv(csv);
      expect(result).toEqual([
        ["a", "b"],
        ["1", "2"],
      ]);
    });
  });
});

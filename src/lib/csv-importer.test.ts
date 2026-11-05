import { describe, it, expect } from "vitest";
import { parseCsv, transformCsvToRIn5 } from "./csv-importer.js";

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

  describe("transformCsvToRIn5 with defaultDisposisiPimpinan", () => {
    it("should apply defaultDisposisiPimpinan 'Arsip' when disposisi is empty in CSV", () => {
      const rows = [
        ["No", "Tanggal", "Nomor Surat", "Asal", "Hal", "Disposisi Pimpinan", "Status"],
        ["1", "2026-08-10", "R-10/N.1.17/Dsb.4/08/2026", "Seksi Intelijen", "Laporan Pemantauan", "", "Selesai"],
        ["2", "2026-08-11", "R-11/N.1.17/Dsb.4/08/2026", "Seksi Intelijen", "Laporan Penyelidikan", "-", "Selesai"],
      ];

      const result = transformCsvToRIn5(rows, { defaultDisposisiPimpinan: "Arsip" });
      expect(result).toHaveLength(2);
      expect(result[0].data.disposisi_pimpinan).toBe("Arsip");
      expect(result[1].data.disposisi_pimpinan).toBe("Arsip");
    });

    it("should retain CSV value when disposisi is filled in CSV", () => {
      const rows = [
        ["No", "Tanggal", "Nomor Surat", "Asal", "Hal", "Disposisi Pimpinan", "Status"],
        ["1", "2026-08-10", "R-10/N.1.17/Dsb.4/08/2026", "Seksi Intelijen", "Laporan Pemantauan", "Tindak lanjuti segera ke lapangan", "Selesai"],
      ];

      const result = transformCsvToRIn5(rows, { defaultDisposisiPimpinan: "Arsip" });
      expect(result).toHaveLength(1);
      expect(result[0].data.disposisi_pimpinan).toBe("Tindak lanjuti segera ke lapangan");
    });

    it("should apply defaultDisposisiPimpinan 'Arsip' when CSV has no disposisi column", () => {
      const rows = [
        ["No", "Tanggal", "Nomor", "Asal", "Hal", "Status"],
        ["1", "2026-08-10", "R-10/N.1.17/Dsb.4/08/2026", "Seksi Intelijen", "Laporan Pemantauan", "Selesai"],
      ];

      const result = transformCsvToRIn5(rows, { defaultDisposisiPimpinan: "Arsip" });
      expect(result).toHaveLength(1);
      expect(result[0].data.disposisi_pimpinan).toBe("Arsip");
    });

    it("should clean up 'Diproses' in Keterangan and replace with default 'Selesai' or custom defaultKeterangan", () => {
      const rows = [
        ["No", "Tanggal", "Nomor", "Asal", "Hal", "Status"],
        ["1", "2026-08-10", "R-10/N.1.17/Dsb.4/08/2026", "Seksi Intelijen", "Laporan Pemantauan", "Diproses"],
      ];

      // Default without custom override should be "Selesai" (not "Diproses")
      const result1 = transformCsvToRIn5(rows, { defaultDisposisiPimpinan: "Arsip" });
      expect(result1[0].data.keterangan).toBe("Selesai");

      // Custom override (e.g. "Arsip")
      const result2 = transformCsvToRIn5(rows, { defaultDisposisiPimpinan: "Arsip", defaultKeterangan: "Arsip" });
      expect(result2[0].data.keterangan).toBe("Arsip");
    });
  });
});

import React, { useState, useEffect } from "react";
import { RegisterDefinition, StorageCodeMapping } from "../types.js";
import { authFetch } from "../lib/api.js";
import {
  parseCsv,
  transformCsvToRIn1,
  transformCsvToRIn3,
  transformCsvToRIn6,
  transformCsvToRegister,
  getRegisterLeafColumns,
} from "../lib/csv-importer.js";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ArrowRight,
  Table,
  FolderArchive,
  HelpCircle,
  Edit2,
  Trash2,
} from "lucide-react";
import { StorageCodesModal } from "./StorageCodesModal.js";

import {
  SAMPLE_RIN1_CSV,
  SAMPLE_RIN3_CSV,
  SAMPLE_RIN6_CSV,
  SAMPLE_FULL_KEJARI_TABANAN_CSV,
  getSampleCsvForRegister,
} from "../lib/sample-data.js";

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  register: RegisterDefinition;
  onSuccess: () => void;
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  register,
  onSuccess,
}) => {
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<
    Array<{
      nomorUrut: number;
      tgl: string;
      waktu?: string;
      data: Record<string, any>;
    }>
  >([]);
  const [storageCodes, setStorageCodes] = useState<StorageCodeMapping[]>([]);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [clearExisting, setClearExisting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [previewTab, setPreviewTab] = useState<"input" | "preview">("input");

  // State untuk nilai default Disposisi Pimpinan jika tidak diisi pada file CSV
  const [defaultDisposisiPimpinan, setDefaultDisposisiPimpinan] = useState<string>(() => {
    try {
      return localStorage.getItem("import_default_disposisi_pimpinan") || "Arsip";
    } catch {
      return "Arsip";
    }
  });

  // Fetch Storage Code Mappings
  const fetchStorageCodes = async () => {
    try {
      const res = await authFetch("/api/storage-codes");
      if (res.ok) {
        const data = await res.json();
        setStorageCodes(data);
      }
    } catch (e) {
      console.warn("Could not fetch storage codes:", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStorageCodes();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSetDefaultDisposisi = (newValue: string) => {
    setDefaultDisposisiPimpinan(newValue);
    try {
      localStorage.setItem("import_default_disposisi_pimpinan", newValue);
    } catch {}

    // Jika sudah ada CSV yang diinputkan, parse ulang dengan nilai default baru
    if (csvText.trim()) {
      handleParseCsv(csvText, storageCodes, newValue);
    }
  };

  const handleParseCsv = (
    rawText: string,
    currentStorageCodes = storageCodes,
    currentDefaultDisposisi = defaultDisposisiPimpinan,
  ) => {
    try {
      setErrorMessage("");
      const rawGrid = parseCsv(rawText);
      if (rawGrid.length < 2) {
        setErrorMessage("CSV harus memiliki minimal 1 baris header dan 1 baris data.");
        setParsedRows([]);
        return;
      }

      const transformed = transformCsvToRegister(rawGrid, register, currentStorageCodes, {
        defaultDisposisiPimpinan: currentDefaultDisposisi,
      });

      setParsedRows(transformed);
      if (transformed.length > 0) {
        setPreviewTab("preview");
      }
    } catch (err: any) {
      setErrorMessage("Gagal membaca format CSV: " + err.message);
      setParsedRows([]);
    }
  };

  // Terapkan nilai default disposisi pimpinan ke baris yang sedang aktif di pratinjau
  const applyDefaultDisposisiToPreview = (overrideAll: boolean = false) => {
    const defaultVal = defaultDisposisiPimpinan.trim();
    if (!defaultVal || parsedRows.length === 0) return;

    setParsedRows((prev) =>
      prev.map((row) => {
        const currentData = { ...row.data };
        const targetKeys = [
          "disposisi_pimpinan",
          "disposisiPimpinan",
          "disposisi_tindakan",
          "disposisi",
        ];

        let modified = false;
        targetKeys.forEach((k) => {
          if (k in currentData) {
            const val = currentData[k];
            if (
              overrideAll ||
              !val ||
              val === "-" ||
              val === "Dilaporkan Kepada Pimpinan" ||
              (typeof val === "string" && val.toLowerCase().includes("monitor perkembangan"))
            ) {
              currentData[k] = defaultVal;
              modified = true;
            }
          }
        });

        // Khusus untuk R.IN.5 yang memiliki field disposisi_pimpinan
        if (register.code === "R.IN.5" && (!currentData.disposisi_pimpinan || overrideAll)) {
          currentData.disposisi_pimpinan = defaultVal;
          modified = true;
        }

        return modified ? { ...row, data: currentData } : row;
      }),
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      handleParseCsv(content);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = (sample: string) => {
    setCsvText(sample);
    handleParseCsv(sample);
  };

  const handleUpdateRowField = (index: number, key: string, value: any) => {
    setParsedRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        data: {
          ...copy[index].data,
          [key]: value,
        },
      };
      return copy;
    });
  };

  const handleDeletePreviewRow = (index: number) => {
    setParsedRows((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((item, idx) => ({ ...item, nomorUrut: idx + 1 }));
    });
  };

  const handleSubmitImport = async () => {
    if (parsedRows.length === 0) {
      setErrorMessage("Tidak ada data yang siap diimpor.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await authFetch(`/api/registers/${register.code}/import-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: parsedRows,
          clearExisting,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal mengimpor data ke server");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat mengimpor data.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Modal Header */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Upload className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold tracking-wide">
                  Impor Data CSV ke {register.code} ({register.title})
                </h3>
                <p className="text-[11px] text-slate-300">
                  Pemetaan otomatis kolom sesuai format petunjuk Intelijen Kejaksaan RI
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Rule explanation banners based on register */}
          {register.code === "R.IN.1" && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs text-emerald-950 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 w-full">
                <span className="font-bold text-emerald-900">
                  Aturan Pemetaan Kolom R.IN.1 (Register Surat Masuk) Aktif:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-emerald-900 mt-1">
                  <div>• <strong>TGL (Penerimaan):</strong> Tanggal dari CSV (ISO)</div>
                  <div>• <strong>JAM (Penerimaan):</strong> Acak (09:00 - 15:00)</div>
                  <div>• <strong>NOMOR:</strong> Nomor Surat dari CSV</div>
                  <div>• <strong>TGL (Surat):</strong> Tanggal dari CSV</div>
                  <div>• <strong>ASAL SURAT:</strong> Asal dari CSV</div>
                  <div>• <strong>PERIHAL:</strong> Hal dari CSV</div>
                  <div>• <strong>TGL/ISI:</strong> Tanggal Surat</div>
                  <div>• <strong>TINDAK LANJUT:</strong> DITINDAKLANJUTI</div>
                  <div>• <strong>KET:</strong> -</div>
                </div>
              </div>
            </div>
          )}

          {register.code === "R.IN.2" && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs text-emerald-950 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 w-full">
                <span className="font-bold text-emerald-900">
                  Aturan Pemetaan Kolom R.IN.2 (Register Surat Keluar) Aktif:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-emerald-900 mt-1">
                  <div>• <strong>Tgl dan No Surat:</strong> Nomor & Tanggal Surat</div>
                  <div>• <strong>Kepada:</strong> Tujuan / Penerima</div>
                  <div>• <strong>Perihal:</strong> Hal / Perihal Surat</div>
                  <div>• <strong>Lampiran:</strong> Lampiran</div>
                  <div>• <strong>Keterangan:</strong> Status Pengiriman</div>
                </div>
              </div>
            </div>
          )}

          {register.code === "R.IN.3" && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs text-emerald-950 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 w-full">
                <span className="font-bold text-emerald-900">
                  Aturan Pemetaan Kolom R.IN.3 (Informasi Intelijen) Aktif:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-emerald-900 mt-1">
                  <div>• <strong>Waktu Diterima:</strong> Tanggal surat (ISO)</div>
                  <div>• <strong>Sumber / Bapul:</strong> Organik Intelijen Kejari Tabanan</div>
                  <div>• <strong>Nilai Informasi:</strong> A1</div>
                  <div>• <strong>Catatan & Ket:</strong> -</div>
                  <div>• <strong>Uraian Masalah:</strong> Hal (teks setelah tanda <code className="bg-white/80 px-1 rounded">-</code>)</div>
                  <div>• <strong>Disposisi:</strong> Dilaporkan Kepada Pimpinan</div>
                  <div>• <strong>Tindak Lanjut:</strong> Hal (sebelum <code className="bg-white/80 px-1 rounded">-</code>) Nomor: Nomor</div>
                </div>
              </div>
            </div>
          )}

          {register.code === "R.IN.6" && (
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-xs text-amber-950 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-amber-900">
                    Aturan Pemetaan Kolom R.IN.6 (Register Arsip) Aktif:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-amber-900 mt-1">
                    <div>• <strong>Waktu Terima:</strong> Tanggal + Jam Acak (09:00 - 15:00)</div>
                    <div>• <strong>Diterima Dari:</strong> Asal dari CSV</div>
                    <div>• <strong>No & Tgl Surat:</strong> Nomor & Tanggal Surat</div>
                    <div>• <strong>Perihal:</strong> Hal dari CSV</div>
                    <div>• <strong>Lampiran:</strong> -</div>
                    <div>• <strong>Kode Penyimpanan:</strong> Dicocokkan dari Tabel Kode Penyimpanan</div>
                    <div>• <strong>Ket:</strong> DISIMPAN DALAM ARSIP</div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStorageModalOpen(true)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 rounded-lg border border-amber-300 transition cursor-pointer shadow-xs"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Kelola Kode Penyimpanan ({storageCodes.length})</span>
              </button>
            </div>
          )}

          {register.code === "R.IN.19" && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs text-emerald-950 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 w-full">
                <span className="font-bold text-emerald-900">
                  Aturan Pemetaan Kolom R.IN.19 (Register Telaahan Intelijen) Aktif:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-emerald-900 mt-1">
                  <div>• <strong>Tgl dan No. Telaahan:</strong> Tanggal & No. Telaahan</div>
                  <div>• <strong>Pembuat:</strong> Pembuat / Asal Unit Intelijen</div>
                  <div>• <strong>Perihal:</strong> Pokok / Hal Telaahan</div>
                  <div>• <strong>Lampiran:</strong> Lampiran / Berkas</div>
                  <div>• <strong>Tindak Lanjut:</strong> Arahan Pimpinan</div>
                  <div>• <strong>Keterangan:</strong> Disposisi / Status</div>
                </div>
              </div>
            </div>
          )}

          {register.code === "R.IN.20" && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs text-emerald-950 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 w-full">
                <span className="font-bold text-emerald-900">
                  Aturan Pemetaan Kolom R.IN.20 (Register Ekspedisi Berita - Kamar Sandi) Aktif:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 text-[11px] text-emerald-900 mt-1">
                  <div>• <strong>No. Berita:</strong> Nomor Berita Sandi</div>
                  <div>• <strong>Kepada:</strong> Pejabat Penerima</div>
                  <div>• <strong>Nama & TTD Penerima:</strong> Tanda Terima</div>
                  <div>• <strong>Keterangan:</strong> Status Penerimaan</div>
                </div>
              </div>
            </div>
          )}

          {register.code === "R.IN.5" && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs text-emerald-950 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 w-full">
                <span className="font-bold text-emerald-900">
                  Aturan Pemetaan Kolom R.IN.5 (Register Produk Intelijen) Aktif:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-emerald-900 mt-1">
                  <div>• <strong>Jenis Produk:</strong> Otomatis (LIH / LIK / Telaahan)</div>
                  <div>• <strong>No & Tgl Produk:</strong> Nomor & Tanggal Surat</div>
                  <div>• <strong>Subdit / Seksi:</strong> Seksi Intelijen</div>
                  <div>• <strong>Perihal:</strong> Uraian Pokok Surat</div>
                  <div>
                    • <strong>Disposisi Pimpinan:</strong> CSV atau Default{" "}
                    <span className="font-bold bg-emerald-200/90 text-emerald-950 px-1.5 py-0.5 rounded border border-emerald-300">
                      "{defaultDisposisiPimpinan || "Arsip"}"
                    </span>
                  </div>
                  <div>• <strong>Keterangan:</strong> Selesai</div>
                </div>
              </div>
            </div>
          )}

          {register.code !== "R.IN.1" &&
            register.code !== "R.IN.2" &&
            register.code !== "R.IN.3" &&
            register.code !== "R.IN.5" &&
            register.code !== "R.IN.6" &&
            register.code !== "R.IN.19" &&
            register.code !== "R.IN.20" && (
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 text-xs text-slate-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 w-full">
                  <span className="font-bold text-slate-900">
                    Aturan Pemetaan Kolom {register.code} ({register.title}) Aktif:
                  </span>
                  <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[11px] text-slate-600 mt-1">
                    {getRegisterLeafColumns(register).map((col) => (
                      <span
                        key={col.key}
                        className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium"
                      >
                        • <strong>{col.label}:</strong> {col.key}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

          {/* Nav Tabs */}
          <div className="flex border-b border-slate-200 px-5 pt-3 gap-3 bg-slate-50">
            <button
              onClick={() => setPreviewTab("input")}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                previewTab === "input"
                  ? "border-emerald-600 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Input / Unggah File CSV</span>
            </button>
            <button
              onClick={() => setPreviewTab("preview")}
              disabled={parsedRows.length === 0}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                previewTab === "preview"
                  ? "border-emerald-600 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Hasil Pratinjau ({parsedRows.length} Baris)</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {previewTab === "input" ? (
              <div className="space-y-4">
                {/* Default Disposisi Pimpinan Configuration Card */}
                <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                        DP
                      </div>
                      <div>
                        <label htmlFor="input-default-disposisi" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span>Nilai Default Disposisi Pimpinan (Jika Kosong di CSV)</span>
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                            Aktif Otomatis
                          </span>
                        </label>
                        <p className="text-[11px] text-slate-600">
                          Jika kolom disposisi pimpinan pada berkas CSV tidak diisi/kosong, baris impor akan otomatis diset ke nilai ini (misal: <strong>"Arsip"</strong>).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <div className="flex-1 min-w-[220px]">
                      <input
                        id="input-default-disposisi"
                        type="text"
                        value={defaultDisposisiPimpinan}
                        onChange={(e) => handleSetDefaultDisposisi(e.target.value)}
                        placeholder="Ketik nilai default, misal: Arsip"
                        className="w-full text-xs font-semibold px-3 py-2 bg-white border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 shadow-2xs"
                      />
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {["Arsip", "Dilaporkan Kepada Pimpinan", "Ditindaklanjuti dan monitor perkembangan", "Selesai"].map(
                        (preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleSetDefaultDisposisi(preset)}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition cursor-pointer ${
                              defaultDisposisiPimpinan === preset
                                ? "bg-emerald-700 text-white border-emerald-800 shadow-2xs font-bold"
                                : "bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300"
                            }`}
                          >
                            {preset === "Arsip" ? "📁 Arsip" : preset}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                {/* File Upload Zone */}
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-emerald-500 bg-slate-50 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    Klik untuk memilih file CSV atau drag & drop file ke sini
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Format berkas .csv dengan pemisah koma (comma delimited)
                  </p>
                </div>

                {/* Or Paste CSV */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Atau Tempelkan (Paste) Teks CSV di bawah:
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoadSample(SAMPLE_FULL_KEJARI_TABANAN_CSV)}
                        className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded cursor-pointer flex items-center gap-1 transition shadow-2xs"
                        title="Muat 124 baris data nyata Kejari Tabanan (Lapinhar, Lapinsus, dll)"
                      >
                        <RefreshCw className="w-3 h-3 text-amber-700" />
                        Gunakan 124 Data Riil Tabanan
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadSample(getSampleCsvForRegister(register.code))}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Contoh Standar {register.code}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={8}
                    value={csvText}
                    onChange={(e) => {
                      setCsvText(e.target.value);
                      if (e.target.value.trim()) {
                        handleParseCsv(e.target.value);
                      } else {
                        setParsedRows([]);
                      }
                    }}
                    placeholder={getSampleCsvForRegister(register.code)}
                    className="w-full font-mono text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {parsedRows.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-xs font-bold text-emerald-900">
                      Berhasil memparsing {parsedRows.length} baris data CSV!
                    </span>
                    <button
                      onClick={() => setPreviewTab("preview")}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-200 hover:bg-emerald-300 px-3 py-1.5 rounded transition cursor-pointer"
                    >
                      <span>Lihat Pratinjau Tabel</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <span>
                    Menampilkan pratinjau hasil pemetaan <strong>{parsedRows.length} baris</strong> untuk <strong>{register.code}</strong>:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    💡 Anda dapat mengedit langsung isi kolom di bawah sebelum mengimpor.
                  </span>
                </div>

                {/* Quick Disposisi Control Bar in Preview */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 p-2.5 sm:p-3 rounded-lg text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">
                        DP
                      </span>
                      <span>Disposisi Pimpinan Default:</span>
                    </span>
                    <input
                      type="text"
                      value={defaultDisposisiPimpinan}
                      onChange={(e) => handleSetDefaultDisposisi(e.target.value)}
                      placeholder="Misal: Arsip"
                      className="text-xs font-semibold px-2.5 py-1 bg-white border border-emerald-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 min-w-[140px] shadow-2xs"
                    />
                    <div className="flex items-center gap-1">
                      {["Arsip", "Dilaporkan Kepada Pimpinan", "Ditindaklanjuti", "Selesai"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleSetDefaultDisposisi(p)}
                          className={`px-2 py-0.5 text-[10px] rounded border transition cursor-pointer ${
                            defaultDisposisiPimpinan === p
                              ? "bg-emerald-700 text-white font-bold border-emerald-800 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-emerald-100"
                          }`}
                        >
                          {p === "Arsip" ? "📁 Arsip" : p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyDefaultDisposisiToPreview(false)}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-md transition cursor-pointer shadow-2xs"
                      title="Isi baris yang kolom disposisinya kosong atau bernilai default dengan nilai ini"
                    >
                      Terapkan ke Baris Kosong
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDefaultDisposisiToPreview(true)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition cursor-pointer"
                      title="Ganti seluruh nilai disposisi pimpinan pada pratinjau dengan nilai ini"
                    >
                      Terapkan ke Semua Baris
                    </button>
                  </div>
                </div>

                {/* Table Preview for R.IN.1 */}
                {register.code === "R.IN.1" && (
                  <div className="border border-slate-300 rounded-lg overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-800 font-bold sticky top-0 border-b border-slate-300">
                        <tr>
                          <th className="p-2 border-r border-slate-200 text-center w-12">No</th>
                          <th className="p-2 border-r border-slate-200 w-24">Tgl Terima</th>
                          <th className="p-2 border-r border-slate-200 w-20">Jam (Acak)</th>
                          <th className="p-2 border-r border-slate-200 min-w-[160px]">Nomor Surat</th>
                          <th className="p-2 border-r border-slate-200 w-24">Tgl Surat</th>
                          <th className="p-2 border-r border-slate-200 min-w-[180px]">Asal Surat</th>
                          <th className="p-2 border-r border-slate-200 min-w-[220px]">Perihal</th>
                          <th className="p-2 border-r border-slate-200 w-24">Tgl/Isi Disp</th>
                          <th className="p-2 border-r border-slate-200 w-28">Tindak Lanjut</th>
                          <th className="p-2 text-center w-10">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-700">
                              {row.nomorUrut}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono text-slate-800 whitespace-nowrap">
                              <input
                                type="text"
                                value={row.data.tgl_terima || ""}
                                onChange={(e) => handleUpdateRowField(idx, "tgl_terima", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono text-emerald-800 font-bold whitespace-nowrap">
                              <input
                                type="text"
                                value={row.data.jam_terima || ""}
                                onChange={(e) => handleUpdateRowField(idx, "jam_terima", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-800">
                              <input
                                type="text"
                                value={row.data.nomor_surat || ""}
                                onChange={(e) => handleUpdateRowField(idx, "nomor_surat", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono text-slate-800 whitespace-nowrap">
                              <input
                                type="text"
                                value={row.data.tgl_surat || ""}
                                onChange={(e) => handleUpdateRowField(idx, "tgl_surat", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-900 font-medium">
                              <input
                                type="text"
                                value={row.data.asal_surat || ""}
                                onChange={(e) => handleUpdateRowField(idx, "asal_surat", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-800">
                              <input
                                type="text"
                                value={row.data.perihal || ""}
                                onChange={(e) => handleUpdateRowField(idx, "perihal", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-700">
                              {row.data.tgl_isi_disposisi}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-semibold text-emerald-800">
                              {row.data.tindak_lanjut}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeletePreviewRow(idx)}
                                className="text-slate-400 hover:text-red-600 p-1"
                                title="Hapus baris ini dari impor"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Table Preview for R.IN.6 */}
                {register.code === "R.IN.6" && (
                  <div className="border border-slate-300 rounded-lg overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-amber-100/70 text-slate-800 font-bold sticky top-0 border-b border-slate-300">
                        <tr>
                          <th className="p-2 border-r border-slate-200 text-center w-12">No</th>
                          <th className="p-2 border-r border-slate-200 min-w-[140px]">Waktu Terima (Acak)</th>
                          <th className="p-2 border-r border-slate-200 min-w-[180px]">Diterima Dari</th>
                          <th className="p-2 border-r border-slate-200 min-w-[180px]">No. & Tgl Surat</th>
                          <th className="p-2 border-r border-slate-200 min-w-[220px]">Perihal</th>
                          <th className="p-2 border-r border-slate-200 w-16 text-center">Lampiran</th>
                          <th className="p-2 border-r border-slate-200 min-w-[150px]">Kode Penyimpanan</th>
                          <th className="p-2 border-r border-slate-200 w-32">Keterangan</th>
                          <th className="p-2 text-center w-10">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/40">
                            <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-700">
                              {row.nomorUrut}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono text-slate-800 whitespace-nowrap">
                              <input
                                type="text"
                                value={row.data.waktu_terima || ""}
                                onChange={(e) => handleUpdateRowField(idx, "waktu_terima", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-amber-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 font-medium text-slate-900">
                              <input
                                type="text"
                                value={row.data.diterima_dari || ""}
                                onChange={(e) => handleUpdateRowField(idx, "diterima_dari", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-amber-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-800">
                              <input
                                type="text"
                                value={row.data.no_tgl_surat || ""}
                                onChange={(e) => handleUpdateRowField(idx, "no_tgl_surat", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-amber-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-800">
                              <input
                                type="text"
                                value={row.data.perihal || ""}
                                onChange={(e) => handleUpdateRowField(idx, "perihal", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-amber-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-center text-slate-500">
                              {row.data.lampiran || "-"}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono font-bold text-amber-900 bg-amber-50/50">
                              <input
                                type="text"
                                value={row.data.kode_penyimpanan || ""}
                                onChange={(e) => handleUpdateRowField(idx, "kode_penyimpanan", e.target.value)}
                                placeholder="Contoh: ARSIP-01"
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-amber-500 rounded text-amber-900 font-bold"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-600 text-xs">
                              {row.data.keterangan || "DISIMPAN DALAM ARSIP"}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeletePreviewRow(idx)}
                                className="text-slate-400 hover:text-red-600 p-1"
                                title="Hapus baris ini dari impor"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Table Preview for R.IN.3 */}
                {register.code === "R.IN.3" && (
                  <div className="border border-slate-300 rounded-lg overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-800 font-bold sticky top-0 border-b border-slate-300">
                        <tr>
                          <th className="p-2 border-r border-slate-200 text-center w-12">No</th>
                          <th className="p-2 border-r border-slate-200 w-24">Waktu Diterima</th>
                          <th className="p-2 border-r border-slate-200 w-36">Sumber / Bapul</th>
                          <th className="p-2 border-r border-slate-200 text-center w-16">Nilai</th>
                          <th className="p-2 border-r border-slate-200 min-w-[200px]">Uraian Peristiwa/Masalah</th>
                          <th className="p-2 border-r border-slate-200 w-24">Catatan</th>
                          <th className="p-2 border-r border-slate-200 min-w-[140px]">Disposisi/Tindakan</th>
                          <th className="p-2 border-r border-slate-200 min-w-[200px]">Tindak Lanjut</th>
                          <th className="p-2 text-center w-10">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-700">
                              {row.nomorUrut}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono text-slate-800 whitespace-nowrap">
                              <input
                                type="text"
                                value={row.data.waktu_diterima || row.tgl || ""}
                                onChange={(e) => handleUpdateRowField(idx, "waktu_diterima", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-800">
                              <input
                                type="text"
                                value={row.data.sumber_bapul || ""}
                                onChange={(e) => handleUpdateRowField(idx, "sumber_bapul", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-center font-bold text-emerald-800">
                              <input
                                type="text"
                                value={row.data.nilai_data || ""}
                                onChange={(e) => handleUpdateRowField(idx, "nilai_data", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded text-center"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-900">
                              <input
                                type="text"
                                value={row.data.uraian_peristiwa || ""}
                                onChange={(e) => handleUpdateRowField(idx, "uraian_peristiwa", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-center text-slate-500">
                              <input
                                type="text"
                                value={row.data.catatan || ""}
                                onChange={(e) => handleUpdateRowField(idx, "catatan", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded text-center"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-800">
                              <input
                                type="text"
                                value={row.data.disposisi_tindakan || ""}
                                onChange={(e) => handleUpdateRowField(idx, "disposisi_tindakan", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-800">
                              <input
                                type="text"
                                value={row.data.tindak_lanjut || ""}
                                onChange={(e) => handleUpdateRowField(idx, "tindak_lanjut", e.target.value)}
                                className="w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeletePreviewRow(idx)}
                                className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                                title="Hapus baris ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Table Preview for All Other Registers (R.IN.2, R.IN.4, R.IN.5, R.IN.7 ... R.IN.19, R.IN.20, etc.) */}
                {register.code !== "R.IN.1" && register.code !== "R.IN.3" && register.code !== "R.IN.6" && (
                  <div className="border border-slate-300 rounded-lg overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-800 font-bold sticky top-0 border-b border-slate-300">
                        <tr>
                          <th className="p-2 border-r border-slate-200 text-center w-12 shrink-0">No</th>
                          {getRegisterLeafColumns(register).map((col) => (
                            <th
                              key={col.key}
                              className="p-2 border-r border-slate-200 min-w-[150px] whitespace-nowrap"
                            >
                              {col.label}
                            </th>
                          ))}
                          <th className="p-2 text-center w-10 shrink-0">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-700">
                              {row.nomorUrut}
                            </td>
                            {getRegisterLeafColumns(register).map((col) => {
                              const isDisposisiCol =
                                col.key === "disposisi_pimpinan" ||
                                col.key === "disposisiPimpinan" ||
                                col.key === "disposisi_tindakan" ||
                                col.key === "disposisi";
                              const cellVal =
                                row.data[col.key] !== undefined && row.data[col.key] !== null
                                  ? String(row.data[col.key])
                                  : "";
                              const isAppliedDefault =
                                isDisposisiCol &&
                                Boolean(defaultDisposisiPimpinan.trim()) &&
                                cellVal === defaultDisposisiPimpinan.trim();

                              return (
                                <td
                                  key={col.key}
                                  className={`p-2 border-r border-slate-200 text-slate-800 ${
                                    isAppliedDefault ? "bg-emerald-50/70" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={cellVal}
                                      onChange={(e) => handleUpdateRowField(idx, col.key, e.target.value)}
                                      className={`w-full bg-transparent border-0 p-0 focus:ring-1 focus:ring-emerald-500 rounded text-slate-900 ${
                                        isDisposisiCol ? "font-semibold text-emerald-950" : ""
                                      }`}
                                    />
                                    {isAppliedDefault && (
                                      <span
                                        className="shrink-0 text-[8px] font-bold px-1 py-0.5 rounded bg-emerald-200/90 text-emerald-900 border border-emerald-300"
                                        title={`Nilai default "${defaultDisposisiPimpinan}" diterapkan`}
                                      >
                                        DEFAULT
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeletePreviewRow(idx)}
                                className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                                title="Hapus baris ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Options */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clearExisting}
                      onChange={(e) => setClearExisting(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      Hapus data yang sudah ada di register {register.code} sebelum mengimpor (Gantikan Seluruh Data)
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition cursor-pointer"
            >
              Batal
            </button>

            <div className="flex items-center gap-2">
              {previewTab === "preview" && (
                <button
                  type="button"
                  onClick={() => setPreviewTab("input")}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
                >
                  Kembali ke Input
                </button>
              )}

              <button
                id="btn-confirm-import-csv"
                type="button"
                onClick={handleSubmitImport}
                disabled={isLoading || parsedRows.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengimpor Data...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      Impor {parsedRows.length > 0 ? `${parsedRows.length} Baris Data` : "Sekarang"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Codes Modal */}
      {isStorageModalOpen && (
        <StorageCodesModal
          isOpen={isStorageModalOpen}
          onClose={() => {
            setIsStorageModalOpen(false);
            fetchStorageCodes();
          }}
        />
      )}
    </>
  );
};

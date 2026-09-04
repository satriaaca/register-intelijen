import React, { useEffect, useState, useRef } from "react";
import {
  Database,
  Download,
  Trash2,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Calendar,
  Layers,
  X,
  FileArchive,
  Info,
  Check,
  Clock,
  ShieldCheck,
  FileJson,
} from "lucide-react";
import { authFetch } from "../lib/api.js";
import { ArchivingAnimation } from "./ArchivingAnimation.js";
import type { DatabaseArchiveStats, ArchivePackage } from "../types.js";

interface ArchiveManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const ArchiveManagerModal: React.FC<ArchiveManagerModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<"years" | "restore" | "guide">("years");
  const [stats, setStats] = useState<DatabaseArchiveStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [actionLoadingYear, setActionLoadingYear] = useState<number | null>(null);

  // State Purge Confirmation Modal
  const [purgeTargetYear, setPurgeTargetYear] = useState<number | null>(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [isPurging, setIsPurging] = useState(false);

  // State Restore
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedPackage, setParsedPackage] = useState<ArchivePackage | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<"replace" | "merge">("replace");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      const res = await authFetch("/api/archive/stats");
      if (!res.ok) throw new Error("Gagal mengambil statistik arsip database.");
      const data: DatabaseArchiveStats = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching archive stats:", err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchStats();
      setRestoreSuccessMsg(null);
      setParsedPackage(null);
      setSelectedFile(null);
      setParseError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Export / Download JSON
  const handleExportYear = async (year: number) => {
    try {
      setActionLoadingYear(year);
      const res = await authFetch(`/api/archive/export/${year}`);
      if (!res.ok) throw new Error("Gagal mengekspor data arsip.");
      const pkg: ArchivePackage = await res.json();

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(pkg, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute(
        "download",
        `arsip_register_amerta_${year}_${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert("Gagal mengunduh arsip: " + (err.message || String(err)));
    } finally {
      setActionLoadingYear(null);
    }
  };

  // Handle Purge Execution
  const handleExecutePurge = async () => {
    if (!purgeTargetYear) return;
    if (purgeConfirmText.trim() !== String(purgeTargetYear)) {
      alert(`Ketik angka "${purgeTargetYear}" untuk konfirmasi.`);
      return;
    }

    try {
      setIsPurging(true);
      const res = await authFetch(`/api/archive/purge/${purgeTargetYear}`, {
        method: "POST",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal mengosongkan data dari database.");
      }
      const data = await res.json();
      alert(data.message || "Data berhasil dikosongkan dari database.");
      setPurgeTargetYear(null);
      setPurgeConfirmText("");
      await fetchStats();
      onDataChanged();
    } catch (err: any) {
      alert("Gagal menghapus data: " + (err.message || String(err)));
    } finally {
      setIsPurging(false);
    }
  };

  // Handle File Selection for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setRestoreSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed.year || !Array.isArray(parsed.entries)) {
          throw new Error("Struktur berkas arsip tidak dikenali (wajib memuat tahun dan entri).");
        }
        setParsedPackage(parsed);
      } catch (err: any) {
        setParseError("Gagal membaca berkas JSON: " + (err.message || "Format tidak valid"));
        setParsedPackage(null);
      }
    };
    reader.readAsText(file);
  };

  // Handle Execute Restore
  const handleExecuteRestore = async () => {
    if (!parsedPackage) return;

    try {
      setIsRestoring(true);
      const res = await authFetch("/api/archive/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package: parsedPackage,
          mode: restoreMode,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal memulihkan arsip ke database.");
      }

      const result = await res.json();
      setRestoreSuccessMsg(result.message || "Data arsip berhasil dipulihkan!");
      setSelectedFile(null);
      setParsedPackage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchStats();
      onDataChanged();
    } catch (err: any) {
      alert("Gagal memulihkan arsip: " + (err.message || String(err)));
    } finally {
      setIsRestoring(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-xs sm:p-5">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/30 border border-emerald-400/30 text-emerald-300">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold uppercase tracking-wide text-white">
                  Manajemen Kapasitas Database & Arsip
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 rounded bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  hijau.kn.tabanan@gmail.com
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Kebijakan Retensi 3 Tahun · Neon Postgres & Google Drive Cloud Backup
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("years")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "years"
                ? "border-emerald-600 text-emerald-800 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileArchive className="h-4 w-4" />
            Daftar Tahun & Pembersihan
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("restore")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "restore"
                ? "border-emerald-600 text-emerald-800 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Upload className="h-4 w-4" />
            Pulihkan (Restore) Arsip
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "guide"
                ? "border-emerald-600 text-emerald-800 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Info className="h-4 w-4" />
            Panduan Google Drive
          </button>

          <div className="ml-auto flex items-center py-2">
            <button
              type="button"
              onClick={() => void fetchStats()}
              disabled={isLoadingStats}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingStats ? "animate-spin text-emerald-600" : ""}`} />
              Segarkan Data
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: DAFTAR TAHUN & RETENSI */}
          {activeTab === "years" && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-tight">
                      Total Baris Register
                    </span>
                    <Layers className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-emerald-950 font-mono">
                      {stats ? stats.totalEntries.toLocaleString() : "..."}
                    </span>
                    <span className="text-xs text-emerald-700">entri aktif</span>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-tight">
                      Kunci Dokumen Selesai
                    </span>
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-blue-950 font-mono">
                      {stats ? stats.totalLocks.toLocaleString() : "..."}
                    </span>
                    <span className="text-xs text-blue-700">periode terkunci</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-tight">
                      Estimasi Ukuran Neon DB
                    </span>
                    <HardDrive className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900 font-mono">
                      {stats ? formatBytes(stats.totalEstimatedBytes) : "..."}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">(Limit Neon 512 MB)</span>
                  </div>
                </div>
              </div>

              {/* Policy Banner */}
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 text-xs text-emerald-900">
                <Info className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    Aturan Retensi 3 Tahun Terakhir (Tahun Berjalan: {stats?.currentYear || 2026})
                  </p>
                  <p className="text-emerald-800 leading-relaxed">
                    Sistem mempertahankan data aktif untuk tahun <strong>{stats?.retentionYears.join(", ")}</strong>. 
                    Untuk data tahun sebelumnya yang telah selesai diperiksa, Anda dapat <strong>mengunduh arsip JSON</strong> untuk disimpan ke Google Drive, lalu <strong>mengosongkan data</strong> dari database Neon agar resource tetap hemat.
                  </p>
                </div>
              </div>

              {/* Year Breakdown Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-4 py-2.5 font-bold uppercase">Tahun</th>
                      <th className="px-3 py-2.5 font-bold uppercase text-center">Jumlah Entri</th>
                      <th className="px-3 py-2.5 font-bold uppercase text-center">Kunci Dokumen</th>
                      <th className="px-3 py-2.5 font-bold uppercase">Status Retensi</th>
                      <th className="px-3 py-2.5 font-bold uppercase text-right">Est. Ukuran</th>
                      <th className="px-4 py-2.5 font-bold uppercase text-center">Aksi Arsip & Pembersihan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats?.years.map((y) => {
                      const isActionLoading = actionLoadingYear === y.year;
                      const hasData = y.entryCount > 0 || y.lockCount > 0;

                      return (
                        <tr key={y.year} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 font-mono text-sm font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-emerald-700" />
                              <span>{y.year}</span>
                              {y.year === stats.currentYear && (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                                  Tahun Ini
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-medium text-slate-800">
                            {y.entryCount.toLocaleString()} baris
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-slate-700">
                            {y.lockCount} register
                          </td>
                          <td className="px-3 py-3">
                            {y.isRetentionActive ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                Aktif (3 Thn Terakhir)
                              </span>
                            ) : hasData ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                <AlertTriangle className="h-3 w-3" />
                                Siap Diarsipkan (&gt; 3 Thn)
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                Kosong / Diarsipkan
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-slate-600">
                            {formatBytes(y.estimatedBytes)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleExportYear(y.year)}
                                disabled={!hasData || isActionLoading}
                                title={`Unduh Arsip Lengkap Tahun ${y.year} (JSON)`}
                                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-emerald-800 disabled:opacity-40"
                              >
                                <Download className="h-3.5 w-3.5 text-emerald-700" />
                                <span>Unduh Arsip</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setPurgeTargetYear(y.year);
                                  setPurgeConfirmText("");
                                }}
                                disabled={!hasData}
                                title={`Kosongkan Data Tahun ${y.year} dari Database`}
                                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50/50 px-2.5 py-1 text-xs font-semibold text-red-700 shadow-2xs hover:bg-red-100 hover:text-red-800 disabled:opacity-40"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Kosongkan</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: RESTORE ARSIP */}
          {activeTab === "restore" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-tight text-slate-900 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-emerald-700" />
                  Pulihkan Data Arsip dari File Cadangan (JSON)
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Pilih file arsip <code>arsip_register_amerta_YYYY.json</code> yang telah diunduh sebelumnya dari Google Drive atau komputer Anda untuk dimasukkan kembali ke dalam database Neon.
                </p>
              </div>

              {/* File Upload Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/30 p-8 text-center transition hover:border-emerald-500 hover:bg-emerald-50/60"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileJson className="h-12 w-12 text-emerald-600 mb-2" />
                <p className="text-sm font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : "Klik atau seret berkas arsip JSON ke sini"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Mendukung berkas JSON cadangan AMERTA Kejaksaan
                </p>
              </div>

              {parseError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{parseError}</span>
                </div>
              )}

              {restoreSuccessMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{restoreSuccessMsg}</span>
                </div>
              )}

              {/* Inspect Loaded Package */}
              {parsedPackage && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-xs font-bold text-slate-900 uppercase">
                        Informasi Berkas Arsip
                      </span>
                      <p className="text-[11px] text-slate-500">{parsedPackage.app || "AMERTA"}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 font-mono text-xs font-bold text-emerald-900">
                      Tahun: {parsedPackage.year}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Total Baris Entri</span>
                      <span className="text-base font-bold font-mono text-slate-900">
                        {parsedPackage.entries?.length || 0}
                      </span>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Kunci Register</span>
                      <span className="text-base font-bold font-mono text-slate-900">
                        {parsedPackage.locks?.length || 0}
                      </span>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Diekspor Oleh</span>
                      <span className="text-xs font-semibold text-slate-800 truncate block">
                        {parsedPackage.exportedBy || "-"}
                      </span>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Waktu Ekspor</span>
                      <span className="text-[11px] font-mono text-slate-700 block">
                        {parsedPackage.exportedAt
                          ? new Date(parsedPackage.exportedAt).toLocaleDateString("id-ID")
                          : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Mode Selector */}
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-bold text-slate-800 uppercase">
                      Metode Pemulihan Data:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs transition ${
                          restoreMode === "replace"
                            ? "border-emerald-600 bg-emerald-50/50 text-emerald-950"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="restoreMode"
                          value="replace"
                          checked={restoreMode === "replace"}
                          onChange={() => setRestoreMode("replace")}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-bold block">Gantikan Penuh (Clean Replace)</span>
                          <span className="text-[11px] text-slate-500">
                            Mengosongkan data tahun {parsedPackage.year} yang ada di DB lalu mengisi ulang sesuai file arsip (Mencegah duplikasi data).
                          </span>
                        </div>
                      </label>

                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs transition ${
                          restoreMode === "merge"
                            ? "border-emerald-600 bg-emerald-50/50 text-emerald-950"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="restoreMode"
                          value="merge"
                          checked={restoreMode === "merge"}
                          onChange={() => setRestoreMode("merge")}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-bold block">Gabungkan (Merge Append)</span>
                          <span className="text-[11px] text-slate-500">
                            Menambahkan entri dari file tanpa menghapus data yang sudah ada di database.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Restore Action Button */}
                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setParsedPackage(null);
                        setSelectedFile(null);
                      }}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleExecuteRestore()}
                      disabled={isRestoring}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-800 disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4" />
                      <span>{isRestoring ? "Memulihkan ke Database..." : `Pulihkan Data Tahun ${parsedPackage.year}`}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PANDUAN GOOGLE DRIVE */}
          {activeTab === "guide" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 text-xs text-slate-700 leading-relaxed">
                <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm border-b border-slate-200 pb-3 uppercase">
                  <HardDrive className="h-5 w-5 text-emerald-700" />
                  SOP & Mekanisme Pencadangan Google Drive
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">
                      1
                    </div>
                    <div>
                      <strong className="text-slate-900 block font-semibold">
                        Siklus Retensi 3 Tahun di Neon Postgres
                      </strong>
                      <p className="text-slate-600 mt-0.5">
                        Database online Neon difokuskan untuk 3 tahun aktif (misal 2024, 2025, 2026). Ini memastikan kuota gratis 0.5 GB tidak pernah penuh dan performa query selalu cepat.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">
                      2
                    </div>
                    <div>
                      <strong className="text-slate-900 block font-semibold">
                        Pengarsipan Tahunan (Export ke JSON)
                      </strong>
                      <p className="text-slate-600 mt-0.5">
                        Pada akhir tahun atau saat register tahun lama telah ditutup dan ditandatangani, klik <strong>"Unduh Arsip"</strong> pada tab Daftar Tahun. File JSON berisi seluruh entri R.IN.1–R.IN.23 beserta snapshot pejabat penandatangan.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">
                      3
                    </div>
                    <div>
                      <strong className="text-slate-900 block font-semibold">
                        Penyimpanan ke Google Drive Instansi
                      </strong>
                      <p className="text-slate-600 mt-0.5">
                        Unggah file <code>arsip_register_amerta_YYYY.json</code> ke folder Google Drive Seksi Intelijen (contoh: <code>Drive / AMERTA / Arsip_Register / 2023</code>).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">
                      4
                    </div>
                    <div>
                      <strong className="text-slate-900 block font-semibold">
                        Pemulihan Fleksibel Kapan Saja (Restore On-Demand)
                      </strong>
                      <p className="text-slate-600 mt-0.5">
                        Jika sewaktu-waktu ada pemeriksaan atau audit untuk tahun lampau (misal tahun 2023), Anda cukup mengunduh kembali file JSON dari Google Drive dan mengunggahnya pada tab <strong>"Pulihkan (Restore) Arsip"</strong>. Seluruh data, register, dan cetak PDF akan langsung tersedia kembali seperti semula.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Animated Shelf Graphic */}
              <ArchivingAnimation />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs">
          <span className="text-slate-500 font-mono">
            Status: PostgreSQL (Neon) · Terintegrasi Ekspor/Impor JSON
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-1.5 font-semibold text-white hover:bg-slate-900 transition"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL FOR PURGE */}
      {purgeTargetYear && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm uppercase">
                  Konfirmasi Pengosongan Data
                </h3>
                <p className="text-xs text-red-600 font-semibold">Tahun {purgeTargetYear}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan menghapus seluruh data baris register dan kunci register untuk tahun{" "}
              <strong className="text-slate-900">{purgeTargetYear}</strong> dari database online.
            </p>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
              ⚠️ <strong>Penting:</strong> Pastikan Anda telah mengklik tombol <strong>"Unduh Arsip"</strong> dan menyimpan berkas JSON ke Google Drive sebelum melanjutkan.
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Ketik angka <span className="font-mono text-red-700 font-bold">{purgeTargetYear}</span> untuk mengonfirmasi:
              </label>
              <input
                type="text"
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                placeholder={String(purgeTargetYear)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-center font-bold focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPurgeTargetYear(null);
                  setPurgeConfirmText("");
                }}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleExecutePurge()}
                disabled={isPurging || purgeConfirmText.trim() !== String(purgeTargetYear)}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-40"
              >
                {isPurging ? "Mengosongkan..." : "Ya, Kosongkan Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

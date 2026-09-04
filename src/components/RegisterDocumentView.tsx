import React, { useEffect, useState, useCallback } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FolderArchive,
  Plus,
  Save,
  Trash2,
  Upload,
  Lock,
  Unlock,
  Filter,
  Layers,
  ShieldCheck,
} from "lucide-react";
import jsPDF from "jspdf";

import {
  AppSettings,
  Officer,
  RegisterDefinition,
  RegisterEntryRow,
  RegisterLock,
  Rin3CategoryType,
  RIN3_CATEGORIES,
} from "../types.js";

import { generateRegisterPdf } from "../lib/pdf-generator.js";
import { authFetch } from "../lib/api.js";

import {
  MONTH_NAMES_ID,
  MONTH_SHORT_ID,
  formatDateIndonesian,
  filterEntriesByPeriod,
  getClosingDateForPeriod,
} from "../lib/date-utils.js";

import {
  detectRin3Category,
  filterRin3EntriesByCategory,
  countRin3EntriesByCategory,
} from "../lib/rin3-category.js";

import { ESIGN_DATA_URL } from "../assets/esignBase64.js";

import { EntryFormModal } from "./EntryFormModal.js";
import { ImportCsvModal } from "./ImportCsvModal.js";
import { PdfPreviewModal } from "./PdfPreviewModal.js";
import { StorageCodesModal } from "./StorageCodesModal.js";
import { LockRegisterModal } from "./LockRegisterModal.js";

interface RegisterDocumentViewProps {
  register: RegisterDefinition;
  entries: RegisterEntryRow[];
  officers: Officer[];
  settings: AppSettings;
  onSaveEntry: (data: {
    id?: number;
    nomorUrut: number;
    tgl?: string;
    waktu?: string;
    data: Record<string, any>;
  }) => Promise<void>;
  onDeleteEntry: (id: number) => Promise<void>;
  onBatchDeleteEntries?: (ids: number[]) => Promise<void>;
  onUpdateSettings?: (
    newSettings: Partial<AppSettings>,
  ) => Promise<void>;
  onReload: () => void;
}

type StorageCodeRecord = {
  id?: number;
  kode: string;
  asal: string;
  keterangan?: string;
};

export const RegisterDocumentView: React.FC<RegisterDocumentViewProps> = ({
  register,
  entries,
  officers,
  settings,
  onSaveEntry,
  onDeleteEntry,
  onBatchDeleteEntries,
  onUpdateSettings,
  onReload,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] =
    useState<RegisterEntryRow | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const [isStorageCodesOpen, setIsStorageCodesOpen] = useState(false);

  const [generatedPdf, setGeneratedPdf] = useState<jsPDF | null>(null);

  const [entryToDelete, setEntryToDelete] =
    useState<RegisterEntryRow | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);

  // Multi-delete (hapus massal) state
  const [selectedEntryIds, setSelectedEntryIds] = useState<number[]>([]);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const [currentOrientation, setCurrentOrientation] = useState<
    "landscape" | "portrait"
  >(register.orientation || "landscape");

  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(1);

  // Filter Kategori Khusus R.IN.3
  const [rin3CategoryFilter, setRin3CategoryFilter] = useState<Rin3CategoryType | "all">("all");

  // State Fitur Lock Register (Kunci Penandatangan)
  const [currentLock, setCurrentLock] = useState<RegisterLock | null>(null);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isLoadingLock, setIsLoadingLock] = useState(false);

  const [isEditingClosingDate, setIsEditingClosingDate] = useState(false);
  const [tempClosingDate, setTempClosingDate] = useState("");
  const [isSavingClosingDate, setIsSavingClosingDate] = useState(false);

  /*
   * Map:
   * kode penyimpanan -> asal instansi.
   *
   * Contoh:
   * ARSIP-01 -> Kepala Kejaksaan Negeri Tabanan
   */
  const [storageCodeMap, setStorageCodeMap] = useState<Map<string, string>>(
    new Map(),
  );

  const currentPeriodKey =
    typeof selectedMonth === "number"
      ? `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`
      : `${selectedYear}-all`;

  const loadRegisterLock = useCallback(async () => {
    try {
      setIsLoadingLock(true);
      const res = await authFetch(
        `/api/register-locks?registerCode=${encodeURIComponent(register.code)}&periodKey=${encodeURIComponent(currentPeriodKey)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setCurrentLock(data || null);
      } else {
        setCurrentLock(null);
      }
    } catch (e) {
      console.error("Failed to load register lock:", e);
      setCurrentLock(null);
    } finally {
      setIsLoadingLock(false);
    }
  }, [register.code, currentPeriodKey]);

  useEffect(() => {
    void loadRegisterLock();
  }, [loadRegisterLock]);

  useEffect(() => {
    setCurrentOrientation(register.orientation || "landscape");
  }, [register.code, register.orientation]);

  // Reset pilihan baris jika buku register, tahun, bulan, atau filter kategori berubah
  useEffect(() => {
    setSelectedEntryIds([]);
  }, [register.code, selectedYear, selectedMonth, rin3CategoryFilter]);

  // Sinkronisasi pilihan dengan data entri saat ini
  useEffect(() => {
    setSelectedEntryIds((prev) =>
      prev.filter((id) => entries.some((entry) => entry.id === id)),
    );
  }, [entries]);

  useEffect(() => {
    if (register.code !== "R.IN.6") {
      setStorageCodeMap(new Map());
      return;
    }

    const loadStorageCodes = async () => {
      try {
        const response = await authFetch("/api/storage-codes");

        if (!response.ok) {
          throw new Error("Gagal memuat kode penyimpanan.");
        }

        const list: StorageCodeRecord[] = await response.json();
        const nextMap = new Map<string, string>();

        if (Array.isArray(list)) {
          list.forEach((item) => {
            const kode = String(item.kode || "").trim();
            const asal = String(item.asal || "").trim();

            if (kode) {
              nextMap.set(kode, asal);
            }
          });
        }

        setStorageCodeMap(nextMap);
      } catch (error) {
        console.error("Gagal memuat data kode penyimpanan:", error);
        setStorageCodeMap(new Map());
      }
    };

    void loadStorageCodes();
  }, [register.code, isStorageCodesOpen]);

  const activeClosingDate =
    (currentLock?.isLocked && currentLock.closingDate)
      ? currentLock.closingDate
      : typeof selectedMonth === "number"
        ? getClosingDateForPeriod(settings, selectedYear, selectedMonth)
        : settings.tanggalDokumen || new Date().toISOString().split("T")[0];

  const activeClosingDateFormatted = formatDateIndonesian(
    activeClosingDate,
    false,
  );

  const activeClosingDateWithDay = formatDateIndonesian(
    activeClosingDate,
    true,
  );

  // Filter berdasarkan periode Tahun & Bulan
  const periodEntries = filterEntriesByPeriod(
    entries,
    selectedYear,
    selectedMonth,
  );

  // Filter khusus kategori pada R.IN.3
  const filteredEntries =
    register.code === "R.IN.3"
      ? filterRin3EntriesByCategory(periodEntries, rin3CategoryFilter)
      : periodEntries;

  // Hitung jumlah per kategori untuk R.IN.3
  const rin3CategoryCounts =
    register.code === "R.IN.3"
      ? countRin3EntriesByCategory(periodEntries)
      : { all: periodEntries.length };

  // Data Penandatangan Efektif (Snapshot jika terkunci, atau global jika tidak)
  const effectiveLeftSignerTitle =
    currentLock?.isLocked && currentLock.leftSignerTitle
      ? currentLock.leftSignerTitle
      : settings?.leftSignerTitle || "KEPALA KEJAKSAAN NEGERI TABANAN";

  const effectiveLeftSignerName =
    currentLock?.isLocked && currentLock.leftSignerName
      ? currentLock.leftSignerName
      : settings?.leftSignerName || "";

  const effectiveLeftSignerPangkatNip =
    currentLock?.isLocked && currentLock.leftSignerPangkatNip
      ? currentLock.leftSignerPangkatNip
      : settings?.leftSignerPangkatNip || "";

  const effectiveRightSignerTitle =
    currentLock?.isLocked && currentLock.rightSignerTitle
      ? currentLock.rightSignerTitle
      : settings?.rightSignerTitle || "KEPALA SEKSI INTELIJEN";

  const effectiveRightSignerName =
    currentLock?.isLocked && currentLock.rightSignerName
      ? currentLock.rightSignerName
      : settings?.rightSignerName || "";

  const effectiveRightSignerPangkatNip =
    currentLock?.isLocked && currentLock.rightSignerPangkatNip
      ? currentLock.rightSignerPangkatNip
      : settings?.rightSignerPangkatNip || "";

  const effectiveSignatureAlignment =
    currentLock?.isLocked && currentLock.signatureAlignment
      ? currentLock.signatureAlignment
      : settings?.signatureAlignment || "split";

  const effectiveTempatDokumen =
    currentLock?.isLocked && currentLock.tempatDokumen
      ? currentLock.tempatDokumen
      : settings?.tempatDokumen || "Tabanan";

  const officerMap = new Map<number, Officer>();

  officers.forEach((officer) => {
    officerMap.set(officer.id, officer);
  });

  const formatOfficerValue = (value: any) => {
    if (!value) {
      return <span className="text-slate-400">-</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-slate-400">-</span>;
      }

      return (
        <div className="flex flex-col gap-1 text-left">
          {value.map((id, idx) => {
            const officer = officerMap.get(Number(id));
            const name = officer
              ? officer.nama
              : typeof id === "string" && isNaN(Number(id))
              ? id
              : `Petugas #${id}`;

            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-950"
              >
                {value.length > 1 && (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-700 text-[9px] font-bold text-white shrink-0">
                    {idx + 1}
                  </span>
                )}
                <span>{name}</span>
              </span>
            );
          })}
        </div>
      );
    }

    if (typeof value === "number") {
      const officer = officerMap.get(value);

      return officer ? (
        <span className="inline-flex items-center rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-900">
          {officer.nama}
        </span>
      ) : (
        String(value)
      );
    }

    return String(value);
  };

  /*
   * Hanya dipakai pada tabel preview aplikasi R.IN.6.
   * Kelas print:hidden menghilangkan badge saat halaman dicetak oleh browser.
   */
  const renderStorageCodePreview = (value: unknown) => {
    const kode = String(value || "").trim();

    if (!kode || kode === "-") {
      return <span className="text-slate-400">-</span>;
    }

    const asal = storageCodeMap.get(kode) || "";

    return (
      <div className="print:hidden flex min-w-[150px] flex-col gap-1">
        <span className="inline-flex w-fit items-center rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-900">
          {kode}
        </span>

        {asal && (
          <span className="inline-flex w-fit items-center rounded border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-sky-900">
            {asal}
          </span>
        )}
      </div>
    );
  };

  const handleOpenNew = () => {
    setEditingEntry(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (entry: RegisterEntryRow) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) {
      return;
    }

    try {
      setIsDeleting(true);
      await onDeleteEntry(entryToDelete.id);
      setEntryToDelete(null);
      onReload();
    } catch (error) {
      console.error("Error deleting entry:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredEntryIds = filteredEntries.map((entry) => entry.id);
  const isAllSelected =
    filteredEntries.length > 0 &&
    filteredEntries.every((entry) => selectedEntryIds.includes(entry.id));
  const isSomeSelected =
    selectedEntryIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedEntryIds((prev) =>
        prev.filter((id) => !filteredEntryIds.includes(id)),
      );
    } else {
      setSelectedEntryIds((prev) =>
        Array.from(new Set([...prev, ...filteredEntryIds])),
      );
    }
  };

  const handleToggleSelectEntry = (id: number) => {
    setSelectedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedEntryIds.length === 0) {
      return;
    }

    try {
      setIsBatchDeleting(true);
      if (onBatchDeleteEntries) {
        await onBatchDeleteEntries(selectedEntryIds);
      } else {
        for (const id of selectedEntryIds) {
          await onDeleteEntry(id);
        }
      }
      setSelectedEntryIds([]);
      setIsBatchDeleteModalOpen(false);
      onReload();
    } catch (error) {
      console.error("Error batch deleting entries:", error);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleGeneratePdf = () => {
    return generateRegisterPdf({
      register,
      entries: filteredEntries,
      settings,
      officers,
      tahunTakwim: selectedYear,
      selectedMonth,
      customClosingDate: activeClosingDate,
      orientationOverride: currentOrientation,
      lockSnapshot: currentLock,
      categoryFilter:
        register.code === "R.IN.3" && rin3CategoryFilter !== "all"
          ? rin3CategoryFilter
          : undefined,
    });
  };

  const handleDownloadPdf = () => {
    const document = handleGeneratePdf();

    const periodSlug =
      typeof selectedMonth === "number"
        ? `_${MONTH_NAMES_ID[selectedMonth - 1]}_${selectedYear}`
        : `_${selectedYear}`;

    const catSlug =
      register.code === "R.IN.3" && rin3CategoryFilter !== "all"
        ? `_${rin3CategoryFilter.split(",")[0].replace(/\s+/g, "_").slice(0, 15)}`
        : "";

    const filename = `${register.code}${periodSlug}${catSlug}_${register.title
      .replace(/[\/\s,]+/g, "_")
      .slice(0, 35)}.pdf`;

    document.save(filename);
  };

  const handlePreviewPdf = () => {
    const document = handleGeneratePdf();
    setGeneratedPdf(document);
    setIsPreviewOpen(true);
  };

  const handleStartEditClosingDate = () => {
    setTempClosingDate(activeClosingDate);
    setIsEditingClosingDate(true);
  };

  const handleSaveClosingDate = async () => {
    if (!onUpdateSettings || typeof selectedMonth !== "number") {
      return;
    }

    try {
      setIsSavingClosingDate(true);

      const monthKey = `${selectedYear}-${String(selectedMonth).padStart(
        2,
        "0",
      )}`;

      const newClosingDates = {
        ...(settings.closingDates || {}),
        [monthKey]: tempClosingDate,
      };

      await onUpdateSettings({
        closingDates: newClosingDates,
      });

      setIsEditingClosingDate(false);
    } catch (error) {
      console.error("Gagal memperbarui tanggal penutupan:", error);
    } finally {
      setIsSavingClosingDate(false);
    }
  };

  const nextNomorUrut =
    filteredEntries.length > 0
      ? Math.max(...filteredEntries.map((entry) => entry.nomorUrut || 0)) + 1
      : 1;

  const currentPeriodLabel =
    typeof selectedMonth === "number"
      ? `Bulan ${MONTH_NAMES_ID[selectedMonth - 1]} ${selectedYear}`
      : `Tahun ${selectedYear} (Semua Bulan)`;

  // Mendapatkan daftar kolom datar (termasuk subColumns) untuk rendering border baris
  const flattenedColumns = register.columns.flatMap((col) =>
    col.subColumns && col.subColumns.length > 0 ? col.subColumns : [col],
  );

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col justify-between gap-2.5 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
              <Calendar className="h-3.5 w-3.5 text-emerald-700" />
              <span>Tahun:</span>

              <select
                value={selectedYear}
                onChange={(event) =>
                  setSelectedYear(Number.parseInt(event.target.value, 10))
                }
                className="cursor-pointer bg-transparent font-bold text-emerald-800 outline-none"
              >
                {(settings.availableYears &&
                  settings.availableYears.length > 0
                  ? settings.availableYears
                  : [2024, 2025, 2026, 2027, 2028]
                ).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
              Periode Aktif: {currentPeriodLabel}
            </span>
          </div>

          {typeof selectedMonth === "number" && (
            <div className="flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-900">
              <Clock className="h-3.5 w-3.5 shrink-0 text-amber-700" />

              {!isEditingClosingDate ? (
                <div className="flex items-center gap-2">
                  <span>
                    Tutup Register:{" "}
                    <strong className="font-semibold">
                      {activeClosingDateWithDay}
                    </strong>
                  </span>

                  {onUpdateSettings && (
                    <button
                      type="button"
                      onClick={handleStartEditClosingDate}
                      className="cursor-pointer text-[10px] font-bold text-amber-800 underline hover:text-emerald-700"
                    >
                      Ubah Tanggal Tutup
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]">Tgl Tutup:</span>

                  <input
                    type="date"
                    value={tempClosingDate}
                    onChange={(event) =>
                      setTempClosingDate(event.target.value)
                    }
                    className="rounded border border-amber-400 bg-white px-1.5 py-0.5 font-mono text-xs"
                  />

                  <button
                    type="button"
                    onClick={handleSaveClosingDate}
                    disabled={isSavingClosingDate}
                    className="flex items-center gap-1 rounded bg-emerald-700 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-emerald-800"
                  >
                    <Save className="h-3 w-3" />
                    <span>{isSavingClosingDate ? "..." : "Simpan"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditingClosingDate(false)}
                    className="px-1.5 py-0.5 text-[11px] text-slate-600 hover:text-slate-800"
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedMonth("all")}
            className={`cursor-pointer whitespace-nowrap rounded px-2.5 py-1 text-xs font-semibold transition ${selectedMonth === "all"
                ? "bg-slate-800 font-bold text-white shadow-sm"
                : "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
          >
            Semua Bulan ({entries.length})
          </button>

          {MONTH_NAMES_ID.map((name, index) => {
            const monthNumber = index + 1;
            const isSelected = selectedMonth === monthNumber;

            const count = filterEntriesByPeriod(
              entries,
              selectedYear,
              monthNumber,
            ).length;

            return (
              <button
                key={monthNumber}
                type="button"
                onClick={() => {
                  setSelectedMonth(monthNumber);
                  setIsEditingClosingDate(false);
                }}
                className={`flex cursor-pointer items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-xs transition ${isSelected
                    ? "bg-emerald-700 font-bold text-white shadow-sm"
                    : "border border-slate-200 bg-slate-100 font-medium text-slate-700 hover:bg-slate-200"
                  }`}
              >
                <span>{MONTH_SHORT_ID[index]}</span>

                {count > 0 && (
                  <span
                    className={`rounded-full px-1 py-0.5 font-mono text-[9px] font-bold ${isSelected
                        ? "bg-white text-emerald-800"
                        : "bg-emerald-100 text-emerald-800"
                      }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-emerald-700 px-2 py-0.5 font-mono text-xs font-bold text-white">
              {register.code}
            </span>

            <span
              className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${register.orientation === "landscape"
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-blue-300 bg-blue-50 text-blue-800"
                }`}
            >
              Format {register.orientation} (A4)
            </span>

            <span className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900">
              Periode Bulanan: {currentPeriodLabel}
            </span>

            <span className="font-mono text-[11px] text-slate-500">
              • {filteredEntries.length} baris data pada periode ini (
              {entries.length} total tahunan)
            </span>
          </div>

          <h2 className="font-serif text-sm font-bold leading-snug text-slate-900 sm:text-base">
            {register.title}
          </h2>

          {register.subtitle && (
            <p className="text-[11px] font-medium text-slate-600">
              {register.subtitle}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            id="btn-toggle-orientation"
            type="button"
            onClick={() =>
              setCurrentOrientation((previous) =>
                previous === "landscape" ? "portrait" : "landscape",
              )
            }
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-bold shadow-sm transition ${currentOrientation === "landscape"
                ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                : "border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100"
              }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>
              Format:{" "}
              {currentOrientation === "landscape"
                ? "Landscape"
                : "Portrait"}
            </span>
          </button>

          <button
            id="btn-add-entry-row"
            type="button"
            onClick={handleOpenNew}
            disabled={Boolean(currentLock?.isLocked)}
            title={
              currentLock?.isLocked
                ? "Register terkunci (Tutup Buku). Dokumen tidak dapat ditambah baris baru."
                : "Tambah baris data baru"
            }
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold shadow-sm transition ${
              currentLock?.isLocked
                ? "cursor-not-allowed bg-slate-200 text-slate-400 border border-slate-300"
                : "cursor-pointer bg-emerald-700 text-white hover:bg-emerald-800"
            }`}
          >
            {currentLock?.isLocked ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : <Plus className="h-3.5 w-3.5" />}
            <span>Tambah Baris</span>
          </button>

          {register.code === "R.IN.6" && (
            <button
              id="btn-manage-storage-codes"
              type="button"
              onClick={() => setIsStorageCodesOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100"
            >
              <FolderArchive className="h-3.5 w-3.5 text-amber-700" />
              <span>Kode Penyimpanan</span>
            </button>
          )}

          {/* Tombol Kunci Register */}
          <button
            id="btn-lock-register-status"
            type="button"
            onClick={() => setIsLockModalOpen(true)}
            title={
              currentLock?.isLocked
                ? "Register terkunci. Seluruh data entri dan penandatangan dibekukan."
                : "Kunci data penandatangan untuk periode ini agar tidak berubah bila setting di masa depan diganti."
            }
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-bold shadow-sm transition ${
              currentLock?.isLocked
                ? "border-amber-400 bg-amber-100/90 text-amber-950 hover:bg-amber-200"
                : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            {currentLock?.isLocked ? (
              <>
                <Lock className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                <span>Status: Terkunci</span>
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>Kunci Register</span>
              </>
            )}
          </button>

          <button
            id="btn-import-csv"
            type="button"
            onClick={() => setIsImportCsvOpen(true)}
            disabled={Boolean(currentLock?.isLocked)}
            title={
              currentLock?.isLocked
                ? "Register terkunci. Impor CSV dinonaktifkan."
                : "Impor CSV"
            }
            className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition ${
              currentLock?.isLocked
                ? "cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200"
                : "cursor-pointer border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            <Upload className="h-3.5 w-3.5 text-emerald-700" />
            <span>Impor CSV</span>
          </button>

          <button
            id="btn-preview-pdf"
            type="button"
            onClick={handlePreviewPdf}
            className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5 text-slate-600" />
            <span>Pratinjau PDF</span>
          </button>

          <button
            id="btn-download-pdf-direct"
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm transition hover:bg-amber-500"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Unduh PDF Periode</span>
          </button>

          {selectedEntryIds.length > 0 && !currentLock?.isLocked && (
            <button
              id="btn-multi-delete-toolbar"
              type="button"
              onClick={() => setIsBatchDeleteModalOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Hapus ({selectedEntryIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Kategori Khusus R.IN.3 */}
      {register.code === "R.IN.3" && (
        <div className="rounded-lg border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-3 shadow-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-1.5">
            <div className="flex items-center gap-2 text-emerald-950">
              <Filter className="h-4 w-4 text-emerald-700" />
              <span className="text-xs font-bold uppercase tracking-wide">
                Filter Bidang Intelijen (Khusus R.IN.3)
              </span>
            </div>
            <span className="text-[11px] font-medium text-emerald-800">
              Menampilkan {filteredEntries.length} dari {periodEntries.length} baris periode ini
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <button
              type="button"
              id="filter-rin3-all"
              onClick={() => setRin3CategoryFilter("all")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                rin3CategoryFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs font-bold"
                  : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>Semua Bidang</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                  rin3CategoryFilter === "all" ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-800"
                }`}
              >
                {rin3CategoryCounts["all"] || 0}
              </span>
            </button>

            {RIN3_CATEGORIES.map((cat, idx) => {
              const isSelected = rin3CategoryFilter === cat;
              const count = rin3CategoryCounts[cat] || 0;
              return (
                <button
                  key={cat}
                  type="button"
                  id={`filter-rin3-cat-${idx}`}
                  onClick={() => setRin3CategoryFilter(cat)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition cursor-pointer ${
                    isSelected
                      ? "bg-emerald-700 text-white shadow-xs font-bold"
                      : "bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100/70"
                  }`}
                >
                  <span>{cat}</span>
                  {count > 0 ? (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                        isSelected ? "bg-white text-emerald-900" : "bg-emerald-200 text-emerald-950"
                      }`}
                    >
                      {count}
                    </span>
                  ) : (
                    <span className="text-[10px] opacity-60">(0)</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-300 bg-white p-4 font-sans shadow-sm sm:p-6">
        <div className="relative mb-4 rounded-sm border border-slate-900 p-3">
          <div className="absolute right-2.5 top-2 flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800">
            {currentLock?.isLocked && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-200 border border-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                <Lock className="w-3 h-3 text-amber-800" />
                Terkunci
              </span>
            )}
            <span>{register.code}</span>
          </div>

          <div className="mb-1 text-left text-[11px] font-bold uppercase text-slate-900">
            {settings.kejaksaanName}*)
          </div>

          <div className="my-2 text-center">
            <h1 className="font-serif text-xs font-bold uppercase tracking-wide text-slate-900 sm:text-sm">
              {register.title}
            </h1>

            {register.subtitle && (
              <p className="mt-0.5 text-[11px] font-semibold uppercase text-slate-700">
                {register.subtitle}
              </p>
            )}

            {register.code === "R.IN.3" && rin3CategoryFilter !== "all" && (
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-950 bg-emerald-100/90 px-3 py-0.5 rounded border border-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  BIDANG: {rin3CategoryFilter}
                </span>
              </div>
            )}

            <p className="mt-1 text-[11px] font-bold uppercase text-emerald-800">
              PERIODE:{" "}
              {typeof selectedMonth === "number"
                ? `BULAN ${MONTH_NAMES_ID[
                  selectedMonth - 1
                ].toUpperCase()}`
                : "SEMUA BULAN"}{" "}
              - TAHUN {selectedYear}
            </p>
          </div>
        </div>

        {/* BARIS AKSI HAPUS MASSAL (MULTI DELETE) */}
        {selectedEntryIds.length > 0 && (
          <div
            id="multi-delete-action-bar"
            className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-red-300 bg-red-50/95 px-3.5 py-2.5 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex h-6 items-center justify-center rounded-full bg-red-600 px-2.5 text-[11px] font-bold text-white shadow-xs">
                {selectedEntryIds.length} Terpilih
              </span>
              <span className="font-semibold text-red-950">
                Data baris siap dihapus sekaligus
              </span>
              <span className="text-red-300">|</span>
              <button
                type="button"
                id="btn-select-all-current"
                onClick={() => setSelectedEntryIds(filteredEntryIds)}
                className="cursor-pointer font-bold text-red-700 underline hover:text-red-900"
              >
                Pilih Semua Periode Ini ({filteredEntries.length})
              </button>
              <button
                type="button"
                id="btn-clear-selection"
                onClick={() => setSelectedEntryIds([])}
                className="cursor-pointer font-medium text-slate-600 underline hover:text-slate-900"
              >
                Batalkan Pilihan
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-trigger-multi-delete-modal"
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hapus {selectedEntryIds.length} Data Terpilih</span>
              </button>
            </div>
          </div>
        )}

        {/* CONTAINER TABEL RELATIVE */}
        <div className="relative overflow-x-auto rounded-sm border border-slate-900">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-100 text-center text-[10px] font-bold text-slate-900">
                <th
                  rowSpan={
                    register.columns.some((item) => item.subColumns) ? 2 : 1
                  }
                  className="w-10 border-r border-slate-900 bg-slate-200/80 px-1 py-1.5 text-center"
                >
                  <div className="flex items-center justify-center">
                    <input
                      id="checkbox-select-all-header"
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = isSomeSelected;
                        }
                      }}
                      onChange={handleToggleSelectAll}
                      title={
                        isAllSelected
                          ? "Batalkan pilihan semua"
                          : "Pilih semua baris yang tampil"
                      }
                      className="h-3.5 w-3.5 cursor-pointer rounded border-slate-400 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                    />
                  </div>
                </th>

                {register.columns.map((column) => {
                  if (
                    column.subColumns &&
                    column.subColumns.length > 0
                  ) {
                    return (
                      <th
                        key={column.key}
                        colSpan={column.subColumns.length}
                        className="border-r border-slate-900 bg-slate-200/70 px-2 py-1.5 uppercase"
                      >
                        {column.label}
                      </th>
                    );
                  }

                  return (
                    <th
                      key={column.key}
                      rowSpan={
                        register.columns.some((item) => item.subColumns)
                          ? 2
                          : 1
                      }
                      className="border-r border-slate-900 px-2 py-1.5 uppercase"
                    >
                      {column.label}
                    </th>
                  );
                })}

                <th
                  rowSpan={
                    register.columns.some((column) => column.subColumns)
                      ? 2
                      : 1
                  }
                  className="w-16 bg-slate-200/80 px-2 py-1.5 text-center uppercase"
                >
                  AKSI
                </th>
              </tr>

              {register.columns.some((column) => column.subColumns) && (
                <tr className="border-b border-slate-900 bg-slate-100 text-center text-[9px] font-bold text-slate-900">
                  {register.columns
                    .filter(
                      (column) =>
                        column.subColumns &&
                        column.subColumns.length > 0,
                    )
                    .flatMap((column) => column.subColumns || [])
                    .map((subColumn) => (
                      <th
                        key={subColumn.key}
                        className="border-r border-slate-900 px-1.5 py-1 uppercase"
                      >
                        {subColumn.label}
                      </th>
                    ))}
                </tr>
              )}

              <tr className="border-b border-slate-900 bg-slate-200/90 text-center font-mono text-[9px] font-bold text-slate-800">
                <th className="border-r border-slate-900 px-1 py-0.5 text-center font-sans text-[8px] font-bold text-slate-600">
                  PILIH
                </th>
                {register.columns.map((column) => {
                  if (
                    column.subColumns &&
                    column.subColumns.length > 0
                  ) {
                    return column.subColumns.map((subColumn) => (
                      <th
                        key={subColumn.key}
                        className="border-r border-slate-900 px-1 py-0.5"
                      >
                        {subColumn.colNumber}
                      </th>
                    ));
                  }

                  return (
                    <th
                      key={column.key}
                      className="border-r border-slate-900 px-1 py-0.5"
                    >
                      {column.colNumber}
                    </th>
                  );
                })}

                <th className="px-1 py-0.5 font-normal text-slate-500">
                  Edit
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-900">
              {filteredEntries.length === 0 ? (
                /* 10 Baris Kosong Bergaris/Border */
                Array.from({ length: 10 }).map((_, rowIndex) => (
                  <tr
                    key={`empty-row-${rowIndex}`}
                    className="h-10 hover:bg-slate-50/40"
                  >
                    <td
                      key={`empty-col-check-${rowIndex}`}
                      className="w-10 border-r border-slate-900 bg-slate-50/20 px-1 py-1.5 text-center"
                    >
                      &nbsp;
                    </td>
                    {flattenedColumns.map((col, colIdx) => (
                      <td
                        key={`empty-col-${colIdx}`}
                        className="border-r border-slate-900 px-2 py-1.5 text-center"
                      >
                        &nbsp;
                      </td>
                    ))}
                    <td className="w-16 bg-slate-50/20 px-1 py-1.5 text-center">
                      &nbsp;
                    </td>
                  </tr>
                ))
              ) : (
                filteredEntries.map((entry, index) => {
                  const data = entry.data || {};
                  const isSelected = selectedEntryIds.includes(entry.id);

                  return (
                    <tr
                      key={entry.id}
                      className={`transition ${
                        isSelected
                          ? "bg-amber-100/70 hover:bg-amber-100"
                          : "hover:bg-amber-50/50"
                      }`}
                    >
                      <td className="w-10 border-r border-slate-900 bg-slate-50/40 px-1 py-1.5 text-center align-middle">
                        <div className="flex items-center justify-center">
                          <input
                            id={`check-entry-${entry.id}`}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectEntry(entry.id)}
                            aria-label={`Pilih baris nomor ${entry.nomorUrut}`}
                            className="h-3.5 w-3.5 cursor-pointer rounded border-slate-400 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                          />
                        </div>
                      </td>
                      {register.columns.map((column) => {
                        if (
                          column.subColumns &&
                          column.subColumns.length > 0
                        ) {
                          return column.subColumns.map((subColumn) => (
                            <td
                              key={subColumn.key}
                              className="whitespace-pre-wrap border-r border-slate-900 px-2 py-1.5 align-top text-xs text-slate-900"
                            >
                              {subColumn.type === "officer_multi" ||
                                subColumn.type === "officer_single"
                                ? formatOfficerValue(data[subColumn.key])
                                : data[subColumn.key] || "-"}
                            </td>
                          ));
                        }

                        if (column.key === "no") {
                          return (
                            <td
                              key={column.key}
                              className="border-r border-slate-900 px-1.5 py-1.5 align-top text-center font-mono font-bold text-slate-900"
                            >
                              {entry.nomorUrut || index + 1}
                            </td>
                          );
                        }

                        return (
                          <td
                            key={column.key}
                            className="whitespace-pre-wrap border-r border-slate-900 px-2 py-1.5 align-top text-xs text-slate-900"
                          >
                            {column.type === "officer_multi" ||
                              column.type === "officer_single"
                              ? formatOfficerValue(data[column.key])
                              : register.code === "R.IN.6" &&
                                column.key === "kode_penyimpanan"
                                ? renderStorageCodePreview(
                                  data[column.key],
                                )
                                : data[column.key] || "-"}
                          </td>
                        );
                      })}

                      <td className="bg-slate-50/60 px-1 py-1.5 text-center align-top">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            id={`btn-edit-row-${entry.id}`}
                            type="button"
                            onClick={() => handleOpenEdit(entry)}
                            title="Edit Data Baris"
                            className="cursor-pointer rounded p-1 text-slate-500 transition hover:bg-emerald-100 hover:text-emerald-700"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            id={`btn-delete-row-${entry.id}`}
                            type="button"
                            onClick={() => setEntryToDelete(entry)}
                            title="Hapus Data Baris"
                            className="cursor-pointer rounded p-1 text-slate-500 transition hover:bg-red-100 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* OVERLAY TEKS NIHIL 60PT - PRESISI DI TENGAH 10 BARIS & TETAP DI TENGAH VIEWPORT SAAT SCROLL */}
          {filteredEntries.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[68px] flex flex-col items-center justify-center">
              <div className="sticky left-0 flex w-full flex-col items-center justify-center px-4">
                <span
                  className="select-none font-serif font-black tracking-[0.45em] pl-[0.45em] text-slate-400/80 leading-none text-center drop-shadow-xs"
                  style={{ fontSize: "60pt" }}
                >
                  NIHIL
                </span>

                <button
                  type="button"
                  onClick={handleOpenNew}
                  className="pointer-events-auto mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded border border-dashed border-emerald-600 bg-white/95 px-3.5 py-1.5 text-xs font-bold text-emerald-700 shadow-sm backdrop-blur-xs transition hover:bg-emerald-50 hover:border-emerald-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Input Baris Baru</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 rounded border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-800">
          <p className="text-[11px] font-semibold italic leading-relaxed">
            Catatan Penutupan: Pada hari ini{" "}
            <strong>{activeClosingDateWithDay}</strong>, Buku Register{" "}
            {register.code} ({register.title}) periode {currentPeriodLabel} ini
            ditutup dengan{" "}
            <strong>{filteredEntries.length} baris data register</strong>.
          </p>
        </div>

        {register.hasRekapitulasi && register.rekapitulasiFields && (
          <div className="mt-4 max-w-sm rounded border border-slate-300 bg-slate-50 p-3 text-xs">
            <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-900">
              Rekapitulasi Dokumen Register ({currentPeriodLabel}):
            </h4>

            <div className="space-y-1 text-slate-700">
              {register.rekapitulasiFields.map((field, index) => {
                const count = filteredEntries.filter((entry) => {
                  const value =
                    entry.data?.[field.key] || entry.data?.jenis_produk;

                  return (
                    value !== undefined &&
                    value !== "" &&
                    value !== null
                  );
                }).length;

                return (
                  <div
                    key={field.key}
                    className="flex items-center justify-between border-b border-slate-200/60 pb-0.5 text-[11px]"
                  >
                    <span>
                      {index + 1}. {field.label}
                    </span>

                    <span className="font-mono font-bold text-slate-900">
                      : {count} {field.suffix || ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-slate-300 pt-4">
          {currentLock?.isLocked && (
            <div className="mb-4 flex items-center justify-center gap-1.5 rounded border border-amber-300 bg-amber-50 py-1.5 px-3 text-xs font-semibold text-amber-950">
              <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>
                Penandatangan Dokumen Terkunci (Snapshot Periode {currentPeriodLabel}) — Perubahan pada menu Pengaturan tidak akan mengubah penandatangan periode ini kecuali dibuka kuncinya.
              </span>
            </div>
          )}

          {effectiveSignatureAlignment === "center" ? (
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 text-center text-xs sm:grid-cols-2">
              <div className="flex flex-col items-center space-y-0.5">
                <p className="text-[11px] text-slate-600">Mengetahui:</p>

                <p className="text-xs font-bold uppercase text-slate-900">
                  {effectiveLeftSignerTitle
                    .replace("Mengetahui:\n", "")
                    .replace("Mengetahui:", "")}
                </p>

                {/*
                  Gambar tanda tangan elektronik dengan jarak tetap ~8px
                  (my-2) di atas dan bawah terhadap teks jabatan & nama.
                */}
                <img
                  src={ESIGN_DATA_URL}
                  alt="Tanda tangan elektronik"
                  className="h-24 max-w-[180px] object-contain my-2"
                />

                <div className="flex items-end justify-center">
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-900 underline">
                      {effectiveLeftSignerName}
                    </p>

                    <p className="text-[10px] text-slate-600">
                      {effectiveLeftSignerPangkatNip}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-0.5">
                <p className="text-[11px] text-slate-600">
                  {effectiveTempatDokumen},{" "}
                  <strong className="font-semibold text-slate-900">
                    {activeClosingDateFormatted}
                  </strong>
                </p>

                <p className="text-xs font-bold uppercase text-slate-900">
                  {effectiveRightSignerTitle}
                </p>

                <img
                  src={ESIGN_DATA_URL}
                  alt="Tanda tangan elektronik"
                  className="h-24 max-w-[180px] object-contain my-2"
                />

                <div className="flex items-end justify-center">
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-900 underline">
                      {effectiveRightSignerName}
                    </p>

                    <p className="text-[10px] text-slate-600">
                      {effectiveRightSignerPangkatNip}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start justify-between gap-6 text-xs sm:flex-row">
              <div className="w-full space-y-0.5 sm:w-60">
                <p className="text-[11px] text-slate-600">Mengetahui:</p>

                <p className="text-xs font-bold uppercase text-slate-900">
                  {effectiveLeftSignerTitle
                    .replace("Mengetahui:\n", "")
                    .replace("Mengetahui:", "")}
                </p>

                <img
                  src={ESIGN_DATA_URL}
                  alt="Tanda tangan elektronik"
                  className="h-20 max-w-[160px] object-contain my-2"
                />

                <div className="flex items-end">
                  <div className="w-full">
                    <p className="text-xs font-bold text-slate-900 underline">
                      {effectiveLeftSignerName}
                    </p>

                    <p className="text-[10px] text-slate-600">
                      {effectiveLeftSignerPangkatNip}
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full space-y-0.5 text-left sm:w-60 sm:text-right">
                <p className="text-[11px] text-slate-600">
                  {effectiveTempatDokumen},{" "}
                  <strong className="font-semibold text-slate-900">
                    {activeClosingDateFormatted}
                  </strong>
                </p>

                <p className="text-xs font-bold uppercase text-slate-900">
                  {effectiveRightSignerTitle}
                </p>

                <img
                  src={ESIGN_DATA_URL}
                  alt="Tanda tangan elektronik"
                  className="ml-auto h-20 max-w-[160px] object-contain my-2"
                />

                <div className="flex items-end justify-start sm:justify-end">
                  <div>
                    <p className="text-xs font-bold text-slate-900 underline">
                      {effectiveRightSignerName}
                    </p>

                    <p className="text-[10px] text-slate-600">
                      {effectiveRightSignerPangkatNip}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col items-center justify-between gap-1 border-t border-slate-200 pt-1.5 text-[10px] italic text-slate-400 sm:flex-row">
            <span>
              {register.notes ||
                "*) Kejaksaan ditulis hanya di sampul depan."}
            </span>

            <span className="font-medium text-emerald-700">
              ✓ Multi-halaman: Tanda tangan otomatis ditempatkan di halaman
              terakhir PDF
            </span>
          </div>
        </div>
      </div>

      <EntryFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={async (entryData) => {
          await onSaveEntry(entryData);
          onReload();
        }}
        register={register}
        initialEntry={editingEntry}
        officers={officers}
        nextNomorUrut={nextNomorUrut}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
      />

      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-3 text-red-600">
              <div className="rounded-full bg-red-100 p-2">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>

              <h3 className="text-sm font-bold text-slate-900">
                Konfirmasi Hapus Data Baris
              </h3>
            </div>

            <p className="mb-4 text-xs leading-relaxed text-slate-600">
              Apakah Anda yakin ingin menghapus data baris{" "}
              <strong className="text-slate-900">
                Nomor {entryToDelete.nomorUrut}
              </strong>{" "}
              dari buku register{" "}
              <strong className="text-emerald-800">{register.code}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                disabled={isDeleting}
                className="cursor-pointer rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Batal
              </button>

              <button
                id="btn-confirm-delete-entry"
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Data"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI MULTI DELETE (HAPUS MASSAL) */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <Trash2 className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Konfirmasi Hapus Massal ({selectedEntryIds.length} Data)
                </h3>
                <p className="text-[11px] font-semibold uppercase text-red-600">
                  Buku Register {register.code}
                </p>
              </div>
            </div>

            <p className="mb-3 text-xs leading-relaxed text-slate-600">
              Apakah Anda yakin ingin menghapus sekaligus{" "}
              <strong className="text-slate-900">
                {selectedEntryIds.length} baris data
              </strong>{" "}
              yang dipilih dari buku register{" "}
              <strong className="text-emerald-800">{register.code}</strong>?
            </p>

            <div className="mb-3 max-h-28 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-700">
              <span className="font-bold text-slate-800">Nomor baris terpilih: </span>
              {filteredEntries
                .filter((e) => selectedEntryIds.includes(e.id))
                .map((e) => `No. ${e.nomorUrut || "-"}`)
                .join(", ") || `${selectedEntryIds.length} baris data`}
            </div>

            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <span>
                Tindakan ini tidak dapat dibatalkan. Semua data yang terpilih akan dihapus permanen dari sistem.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                disabled={isBatchDeleting}
                className="cursor-pointer rounded-lg bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Batal
              </button>

              <button
                id="btn-confirm-batch-delete"
                type="button"
                onClick={handleConfirmBatchDelete}
                disabled={isBatchDeleting}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBatchDeleting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Menghapus {selectedEntryIds.length} Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Ya, Hapus {selectedEntryIds.length} Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdfDoc={generatedPdf}
        filename={`${register.code}_${typeof selectedMonth === "number"
            ? MONTH_NAMES_ID[selectedMonth - 1]
            : "Semua"
          }_${selectedYear}.pdf`}
      />

      <ImportCsvModal
        isOpen={isImportCsvOpen}
        onClose={() => setIsImportCsvOpen(false)}
        register={register}
        onSuccess={onReload}
      />

      {isStorageCodesOpen && (
        <StorageCodesModal
          isOpen={isStorageCodesOpen}
          onClose={() => setIsStorageCodesOpen(false)}
        />
      )}

      <LockRegisterModal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        register={register}
        periodKey={currentPeriodKey}
        periodLabel={currentPeriodLabel}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        defaultClosingDate={activeClosingDate}
        currentSettings={settings}
        currentLock={currentLock}
        onLockSaved={(updatedLock) => {
          setCurrentLock(updatedLock);
        }}
      />
    </div>
  );
};
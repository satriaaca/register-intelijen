import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Check, Download, Eye, Layers, Lock, X } from "lucide-react";
import { RegisterDefinition, RegisterLock } from "../types.js";
import { MONTH_NAMES_ID, MONTH_SHORT_ID } from "../lib/date-utils.js";
import { authFetch } from "../lib/api.js";

interface BatchMonthPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  register: RegisterDefinition;
  selectedYear: number;
  initialMonth?: number | "all";
  monthCounts: Record<number, number>;
  isGenerating?: boolean;
  errorMessage?: string | null;
  onGenerate: (
    selectedMonths: number[],
    mode: "download" | "preview",
    locksByPeriod: Map<string, RegisterLock>
  ) => Promise<void>;
}

export const BatchMonthPdfModal: React.FC<BatchMonthPdfModalProps> = ({
  isOpen,
  onClose,
  register,
  selectedYear,
  initialMonth,
  monthCounts,
  isGenerating = false,
  errorMessage = null,
  onGenerate,
}) => {
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [locksByPeriod, setLocksByPeriod] = useState<Map<string, RegisterLock>>(new Map());
  const [isLoadingLocks, setIsLoadingLocks] = useState(false);

  // Inisialisasi pilihan bulan saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;

    const nonEmptyMonths = Array.from({ length: 12 }, (_, idx) => idx + 1).filter(
      (m) => (monthCounts[m] || 0) > 0
    );

    if (nonEmptyMonths.length > 0) {
      setSelectedMonths(nonEmptyMonths);
    } else if (typeof initialMonth === "number") {
      setSelectedMonths([initialMonth]);
    } else {
      setSelectedMonths([1, 2, 3]);
    }

    // Ambil seluruh data kunci register untuk buku register ini
    let cancelled = false;
    setIsLoadingLocks(true);
    void authFetch(`/api/register-locks?registerCode=${encodeURIComponent(register.code)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list: RegisterLock[]) => {
        if (cancelled || !Array.isArray(list)) return;
        const map = new Map<string, RegisterLock>();
        list.forEach((lock) => {
          if (lock?.periodKey && lock.isLocked) {
            map.set(lock.periodKey, lock);
          }
        });
        setLocksByPeriod(map);
      })
      .catch(() => {
        if (!cancelled) setLocksByPeriod(new Map());
      })
      .finally(() => {
        if (!cancelled) setIsLoadingLocks(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, register.code, selectedYear]); // intentionally keep initial selection fresh when modal opens

  const sortedSelectedMonths = useMemo(
    () =>
      Array.from(new Set<number>(selectedMonths))
        .filter((m) => m >= 1 && m <= 12)
        .sort((a, b) => a - b),
    [selectedMonths]
  );

  const totalSelectedEntries = useMemo(
    () => sortedSelectedMonths.reduce((sum, m) => sum + (monthCounts[m] || 0), 0),
    [sortedSelectedMonths, monthCounts]
  );

  if (!isOpen) return null;

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
  };

  const applyPreset = (months: number[]) => {
    setSelectedMonths([...months].sort((a, b) => a - b));
  };

  const selectNonEmptyMonths = () => {
    const nonEmpty = Array.from({ length: 12 }, (_, idx) => idx + 1).filter(
      (m) => (monthCounts[m] || 0) > 0
    );
    setSelectedMonths(nonEmpty);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-200 bg-emerald-50/70 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-xs">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight text-emerald-950 sm:text-sm">
                <span>Unduh PDF Gabungan Multi-Bulan</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-white">
                  {register.code}
                </span>
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-600">
                Tahun Takwim <strong className="text-slate-900">{selectedYear}</strong> — Digabung menjadi 1 file terurut dari Januari dst.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="cursor-pointer rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3.5 overflow-y-auto p-4">
          {errorMessage && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
              {errorMessage}
            </div>
          )}

          {/* Tombol Pilihan Cepat */}
          <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
                Pilihan Cepat Periode Bulan
              </span>
              <span className="text-[11px] font-semibold text-emerald-800">
                {sortedSelectedMonths.length} bulan dipilih
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}
                className="cursor-pointer rounded border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-50"
              >
                Semua (Jan–Des)
              </button>
              <button
                type="button"
                onClick={selectNonEmptyMonths}
                className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Bulan Berisi Data
              </button>
              <button
                type="button"
                onClick={() => applyPreset([1, 2, 3])}
                className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
              >
                TW I (Jan–Mar)
              </button>
              <button
                type="button"
                onClick={() => applyPreset([4, 5, 6])}
                className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
              >
                TW II (Apr–Jun)
              </button>
              <button
                type="button"
                onClick={() => applyPreset([7, 8, 9])}
                className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
              >
                TW III (Jul–Sep)
              </button>
              <button
                type="button"
                onClick={() => applyPreset([10, 11, 12])}
                className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
              >
                TW IV (Okt–Des)
              </button>
              <button
                type="button"
                onClick={() => applyPreset([1, 2, 3, 4, 5, 6])}
                className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Semester I
              </button>
              <button
                type="button"
                onClick={() => applyPreset([7, 8, 9, 10, 11, 12])}
                className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Semester II
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonths([])}
                className="cursor-pointer rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-50"
              >
                Hapus Pilihan
              </button>
            </div>
          </div>

          {/* Grid Pilihan 12 Bulan */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {MONTH_NAMES_ID.map((monthName, idx) => {
              const monthNum = idx + 1;
              const isChecked = selectedMonths.includes(monthNum);
              const count = monthCounts[monthNum] || 0;
              const periodKey = `${selectedYear}-${String(monthNum).padStart(2, "0")}`;
              const isLocked = locksByPeriod.has(periodKey);

              return (
                <button
                  key={monthNum}
                  type="button"
                  onClick={() => toggleMonth(monthNum)}
                  className={`flex cursor-pointer flex-col justify-between rounded-lg border p-2.5 text-left transition ${
                    isChecked
                      ? "border-emerald-600 bg-emerald-50/90 ring-1 ring-emerald-600"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900">
                      {monthNum}. {monthName}
                    </span>
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isChecked
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3" />}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-1 text-[10px]">
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono font-bold ${
                        count > 0
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {count > 0 ? `${count} baris` : "NIHIL"}
                    </span>

                    {isLocked && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 font-semibold text-amber-800"
                        title="Periode ini terkunci (menggunakan penandatangan terkunci)"
                      >
                        <Lock className="h-2.5 w-2.5" />
                        Kunci
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Ringkasan Urutan Dokumen */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Calendar className="h-3.5 w-3.5 text-emerald-700" />
              <span>Urutan Dokumen dalam 1 File PDF ({totalSelectedEntries} total baris):</span>
            </div>

            {sortedSelectedMonths.length > 0 ? (
              <p className="text-[11px] font-semibold text-emerald-800 leading-relaxed">
                {sortedSelectedMonths.map((m) => MONTH_SHORT_ID[m - 1]).join(" → ")} ({selectedYear})
              </p>
            ) : (
              <p className="text-[11px] text-amber-700 font-medium">
                Pilih minimal 1 bulan terlebih dahulu.
              </p>
            )}

            <p className="text-[10px] text-slate-500 leading-relaxed">
              Setiap bulan otomatis disusun berurutan mulai dari bulan terkecil (Januari dst.), lengkap dengan kop periode bulan, penomoran halaman tabel, catatan penutupan, rekapitulasi{register.hasRekapitulasi ? " (termasuk input manual)" : ""}, serta penandatangan{isLoadingLocks ? "..." : " sesuai kunci masing-masing bulan"}.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Batal
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-batch-pdf-preview"
              onClick={() => void onGenerate(sortedSelectedMonths, "preview", locksByPeriod)}
              disabled={sortedSelectedMonths.length === 0 || isGenerating}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Eye className="h-3.5 w-3.5 text-slate-600" />
              <span>{isGenerating ? "Memproses..." : "Pratinjau PDF"}</span>
            </button>

            <button
              type="button"
              id="btn-batch-pdf-download"
              onClick={() => void onGenerate(sortedSelectedMonths, "download", locksByPeriod)}
              disabled={sortedSelectedMonths.length === 0 || isGenerating}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-1.5 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>
                {isGenerating
                  ? "Menyusun PDF..."
                  : `Unduh 1 File PDF (${sortedSelectedMonths.length} Bulan)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

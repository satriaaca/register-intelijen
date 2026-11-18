import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  Info,
  Lock,
  ShieldAlert,
  UserCheck,
  X,
} from "lucide-react";
import {
  AppSettings,
  Officer,
  RegisterDefinition,
  RegisterLock,
} from "../types.js";
import { DEFAULT_SETTINGS, REGISTER_DEFINITIONS } from "../lib/constants.js";
import {
  getMonthsBeforeCurrentMonth,
  isMonthBeforeCurrentMonth,
  MONTH_NAMES_ID,
} from "../lib/date-utils.js";
import {
  buildBatchLockItems,
  formatLockPangkatNip,
  formatMonthSummaryId,
} from "../lib/lock-utils.js";
import { authFetch } from "../lib/api.js";

export interface BatchLockSummary {
  lockedCount: number;
  skippedCount: number;
  scope: "current" | "all";
  months: number[];
}

interface BatchLockRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  register: RegisterDefinition;
  currentSettings?: AppSettings;
  selectedYear: number;
  officers?: Officer[];
  onBatchLocked?: (summary: BatchLockSummary) => void;
}

export const BatchLockRegisterModal: React.FC<BatchLockRegisterModalProps> = ({
  isOpen,
  onClose,
  register,
  currentSettings,
  selectedYear,
  officers = [],
  onBatchLocked,
}) => {
  const safeSettings: AppSettings =
    currentSettings || (DEFAULT_SETTINGS as AppSettings);

  const now = new Date();
  const currentCalendarYear = now.getFullYear();
  const currentCalendarMonth = now.getMonth() + 1;

  const eligibleMonths = useMemo(
    () => getMonthsBeforeCurrentMonth(selectedYear, new Date()),
    [selectedYear, isOpen],
  );

  const [scope, setScope] = useState<"current" | "all">("current");
  const [selectedMonths, setSelectedMonths] = useState<number[]>(eligibleMonths);
  const [skipAlreadyLocked, setSkipAlreadyLocked] = useState(true);
  const [existingLocks, setExistingLocks] = useState<RegisterLock[]>([]);
  const [isLoadingLocks, setIsLoadingLocks] = useState(false);

  const [availableOfficers, setAvailableOfficers] = useState<Officer[]>(officers);
  const [leftSignerTitle, setLeftSignerTitle] = useState("");
  const [leftSignerName, setLeftSignerName] = useState("");
  const [leftSignerPangkatNip, setLeftSignerPangkatNip] = useState("");
  const [rightSignerTitle, setRightSignerTitle] = useState("");
  const [rightSignerName, setRightSignerName] = useState("");
  const [rightSignerPangkatNip, setRightSignerPangkatNip] = useState("");
  const [tempatDokumen, setTempatDokumen] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setScope("current");
    setSelectedMonths(eligibleMonths);
    setSkipAlreadyLocked(true);

    setLeftSignerTitle(safeSettings.leftSignerTitle || "");
    setLeftSignerName(safeSettings.leftSignerName || "");
    setLeftSignerPangkatNip(
      formatLockPangkatNip(safeSettings.leftSignerPangkatNip || ""),
    );
    setRightSignerTitle(safeSettings.rightSignerTitle || "");
    setRightSignerName(safeSettings.rightSignerName || "");
    setRightSignerPangkatNip(
      formatLockPangkatNip(safeSettings.rightSignerPangkatNip || ""),
    );
    setTempatDokumen(safeSettings.tempatDokumen || "Tabanan");

    let cancelled = false;
    setIsLoadingLocks(true);
    void authFetch("/api/register-locks")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: RegisterLock[]) => {
        if (!cancelled && Array.isArray(list)) {
          setExistingLocks(list.filter((item) => item.isLocked));
        }
      })
      .catch(() => {
        if (!cancelled) setExistingLocks([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingLocks(false);
      });

    if (officers && officers.length > 0) {
      setAvailableOfficers(officers);
    } else {
      void authFetch("/api/officers")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (!cancelled && Array.isArray(data)) {
            setAvailableOfficers(data);
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedYear, safeSettings, officers, eligibleMonths]);

  const lockedKeySet = useMemo(() => {
    const set = new Set<string>();
    for (const lock of existingLocks) {
      if (lock.isLocked) {
        set.add(`${lock.registerCode}::${lock.periodKey}`);
      }
    }
    return set;
  }, [existingLocks]);

  const targetRegisterCodes = useMemo(
    () =>
      scope === "all"
        ? REGISTER_DEFINITIONS.map((r) => r.code)
        : [register.code],
    [scope, register.code],
  );

  const sortedSelectedMonths = useMemo(
    () =>
      Array.from(new Set<number>(selectedMonths))
        .filter((m) => eligibleMonths.includes(m))
        .sort((a, b) => a - b),
    [selectedMonths, eligibleMonths],
  );

  const candidateItems = useMemo(
    () =>
      buildBatchLockItems({
        registerCodes: targetRegisterCodes,
        year: selectedYear,
        months: sortedSelectedMonths,
        settings: safeSettings,
      }),
    [targetRegisterCodes, selectedYear, sortedSelectedMonths, safeSettings],
  );

  const { alreadyLockedCount, periodsToLockCount } = useMemo(() => {
    let lockedCount = 0;
    for (const item of candidateItems) {
      if (lockedKeySet.has(`${item.registerCode}::${item.periodKey}`)) {
        lockedCount += 1;
      }
    }
    const toApply = skipAlreadyLocked
      ? Math.max(0, candidateItems.length - lockedCount)
      : candidateItems.length;
    return {
      alreadyLockedCount: lockedCount,
      periodsToLockCount: toApply,
    };
  }, [candidateItems, lockedKeySet, skipAlreadyLocked]);

  if (!isOpen) return null;

  const toggleMonth = (month: number) => {
    if (!eligibleMonths.includes(month)) return;
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (candidateItems.length === 0 || periodsToLockCount === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await authFetch("/api/register-locks/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: candidateItems,
          leftSignerTitle,
          leftSignerName,
          leftSignerPangkatNip: formatLockPangkatNip(leftSignerPangkatNip),
          rightSignerTitle,
          rightSignerName,
          rightSignerPangkatNip: formatLockPangkatNip(rightSignerPangkatNip),
          signatureAlignment: safeSettings.signatureAlignment || "split",
          tempatDokumen,
          lockedBy: "Petugas / Administrator",
          skipAlreadyLocked,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData?.error || "Gagal mengunci register secara massal.");
      }

      onBatchLocked?.({
        lockedCount: Number(resData.lockedCount || 0),
        skippedCount: Number(resData.skippedCount || 0),
        scope,
        months: sortedSelectedMonths,
      });
      onClose();
    } catch (err: any) {
      console.error("Batch lock error:", err);
      setError(err?.message || "Terjadi kesalahan saat mengunci register.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRangeLabel = formatMonthSummaryId(sortedSelectedMonths);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-xs sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-200 bg-emerald-50/70 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-xs">
              <CalendarClock className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-tight text-emerald-950 sm:text-sm">
                Kunci Register Sebelum Bulan Berjalan
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-600">
                Tahun Takwim <strong className="text-slate-900">{selectedYear}</strong>
                <span aria-hidden="true" className="mx-1.5 text-slate-300">·</span>
                <span>
                  Bulan berjalan:{" "}
                  <strong className="text-slate-800">
                    {MONTH_NAMES_ID[currentCalendarMonth - 1]} {currentCalendarYear}
                  </strong>
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup modal kunci massal"
            className="cursor-pointer rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {eligibleMonths.length === 0 ? (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
              <div className="flex items-center gap-2 font-bold">
                <Info className="h-4 w-4 shrink-0 text-amber-700" />
                <span>Tidak Ada Bulan Sebelum Bulan Berjalan pada Tahun {selectedYear}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900">
                {selectedYear > currentCalendarYear
                  ? `Tahun ${selectedYear} belum memasuki bulan berjalan (${MONTH_NAMES_ID[currentCalendarMonth - 1]} ${currentCalendarYear}).`
                  : `Bulan berjalan saat ini adalah ${MONTH_NAMES_ID[currentCalendarMonth - 1]} ${currentCalendarYear}, sehingga belum ada bulan sebelumnya di tahun ${selectedYear}. Ubah filter tahun ke ${currentCalendarYear - 1} jika ingin mengunci periode tahun sebelumnya.`}
              </p>
            </div>
          ) : (
            <>
              {/* Cakupan Register */}
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
                    Cakupan Buku Register
                  </span>
                  <div className="flex items-center gap-1 rounded-lg bg-slate-200/75 p-1">
                    <button
                      id="btn-batch-lock-scope-current"
                      type="button"
                      onClick={() => setScope("current")}
                      className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition ${
                        scope === "current"
                          ? "bg-white text-emerald-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Hanya {register.code}
                    </button>
                    <button
                      id="btn-batch-lock-scope-all"
                      type="button"
                      onClick={() => setScope("all")}
                      className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition ${
                        scope === "all"
                          ? "bg-white text-emerald-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Semua Register (R.IN.1–R.IN.22)
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600">
                  {scope === "current"
                    ? `Mengunci periode bulan yang dipilih hanya pada buku register ${register.code} (${register.title}).`
                    : "Mengunci periode bulan yang dipilih sekaligus untuk seluruh 22 buku register (R.IN.1 s/d R.IN.22)."}
                </p>
              </div>

              {/* Pilihan Bulan */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
                      Bulan Sebelum Bulan Berjalan ({sortedSelectedMonths.length} dari{" "}
                      {eligibleMonths.length} bulan dipilih)
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedMonths(eligibleMonths)}
                      className="cursor-pointer rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      Pilih Semua ({formatMonthSummaryId(eligibleMonths, true)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMonths([])}
                      className="cursor-pointer rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {MONTH_NAMES_ID.map((monthName, idx) => {
                    const monthNum = idx + 1;
                    const isEligible = isMonthBeforeCurrentMonth(
                      selectedYear,
                      monthNum,
                      now,
                    );
                    const isChecked = isEligible && sortedSelectedMonths.includes(monthNum);
                    const periodKey = `${selectedYear}-${String(monthNum).padStart(2, "0")}`;

                    const lockedInMonth = targetRegisterCodes.filter((code) =>
                      lockedKeySet.has(`${code}::${periodKey}`),
                    ).length;

                    let statusText = "Belum dikunci";
                    let statusClass = "text-slate-500";

                    if (!isEligible) {
                      statusText =
                        selectedYear === currentCalendarYear &&
                        monthNum === currentCalendarMonth
                          ? "Bulan berjalan"
                          : "Belum tiba";
                      statusClass = "text-slate-400";
                    } else if (isLoadingLocks) {
                      statusText = "Memeriksa...";
                    } else if (scope === "current") {
                      if (lockedInMonth > 0) {
                        statusText = "Sudah terkunci";
                        statusClass = "text-amber-700 font-semibold";
                      }
                    } else if (lockedInMonth > 0) {
                      statusText = `${lockedInMonth}/${targetRegisterCodes.length} terkunci`;
                      statusClass =
                        lockedInMonth === targetRegisterCodes.length
                          ? "text-amber-700 font-semibold"
                          : "text-amber-700";
                    }

                    return (
                      <button
                        key={monthNum}
                        type="button"
                        disabled={!isEligible}
                        onClick={() => toggleMonth(monthNum)}
                        className={`flex flex-col justify-between rounded-lg border p-2.5 text-left transition ${
                          !isEligible
                            ? "cursor-not-allowed border-slate-200/70 bg-slate-100/70 opacity-65"
                            : isChecked
                              ? "cursor-pointer border-emerald-600 bg-emerald-50/90 ring-1 ring-emerald-600"
                              : "cursor-pointer border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900">
                            {monthNum}. {monthName}
                          </span>
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              !isEligible
                                ? "border-slate-200 bg-slate-100"
                                : isChecked
                                  ? "border-emerald-700 bg-emerald-700 text-white"
                                  : "border-slate-300 bg-white"
                            }`}
                          >
                            {isChecked && <Check className="h-3 w-3" />}
                          </span>
                        </div>

                        <div className="mt-1.5 text-[10px]">
                          <span className={statusClass}>{statusText}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Opsi lewati yang sudah terkunci */}
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
                  <input
                    id="chk-skip-already-locked"
                    type="checkbox"
                    checked={skipAlreadyLocked}
                    onChange={(e) => setSkipAlreadyLocked(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <div>
                    <span className="font-semibold text-slate-900">
                      Lewati periode yang sudah terkunci sebelumnya
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      {alreadyLockedCount > 0
                        ? `Ditemukan ${alreadyLockedCount} periode yang sudah dikunci sebelumnya. ${
                            skipAlreadyLocked
                              ? "Periode tersebut tidak akan ditimpa agar riwayat penandatangan lama tetap aman."
                              : "Semua periode terpilih akan ditimpa dengan data penandatangan di bawah."
                          }`
                        : "Belum ada periode terkunci pada pilihan saat ini."}
                    </span>
                  </div>
                </label>
              </div>

              {/* Penandatangan Snapshot */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {/* Pejabat Kiri */}
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <div className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-800">
                    Pejabat Penandatangan Kiri
                  </div>

                  {availableOfficers.length > 0 && (
                    <div className="space-y-1 rounded border border-emerald-200 bg-emerald-50/70 p-2">
                      <label className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-900">
                        <UserCheck className="h-3 w-3 text-emerald-700" />
                        Pilih dari Database Pegawai
                      </label>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const selectedId = Number(e.target.value);
                          const off = availableOfficers.find((o) => o.id === selectedId);
                          if (off) {
                            setLeftSignerName(off.nama);
                            const cleanNip = off.nip.replace(/^NIP\.?\s*/i, "").trim();
                            setLeftSignerPangkatNip(
                              formatLockPangkatNip(`${off.pangkat} NIP. ${cleanNip}`),
                            );
                            if (off.jabatan) {
                              setLeftSignerTitle(`Mengetahui:\n${off.jabatan.toUpperCase()}`);
                            }
                          }
                          e.target.value = "";
                        }}
                        className="w-full rounded border border-emerald-300 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      >
                        <option value="">
                          -- Pilih Pejabat Pimpinan ({availableOfficers.length}) --
                        </option>
                        {availableOfficers.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.nama} ({o.jabatan || o.pangkat})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-600">
                      Jabatan / Instansi
                    </label>
                    <input
                      type="text"
                      value={leftSignerTitle}
                      onChange={(e) => setLeftSignerTitle(e.target.value)}
                      required
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-600">
                      Nama Lengkap & Gelar
                    </label>
                    <input
                      type="text"
                      value={leftSignerName}
                      onChange={(e) => setLeftSignerName(e.target.value)}
                      required
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-600">
                      Pangkat / NIP
                    </label>
                    <input
                      type="text"
                      value={leftSignerPangkatNip}
                      onChange={(e) =>
                        setLeftSignerPangkatNip(
                          e.target.value.replace(/\//g, "").toUpperCase(),
                        )
                      }
                      required
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                {/* Pejabat Kanan */}
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <div className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-800">
                    Pejabat Penandatangan Kanan
                  </div>

                  {availableOfficers.length > 0 && (
                    <div className="space-y-1 rounded border border-emerald-200 bg-emerald-50/70 p-2">
                      <label className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-900">
                        <UserCheck className="h-3 w-3 text-emerald-700" />
                        Pilih dari Database Pegawai
                      </label>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const selectedId = Number(e.target.value);
                          const off = availableOfficers.find((o) => o.id === selectedId);
                          if (off) {
                            setRightSignerName(off.nama);
                            const cleanNip = off.nip.replace(/^NIP\.?\s*/i, "").trim();
                            setRightSignerPangkatNip(
                              formatLockPangkatNip(`${off.pangkat} NIP. ${cleanNip}`),
                            );
                            if (off.jabatan) {
                              setRightSignerTitle(off.jabatan.toUpperCase());
                            }
                          }
                          e.target.value = "";
                        }}
                        className="w-full rounded border border-emerald-300 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      >
                        <option value="">
                          -- Pilih Pejabat Pengesah ({availableOfficers.length}) --
                        </option>
                        {availableOfficers.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.nama} ({o.jabatan || o.pangkat})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-600">
                      Jabatan / Instansi
                    </label>
                    <input
                      type="text"
                      value={rightSignerTitle}
                      onChange={(e) => setRightSignerTitle(e.target.value)}
                      required
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-600">
                      Nama Lengkap & Gelar
                    </label>
                    <input
                      type="text"
                      value={rightSignerName}
                      onChange={(e) => setRightSignerName(e.target.value)}
                      required
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-600">
                      Pangkat / NIP
                    </label>
                    <input
                      type="text"
                      value={rightSignerPangkatNip}
                      onChange={(e) =>
                        setRightSignerPangkatNip(
                          e.target.value.replace(/\//g, "").toUpperCase(),
                        )
                      }
                      required
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Tempat Pembuatan & Ringkasan Tanggal Tutup */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-600">
                    Tempat Pembuatan
                  </label>
                  <input
                    type="text"
                    value={tempatDokumen}
                    onChange={(e) => setTempatDokumen(e.target.value)}
                    required
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-800 block">
                    Tanggal Tutup Otomatis per Bulan
                  </span>
                  <span>
                    Setiap bulan memakai tanggal penutupan masing-masing (akhir bulan / jadwal Pengaturan Instansi).
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
            <div className="text-xs text-slate-600">
              {eligibleMonths.length > 0 && sortedSelectedMonths.length > 0 ? (
                <span>
                  Target:{" "}
                  <strong className="text-slate-900">
                    {periodsToLockCount} periode
                  </strong>{" "}
                  ({selectedRangeLabel} {selectedYear}
                  {scope === "all" ? " · 22 register" : ` · ${register.code}`})
                </span>
              ) : (
                <span>Pilih minimal 1 bulan untuk dikunci.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer rounded border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Batal
              </button>

              {eligibleMonths.length > 0 && (
                <button
                  id="btn-confirm-batch-lock"
                  type="submit"
                  disabled={isSubmitting || periodsToLockCount === 0}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>
                    {isSubmitting
                      ? "Mengunci..."
                      : `Kunci ${periodsToLockCount} Periode Sekarang`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

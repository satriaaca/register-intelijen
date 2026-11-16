import React, { useMemo, useRef, useState } from "react";
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  FolderArchive,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import type { RegisterDefinition } from "../types.js";
import { getRegisterShortLabel, REGISTER_DEFINITIONS } from "../lib/constants.js";

interface NavbarProps {
  activeTab: "registers" | "officers" | "settings";
  setActiveTab: (tab: "registers" | "officers" | "settings") => void;
  selectedRegisterCode: string;
  registers?: RegisterDefinition[];
  onSelectRegister?: (code: string) => void;
  totalOfficers: number;
  totalEntries: number;
  onSeedSample: () => void;
  isSeeding: boolean;

  /**
   * Membuka modal manajemen kode penyimpanan global.
   */
  onManageStorageCodes?: () => void;

  /**
   * Membuka modal manajemen kapasitas database & arsip 3 tahun.
   */
  onOpenArchiveManager?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedRegisterCode,
  registers = REGISTER_DEFINITIONS,
  onSelectRegister,
  totalOfficers,
  totalEntries,
  onManageStorageCodes,
  onOpenArchiveManager,
}) => {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { refs, floatingStyles, context } = useFloating({
    open: switcherOpen,
    onOpenChange: (nextOpen) => {
      setSwitcherOpen(nextOpen);
      if (nextOpen) {
        setQuickSearch("");
        window.setTimeout(() => searchInputRef.current?.focus(), 20);
      }
    },
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip({ padding: 12 }), shift({ padding: 12 })],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "dialog" });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  const activeIndex = useMemo(
    () => Math.max(0, registers.findIndex((r) => r.code === selectedRegisterCode)),
    [registers, selectedRegisterCode],
  );
  const activeRegister = registers[activeIndex] || registers[0];
  const prevRegister = activeIndex > 0 ? registers[activeIndex - 1] : null;
  const nextRegister =
    activeIndex >= 0 && activeIndex < registers.length - 1
      ? registers[activeIndex + 1]
      : null;

  const groupedRegisters = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    const filtered = registers.filter((reg) => {
      if (!q) return true;
      const shortLabel = getRegisterShortLabel(reg).toLowerCase();
      return (
        reg.code.toLowerCase().includes(q) ||
        reg.title.toLowerCase().includes(q) ||
        shortLabel.includes(q) ||
        reg.category.toLowerCase().includes(q)
      );
    });

    const groups = new Map<string, RegisterDefinition[]>();
    for (const reg of filtered) {
      const list = groups.get(reg.category) || [];
      list.push(reg);
      groups.set(reg.category, list);
    }
    return Array.from(groups.entries());
  }, [registers, quickSearch]);

  const handleChooseRegister = (code: string) => {
    onSelectRegister?.(code);
    if (activeTab !== "registers") {
      setActiveTab("registers");
    }
    setSwitcherOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-3 shadow-sm backdrop-blur sm:px-5">
      <div className="mx-auto flex min-h-14 max-w-[1600px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-md shadow-emerald-900/20">
            <BookOpen className="h-4.5 w-4.5" strokeWidth={2.25} />
          </div>

          <div className="min-w-0 leading-tight">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="truncate font-serif text-xs font-bold uppercase tracking-wide text-slate-800 sm:text-sm">
                AMERTA
              </h1>

              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-800 sm:text-[10px]">
                v2.0
              </span>
            </div>

            <p className="hidden truncate text-[10px] text-slate-500 sm:block">
              Kejaksaan Negeri Tabanan · Administrasi R.IN.1–R.IN.22
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenArchiveManager ? (
            <button
              type="button"
              onClick={onOpenArchiveManager}
              title="Kapasitas Database & Manajemen Arsip 3 Tahun"
              className="hidden cursor-pointer items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 transition hover:bg-emerald-100 hover:border-emerald-300 md:flex"
            >
              <Database className="h-3 w-3" />
              <span className="font-mono">Database Neon</span>
              <span className="rounded bg-emerald-200/70 px-1 py-0.2 text-[8px] font-bold">Arsip</span>
            </button>
          ) : (
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 md:flex">
              <Database className="h-3 w-3" />
              <span className="font-mono">Database Aktif</span>
            </div>
          )}

          <nav
            aria-label="Navigasi utama"
            className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1"
          >
            <button
              id="nav-btn-registers"
              type="button"
              onClick={() => setActiveTab("registers")}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition sm:px-3 ${activeTab === "registers"
                  ? "border border-slate-200 bg-white text-emerald-800 shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Register</span>
              <span className="rounded bg-slate-200 px-1 py-0.5 font-mono text-[9px] text-slate-700 sm:text-[10px]">
                {totalEntries}
              </span>
            </button>

            <button
              id="nav-btn-officers"
              type="button"
              onClick={() => setActiveTab("officers")}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition sm:px-3 ${activeTab === "officers"
                  ? "border border-slate-200 bg-white text-emerald-800 shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Petugas</span>
              <span className="rounded bg-slate-200 px-1 py-0.5 font-mono text-[9px] text-slate-700 sm:text-[10px]">
                {totalOfficers}
              </span>
            </button>

            <button
              id="nav-btn-settings"
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition sm:px-3 ${activeTab === "settings"
                  ? "border border-slate-200 bg-white text-emerald-800 shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                }`}
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Pengaturan</span>
            </button>
          </nav>

          {onManageStorageCodes && (
            <button
              id="btn-manage-storage-codes-navbar"
              type="button"
              onClick={onManageStorageCodes}
              title="Kelola tabel kode penyimpanan dan asal instansi"
              className="hidden cursor-pointer items-center gap-1.5 rounded border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100 sm:inline-flex"
            >
              <FolderArchive className="h-3.5 w-3.5 text-amber-700" />
              <span className="hidden xl:inline">Kode Penyimpanan</span>
              <span className="xl:hidden">Arsip</span>
            </button>
          )}
        </div>
      </div>

      {/* Bar Sticky Pindah Cepat Register (selalu terlihat saat scroll tanpa harus kembali ke atas) */}
      {activeTab === "registers" && activeRegister && (
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2 border-t border-slate-100 py-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                id="btn-sticky-prev-register"
                type="button"
                disabled={!prevRegister}
                onClick={() => prevRegister && handleChooseRegister(prevRegister.code)}
                title={
                  prevRegister
                    ? `Sebelumnya: ${prevRegister.code} (${getRegisterShortLabel(prevRegister)})`
                    : "Sudah di register pertama"
                }
                aria-label="Register sebelumnya"
                className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
                  prevRegister
                    ? "cursor-pointer text-slate-700 hover:bg-white hover:text-emerald-800 hover:shadow-2xs"
                    : "cursor-not-allowed text-slate-300"
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                ref={refs.setReference}
                id="btn-sticky-register-switcher"
                type="button"
                aria-expanded={switcherOpen}
                aria-label={`Register aktif ${activeRegister.code}, klik untuk pindah register`}
                {...getReferenceProps()}
                className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md bg-emerald-800 px-2.5 py-1 text-left text-xs text-white shadow-2xs transition hover:bg-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <span className="shrink-0 font-mono font-bold text-amber-300">
                  {activeRegister.code}
                </span>
                <span className="truncate font-medium text-emerald-50 max-w-[165px] sm:max-w-[300px] md:max-w-md">
                  {getRegisterShortLabel(activeRegister)}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-emerald-200 transition-transform ${
                    switcherOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <button
                id="btn-sticky-next-register"
                type="button"
                disabled={!nextRegister}
                onClick={() => nextRegister && handleChooseRegister(nextRegister.code)}
                title={
                  nextRegister
                    ? `Berikutnya: ${nextRegister.code} (${getRegisterShortLabel(nextRegister)})`
                    : "Sudah di register terakhir"
                }
                aria-label="Register berikutnya"
                className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
                  nextRegister
                    ? "cursor-pointer text-slate-700 hover:bg-white hover:text-emerald-800 hover:shadow-2xs"
                    : "cursor-not-allowed text-slate-300"
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <span className="hidden text-[11px] text-slate-500 sm:inline">
              <span className="font-mono font-semibold text-slate-700">
                {activeIndex + 1}/{registers.length}
              </span>
              <span aria-hidden="true" className="mx-1.5 text-slate-300">·</span>
              <span>{activeRegister.category}</span>
            </span>
          </div>

          <span className="hidden shrink-0 text-[11px] text-slate-500 lg:inline">
            Pindah cepat R.IN dari posisi mana saja tanpa scroll ke atas
          </span>
        </div>
      )}

      {/* Popover Daftar Cepat 22 Register */}
      {switcherOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-50 w-[min(94vw,680px)] rounded-xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 p-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    id="input-quick-switch-register"
                    type="text"
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    placeholder="Ketik kode atau nama register (mis. R.IN.5, surat, operasi)..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-8 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  {quickSearch && (
                    <button
                      type="button"
                      onClick={() => setQuickSearch("")}
                      aria-label="Hapus pencarian cepat"
                      className="absolute right-2.5 top-2 cursor-pointer text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSwitcherOpen(false)}
                  aria-label="Tutup pemilih cepat register"
                  className="cursor-pointer rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[65vh] overflow-y-auto p-3 space-y-3">
                {groupedRegisters.length > 0 ? (
                  groupedRegisters.map(([category, items]) => (
                    <div key={category}>
                      <h3 className="mb-1.5 px-1 text-[11px] font-bold text-slate-500">
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {items.map((reg) => {
                          const isCurrent = reg.code === selectedRegisterCode;
                          return (
                            <button
                              key={reg.code}
                              type="button"
                              onClick={() => handleChooseRegister(reg.code)}
                              className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                                isCurrent
                                  ? "border-emerald-800 bg-emerald-800 text-white shadow-sm"
                                  : "border-slate-200/80 bg-slate-50/70 text-slate-800 hover:border-emerald-500/70 hover:bg-white"
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-mono text-xs font-bold ${
                                      isCurrent ? "text-amber-300" : "text-emerald-900"
                                    }`}
                                  >
                                    {reg.code}
                                  </span>
                                  <span
                                    className={`truncate text-xs font-medium ${
                                      isCurrent ? "text-emerald-50" : "text-slate-700"
                                    }`}
                                  >
                                    {getRegisterShortLabel(reg)}
                                  </span>
                                </div>
                              </div>

                              {isCurrent ? (
                                <Check className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                              ) : (
                                <span className="shrink-0 text-[10px] text-slate-400">
                                  {reg.orientation === "landscape" ? "A4-L" : "A4-P"}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">
                    Register "{quickSearch}" tidak ditemukan.
                  </div>
                )}
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </header>
  );
};
import React from "react";
import {
  BookOpen,
  Database,
  FileStack,
  FolderArchive,
  RefreshCw,
  Settings,
  Users,
} from "lucide-react";

interface NavbarProps {
  activeTab: "registers" | "officers" | "settings";
  setActiveTab: (tab: "registers" | "officers" | "settings") => void;
  selectedRegisterCode: string;
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
  totalOfficers,
  totalEntries,
  onSeedSample,
  isSeeding,
  onManageStorageCodes,
  onOpenArchiveManager,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-3 shadow-sm backdrop-blur sm:px-5">
      <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-md shadow-emerald-900/20">
            <BookOpen className="h-5 w-5" strokeWidth={2.25} />
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
              Kejaksaan Negeri Tabanan · Administrasi R.IN.1–R.IN.23
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
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <Database className="h-3 w-3" />
              <span className="font-mono">Database Neon</span>
              <span className="rounded bg-emerald-200/70 px-1 py-0.2 text-[8px] font-bold">Arsip</span>
            </button>
          ) : (
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 md:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
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
              className="hidden cursor-pointer items-center gap-1.5 rounded border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100 sm:inline-flex"
            >
              <FolderArchive className="h-3.5 w-3.5 text-amber-700" />
              <span className="hidden xl:inline">Kode Penyimpanan</span>
              <span className="xl:hidden">Arsip</span>
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto hidden max-w-[1600px] border-t border-slate-100 py-1.5 text-[10px] text-slate-500 lg:flex lg:items-center lg:justify-between">
        <span>
          Sistem Administrasi Buku Register Intelijen Kejaksaan Negeri Tabanan
        </span>

        <span className="flex items-center gap-1 font-mono text-emerald-700">
          <FileStack className="h-3 w-3" />
          Register aktif: {selectedRegisterCode}
        </span>
      </div>
    </header>
  );
};
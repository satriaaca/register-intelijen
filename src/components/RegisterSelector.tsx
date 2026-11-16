import React, { useMemo, useRef, useState } from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  arrow,
  FloatingArrow,
  FloatingPortal,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  useTransitionStyles,
} from "@floating-ui/react";
import { RegisterDefinition } from "../types.js";
import { BookOpen, Check, Search, X } from "lucide-react";

type RegisterItem = RegisterDefinition & {
  entryCount?: number;
  yearlyEntryCount?: number;
};

interface RegisterSelectorProps {
  registers: RegisterItem[];
  selectedCode: string;
  onSelect: (code: string) => void;
}

const SHORT_LABELS: Record<string, string> = {
  "R.IN.1": "Surat Masuk Biasa / Rahasia",
  "R.IN.2": "Surat Keluar Biasa / Rahasia",
  "R.IN.3": "Kerja Intelijen (5 Bidang)",
  "R.IN.4": "Ekspedisi Surat Biasa / Rahasia",
  "R.IN.5": "Produk Intelijen",
  "R.IN.6": "Arsip Intelijen",
  "R.IN.7": "Kegiatan Bid. Ipoleksoshankam",
  "R.IN.8": "Kegiatan Bid. Sosbudmas",
  "R.IN.9": "Kegiatan Bid. Ekonomi & Keuangan",
  "R.IN.10": "Kegiatan Bid. PPS",
  "R.IN.11": "Kegiatan Bid. TI & Prodin",
  "R.IN.12": "Operasi Bid. Ipoleksoshankam",
  "R.IN.13": "Operasi Bid. Sosbudmas",
  "R.IN.14": "Operasi Bid. Ekonomi & Keuangan",
  "R.IN.15": "Operasi Bid. PPS",
  "R.IN.16": "Operasi Bid. TI & Prodin",
  "R.IN.17": "Berita Masuk (Kamar Sandi)",
  "R.IN.18": "Berita Keluar (Kamar Sandi)",
  "R.IN.19": "Telaahan Intelijen",
  "R.IN.20": "Ekspedisi Berita Sandi",
  "R.IN.21": "Tamu PPH & Pengaduan (PPM)",
  "R.IN.22": "Penerangan & Penyuluhan Hukum",
};

const CATEGORY_TEXT_ACCENT: Record<string, string> = {
  "Surat & Berita": "text-emerald-700",
  "Kerja & Produk": "text-teal-700",
  "Kegiatan Intelijen": "text-sky-700",
  "Operasi Intelijen": "text-amber-700",
  "Layanan & Penyuluhan": "text-indigo-700",
};

function getShortLabel(reg: RegisterItem): string {
  if (SHORT_LABELS[reg.code]) return SHORT_LABELS[reg.code];
  return reg.title.replace(/^REGISTER\s+/i, "");
}

interface RegisterCardProps {
  reg: RegisterItem;
  isSelected: boolean;
  onSelect: (code: string) => void;
}

const RegisterCard: React.FC<RegisterCardProps> = ({
  reg,
  isSelected,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);
  const arrowRef = useRef<SVGSVGElement>(null);
  const shortLabel = getShortLabel(reg);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "top",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      arrow({ element: arrowRef }),
    ],
  });

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    duration: 150,
    initial: { opacity: 0, transform: "translateY(4px)" },
  });

  const hover = useHover(context, { move: false, delay: { open: 160, close: 0 } });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  const categoryColor = CATEGORY_TEXT_ACCENT[reg.category] || "text-slate-500";

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        id={`btn-select-${reg.code.toLowerCase().replace(/\./g, "-")}`}
        aria-pressed={isSelected}
        aria-label={`${reg.code} ${shortLabel}`}
        {...getReferenceProps({ onClick: () => onSelect(reg.code) })}
        className={`group relative flex min-h-[68px] flex-col justify-between rounded-lg border p-2.5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 ${
          isSelected
            ? "border-emerald-900 bg-gradient-to-br from-emerald-800 via-emerald-800 to-emerald-950 text-white shadow-md shadow-emerald-950/15"
            : "border-slate-200/90 bg-slate-50/75 text-slate-800 hover:-translate-y-0.5 hover:border-emerald-500/60 hover:bg-white hover:shadow-md hover:shadow-slate-900/5"
        }`}
      >
        <div className="flex w-full items-center justify-between gap-1.5">
          <span
            className={`font-mono text-xs font-bold tracking-tight ${
              isSelected
                ? "text-amber-300"
                : "text-emerald-900 group-hover:text-emerald-700"
            }`}
          >
            {reg.code}
          </span>

          {isSelected ? (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-300">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
          ) : (
            <span
              className={`truncate text-[10px] font-medium ${categoryColor} opacity-80 group-hover:opacity-100`}
            >
              {reg.orientation === "landscape" ? "A4-L" : "A4-P"}
            </span>
          )}
        </div>

        <span
          className={`mt-1.5 line-clamp-2 text-[11px] font-medium leading-snug ${
            isSelected ? "text-emerald-50" : "text-slate-600 group-hover:text-slate-900"
          }`}
        >
          {shortLabel}
        </span>
      </button>

      {isMounted && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-50 pointer-events-none"
            {...getFloatingProps()}
          >
            <div
              style={transitionStyles}
              className="w-68 rounded-lg border border-slate-700/60 bg-slate-900 p-3 text-white shadow-xl font-sans"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-mono text-[11px] font-bold text-amber-300">
                  {reg.code}
                </span>
                <span className="text-[10px] font-medium text-slate-300">
                  {reg.orientation === "landscape" ? "A4 Landscape" : "A4 Portrait"}
                </span>
              </div>

              <p className="text-xs font-semibold leading-snug text-white">
                {reg.title}
              </p>
              {reg.subtitle && (
                <p className="text-[10px] text-slate-400 mt-1 leading-snug line-clamp-3">
                  {reg.subtitle}
                </p>
              )}

              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300">
                <span>{reg.category}</span>
                <span className="text-emerald-300 font-medium">
                  {isSelected ? "Sedang dibuka" : "Klik untuk membuka"}
                </span>
              </div>

              <FloatingArrow ref={arrowRef} context={context} fill="#0f172a" />
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

export const RegisterSelector: React.FC<RegisterSelectorProps> = ({
  registers,
  selectedCode,
  onSelect,
}) => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Semua");

  const categories = useMemo(() => {
    const unique = Array.from(new Set(registers.map((r) => r.category)));
    return ["Semua", ...unique];
  }, [registers]);

  const filteredRegisters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registers.filter((reg) => {
      const matchesCategory =
        q.length > 0 || activeCategory === "Semua" || reg.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      const shortLabel = getShortLabel(reg).toLowerCase();
      return (
        reg.code.toLowerCase().includes(q) ||
        reg.title.toLowerCase().includes(q) ||
        shortLabel.includes(q) ||
        reg.category.toLowerCase().includes(q) ||
        (reg.subtitle && reg.subtitle.toLowerCase().includes(q))
      );
    });
  }, [registers, search, activeCategory]);

  const activeReg = registers.find((r) => r.code === selectedCode);

  return (
    <section
      aria-label="Pemilih Buku Register Intelijen"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs mb-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 shrink-0 text-emerald-700" />
            <h2 className="text-sm font-bold tracking-tight text-slate-900">
              Buku Register Administrasi Intelijen
            </h2>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            <span>22 Format Standar R.IN</span>
            {activeReg && (
              <>
                <span aria-hidden="true" className="mx-1.5 text-slate-300">·</span>
                <span className="font-medium text-emerald-800">
                  Aktif: {activeReg.code} — {getShortLabel(activeReg)}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="relative w-full lg:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            id="input-search-register"
            type="text"
            placeholder="Cari R.IN.1, surat, operasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-8 text-xs text-slate-800 placeholder:text-slate-400 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Hapus pencarian register"
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Kategori Segmented Control */}
      <div className="mb-3 flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
        {categories.map((cat) => {
          const isCatActive = !search.trim() && activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setActiveCategory(cat);
                if (search) setSearch("");
              }}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                isCatActive
                  ? "bg-white font-semibold text-emerald-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Grid Card R.IN.1 s/d R.IN.22 */}
      {filteredRegisters.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filteredRegisters.map((reg) => (
            <RegisterCard
              key={reg.code}
              reg={reg}
              isSelected={reg.code === selectedCode}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-500">
          Register dengan kata kunci "{search}" tidak ditemukan.
        </div>
      )}
    </section>
  );
};
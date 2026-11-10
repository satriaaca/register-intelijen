import React, { useRef, useState } from "react";
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
import { Search } from "lucide-react";

type RegisterItem = RegisterDefinition & { entryCount?: number };

interface RegisterSelectorProps {
  registers: RegisterItem[];
  selectedCode: string;
  onSelect: (code: string) => void;
}

interface RegisterChipProps {
  reg: RegisterItem;
  isSelected: boolean;
  onSelect: (code: string) => void;
}

const RegisterChip: React.FC<RegisterChipProps> = ({ reg, isSelected, onSelect }) => {
  const [open, setOpen] = useState(false);
  const arrowRef = useRef<SVGSVGElement>(null);
  const count = reg.entryCount ?? 0;

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

  const hover = useHover(context, { move: false, delay: { open: 100, close: 0 } });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  return (
    <>
      <button
        ref={refs.setReference}
        id={`btn-select-${reg.code.toLowerCase().replace(/\./g, "-")}`}
        aria-pressed={isSelected}
        aria-label={`${reg.code} ${reg.title}, ${count} entri`}
        {...getReferenceProps({ onClick: () => onSelect(reg.code) })}
        className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-mono font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${
          isSelected
            ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
            : count > 0
            ? "bg-slate-50 text-slate-800 border-slate-200 hover:bg-white hover:border-emerald-500 hover:-translate-y-px hover:shadow-sm"
            : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-white hover:border-slate-300 hover:-translate-y-px"
        }`}
      >
        <span>{reg.code}</span>
        <span
          className={`px-1.5 rounded text-[10px] ${
            isSelected
              ? "bg-white/20 text-white"
              : count > 0
              ? "bg-emerald-100 text-emerald-900"
              : "bg-slate-200 text-slate-500"
          }`}
        >
          {count}
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
              className="w-60 rounded-lg bg-slate-900 text-white p-2.5 shadow-lg font-sans"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] font-bold text-emerald-300">
                  {reg.code}
                </span>
                <span
                  className={`text-[9px] uppercase font-bold px-1 rounded ${
                    reg.orientation === "landscape"
                      ? "bg-amber-400/20 text-amber-300"
                      : "bg-sky-400/20 text-sky-300"
                  }`}
                >
                  {reg.orientation === "landscape" ? "Landscape" : "Portrait"}
                </span>
              </div>

              <p className="text-xs font-semibold leading-snug">{reg.title}</p>
              {reg.subtitle && (
                <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                  {reg.subtitle}
                </p>
              )}

              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/10 text-[10px] text-slate-300">
                <span>{reg.category}</span>
                <span className={count > 0 ? "text-emerald-300 font-semibold" : "text-slate-500"}>
                  {count > 0 ? `${count} entri` : "Belum ada entri"}
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

  const filteredRegisters = registers.filter((reg) => {
    const q = search.toLowerCase();
    return (
      reg.code.toLowerCase().includes(q) ||
      reg.title.toLowerCase().includes(q) ||
      (reg.subtitle && reg.subtitle.toLowerCase().includes(q))
    );
  });

  const totalEntries = registers.reduce((sum, r) => sum + (r.entryCount ?? 0), 0);

  return (
    <div className="bg-white rounded-lg shadow-2xs border border-slate-200 p-3 mb-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-tight">
            Pilih Register ({registers.length} Format R.IN)
          </h2>
          <p className="text-[11px] text-slate-500">Total {totalEntries} entri tercatat</p>
        </div>
        <div className="relative w-full sm:w-52">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            id="input-search-register"
            type="text"
            placeholder="Cari R.IN.1 atau judul..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filteredRegisters.map((reg) => (
          <RegisterChip
            key={reg.code}
            reg={reg}
            isSelected={reg.code === selectedCode}
            onSelect={onSelect}
          />
        ))}
        {filteredRegisters.length === 0 && (
          <p className="text-xs text-slate-500 py-1">Register tidak ditemukan.</p>
        )}
      </div>
    </div>
  );
};
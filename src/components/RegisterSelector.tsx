import React, { useState } from "react";
import { RegisterDefinition } from "../types.js";
import { Search } from "lucide-react";

interface RegisterSelectorProps {
  registers: (RegisterDefinition & { entryCount?: number })[];
  selectedCode: string;
  onSelect: (code: string) => void;
}

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
      reg.title.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-lg shadow-2xs border border-slate-200 p-3 mb-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-tight">
          Pilih Register ({registers.length} Format R.IN)
        </h2>
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
        {filteredRegisters.map((reg) => {
          const isSelected = reg.code === selectedCode;
          const count = reg.entryCount ?? 0;
          return (
            <button
              key={reg.code}
              id={`btn-select-${reg.code.toLowerCase().replace(/\./g, "-")}`}
              onClick={() => onSelect(reg.code)}
              title={reg.title}
              className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-mono font-bold transition-colors ${
                isSelected
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
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
          );
        })}
        {filteredRegisters.length === 0 && (
          <p className="text-xs text-slate-500 py-1">Register tidak ditemukan.</p>
        )}
      </div>
    </div>
  );
};
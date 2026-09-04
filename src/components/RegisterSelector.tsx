import React, { useState } from "react";
import { RegisterDefinition } from "../types.js";
import { Search, Layers } from "lucide-react";

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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "Semua (23)" },
    { id: "Surat & Berita", label: "Surat & Sandi" },
    { id: "Kerja & Produk", label: "Kerja & Produk" },
    { id: "Kegiatan Intelijen", label: "Kegiatan Intel" },
    { id: "Operasi Intelijen", label: "Operasi Intel" },
    { id: "Layanan & Penyuluhan", label: "Binluhkum & Yanmas" },
  ];

  const filteredRegisters = registers.filter((reg) => {
    const matchCategory = selectedCategory === "all" || reg.category === selectedCategory;
    const matchSearch =
      reg.code.toLowerCase().includes(search.toLowerCase()) ||
      reg.title.toLowerCase().includes(search.toLowerCase()) ||
      (reg.subtitle && reg.subtitle.toLowerCase().includes(search.toLowerCase()));
    return matchCategory && matchSearch;
  });

  return (
    <div className="bg-white rounded-lg shadow-2xs border border-slate-200 p-3.5 mb-5">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-emerald-700" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-tight">
            Pilih Buku Register Intelijen RI (23 Format R.IN)
          </h2>
        </div>

        {/* Compact Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            id="input-search-register"
            type="text"
            placeholder="Cari R.IN.1 atau judul..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition"
          />
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2.5 scrollbar-thin">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* High Density Grid of 23 Register Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
        {filteredRegisters.map((reg) => {
          const isSelected = reg.code === selectedCode;
          return (
            <button
              key={reg.code}
              id={`btn-select-${reg.code.toLowerCase().replace(/\./g, "-")}`}
              onClick={() => onSelect(reg.code)}
              className={`text-left p-2.5 rounded border transition-all relative flex flex-col justify-between ${
                isSelected
                  ? "bg-emerald-50/90 border-emerald-600 ring-1 ring-emerald-600 shadow-2xs"
                  : "bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                      isSelected
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-200 text-slate-800"
                    }`}
                  >
                    {reg.code}
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[9px] uppercase font-bold px-1 py-0.2 rounded border ${
                        reg.orientation === "landscape"
                          ? "bg-amber-50 text-amber-800 border-amber-300"
                          : "bg-blue-50 text-blue-800 border-blue-300"
                      }`}
                    >
                      {reg.orientation === "landscape" ? "L" : "P"}
                    </span>
                    {(reg.entryCount ?? 0) > 0 && (
                      <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-1.5 py-0.2 rounded">
                        {reg.entryCount}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-xs font-semibold text-slate-900 line-clamp-2 leading-tight">
                  {reg.title}
                </h3>

                {reg.subtitle && (
                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                    {reg.subtitle}
                  </p>
                )}
              </div>

              <div className="mt-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                <span>{reg.category}</span>
                <span className={`font-semibold ${isSelected ? "text-emerald-700" : "text-slate-400"}`}>
                  {isSelected ? "● Terpilih" : "Buka →"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

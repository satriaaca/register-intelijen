import React, { useState, useEffect } from "react";
import { RegisterDefinition, RegisterEntryRow, Officer, ColumnDefinition, RIN3_CATEGORIES } from "../types.js";
import { X, Check, Calendar, Clock, Users, Plus, Trash2, Layers } from "lucide-react";

interface EntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entryData: { id?: number; nomorUrut: number; tgl?: string; waktu?: string; data: Record<string, any> }) => void;
  register: RegisterDefinition;
  initialEntry?: RegisterEntryRow | null;
  officers: Officer[];
  nextNomorUrut: number;
  selectedYear?: number;
  selectedMonth?: number | "all";
}

export const EntryFormModal: React.FC<EntryFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  register,
  initialEntry,
  officers,
  nextNomorUrut,
  selectedYear = new Date().getFullYear(),
  selectedMonth = "all",
}) => {
  const [nomorUrut, setNomorUrut] = useState<number>(nextNomorUrut);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [officerSearch, setOfficerSearch] = useState<string>("");
  const [storageCodesList, setStorageCodesList] = useState<Array<{ kode: string; asal: string }>>([]);

  useEffect(() => {
    if (isOpen && register.code === "R.IN.6") {
      fetch("/api/storage-codes")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setStorageCodesList(data))
        .catch(() => {});
    }
  }, [isOpen, register.code]);

  useEffect(() => {
    if (initialEntry) {
      setNomorUrut(initialEntry.nomorUrut);
      setFormData(initialEntry.data || {});
    } else {
      setNomorUrut(nextNomorUrut);
      // Initialize default date/time fields according to selected year & month
      const initial: Record<string, any> = {};
      
      const targetMonthNum = typeof selectedMonth === "number" ? selectedMonth : new Date().getMonth() + 1;
      const targetMonthStr = String(targetMonthNum).padStart(2, "0");
      const targetYearNum = selectedYear || new Date().getFullYear();
      
      // Default to 1st of selected month/year or today if same month & year
      const now = new Date();
      const isCurrentRealMonth = now.getFullYear() === targetYearNum && (now.getMonth() + 1) === targetMonthNum;
      const defaultDayStr = isCurrentRealMonth ? String(now.getDate()).padStart(2, "0") : "01";
      const defaultDate = `${targetYearNum}-${targetMonthStr}-${defaultDayStr}`;
      const nowTime = now.toTimeString().slice(0, 5);

      register.columns.forEach((c) => {
        if (c.subColumns) {
          c.subColumns.forEach((sc) => {
            if (sc.type === "date") initial[sc.key] = defaultDate;
            if (sc.type === "time") initial[sc.key] = nowTime;
            if (sc.type === "datetime") initial[sc.key] = `${defaultDate} ${nowTime}`;
            if (sc.type === "officer_multi") initial[sc.key] = [];
          });
        } else {
          if (c.type === "date") initial[c.key] = defaultDate;
          if (c.type === "time") initial[c.key] = nowTime;
          if (c.type === "datetime") initial[c.key] = `${defaultDate} ${nowTime}`;
          if (c.type === "officer_multi") initial[c.key] = [];
        }
      });
      setFormData(initial);
    }
  }, [initialEntry, nextNomorUrut, register, isOpen, selectedYear, selectedMonth]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleOfficerToggle = (fieldKey: string, officerId: number) => {
    const currentList: number[] = Array.isArray(formData[fieldKey]) ? formData[fieldKey] : [];
    if (currentList.includes(officerId)) {
      handleChange(fieldKey, currentList.filter((id) => id !== officerId));
    } else {
      handleChange(fieldKey, [...currentList, officerId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Extract primary date or time from formData
    let primaryTgl: string | undefined = undefined;

    // Common date field keys
    const priorityDateKeys = [
      "tgl_terima",
      "tgl_surat",
      "tanggal",
      "tgl",
      "tgl_diterima",
      "tgl_dikirim",
      "tgl_lapinhar",
      "tgl_lapinsus",
      "tgl_lapintel",
      "tgl_prodin",
      "pemaparan_tanggal",
      "tgl_permohonan",
      "tgl_mulai",
      "tgl_selesai",
      "tgl_kegiatan",
      "tgl_operasi",
      "waktu_diterima",
      "waktu_terima",
      "waktu_lapor",
      "waktu",
    ];

    for (const key of priorityDateKeys) {
      if (formData[key] && typeof formData[key] === "string" && formData[key].trim()) {
        const match = formData[key].match(/\d{4}-\d{2}-\d{2}/);
        if (match) {
          primaryTgl = match[0];
          break;
        }
      }
    }

    // If still not found, check any key in formData
    if (!primaryTgl) {
      for (const val of Object.values(formData)) {
        if (typeof val === "string") {
          const match = val.match(/\d{4}-\d{2}-\d{2}/);
          if (match) {
            primaryTgl = match[0];
            break;
          }
        }
      }
    }

    // If no date was entered in any field, use the selected period's month & year
    if (!primaryTgl) {
      const mStr = typeof selectedMonth === "number" ? String(selectedMonth).padStart(2, "0") : "01";
      primaryTgl = `${selectedYear}-${mStr}-01`;
    }

    let primaryWaktu = formData.jam_terima || formData.waktu || formData.waktu_kejadian;
    if (typeof primaryWaktu === "string" && primaryWaktu.includes(" ")) {
      primaryWaktu = primaryWaktu.split(" ")[1];
    }

    onSave({
      id: initialEntry?.id,
      nomorUrut: Number(nomorUrut) || 1,
      tgl: primaryTgl,
      waktu: primaryWaktu || undefined,
      data: formData,
    });
    onClose();
  };

  // Helper to render individual input by type
  const renderField = (col: { key: string; label: string; type: string; options?: string[]; placeholder?: string }) => {
    const val = formData[col.key] ?? "";

    if (col.type === "date") {
      return (
        <div className="relative">
          <input
            type="date"
            id={`input-field-${col.key}`}
            value={val}
            onChange={(e) => handleChange(col.key, e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
          />
        </div>
      );
    }

    if (col.type === "time") {
      return (
        <div className="relative">
          <input
            type="time"
            id={`input-field-${col.key}`}
            value={val}
            onChange={(e) => handleChange(col.key, e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
          />
        </div>
      );
    }

    if (col.type === "datetime") {
      return (
        <div className="grid grid-cols-2 gap-1.5">
          <input
            type="date"
            id={`input-field-${col.key}-date`}
            value={typeof val === "string" ? val.split(" ")[0] || "" : ""}
            onChange={(e) => {
              const timePart = typeof val === "string" && val.includes(" ") ? val.split(" ")[1] : "09:00";
              handleChange(col.key, `${e.target.value} ${timePart}`);
            }}
            className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
          />
          <input
            type="time"
            id={`input-field-${col.key}-time`}
            value={typeof val === "string" && val.includes(" ") ? val.split(" ")[1] : "09:00"}
            onChange={(e) => {
              const datePart = typeof val === "string" && val.includes(" ") ? val.split(" ")[0] : new Date().toISOString().split("T")[0];
              handleChange(col.key, `${datePart} ${e.target.value}`);
            }}
            className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
          />
        </div>
      );
    }

    if (col.type === "select") {
      return (
        <select
          id={`select-field-${col.key}`}
          value={val}
          onChange={(e) => handleChange(col.key, e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
        >
          <option value="">-- Pilih {col.label} --</option>
          {(col.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (col.type === "officer_single") {
      return (
        <select
          id={`select-officer-${col.key}`}
          value={val}
          onChange={(e) => handleChange(col.key, Number(e.target.value) || e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
        >
          <option value="">-- Pilih Petugas --</option>
          {officers.map((off) => (
            <option key={off.id} value={off.id}>
              {off.nama} ({off.pangkat} / NIP. {off.nip})
            </option>
          ))}
        </select>
      );
    }

    if (col.type === "officer_multi") {
      const selectedIds: number[] = Array.isArray(val) ? val : [];
      const filteredOfficers = officers.filter((o) =>
        o.nama.toLowerCase().includes(officerSearch.toLowerCase()) ||
        o.nip.toLowerCase().includes(officerSearch.toLowerCase()) ||
        o.pangkat.toLowerCase().includes(officerSearch.toLowerCase())
      );

      return (
        <div className="border border-slate-300 rounded p-2.5 bg-slate-50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase">
              Petugas Pelaksana ({selectedIds.length} Terpilih)
            </span>
            <input
              type="text"
              placeholder="Cari nama/NIP..."
              value={officerSearch}
              onChange={(e) => setOfficerSearch(e.target.value)}
              className="text-xs px-2 py-0.5 bg-white border border-slate-300 rounded w-36"
            />
          </div>

          {/* Selected Badges */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-1 p-1.5 bg-emerald-50 border border-emerald-200 rounded">
              {selectedIds.map((id) => {
                const off = officers.find((o) => o.id === id);
                if (!off) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 bg-white border border-emerald-300 text-emerald-900 text-[10px] px-1.5 py-0.5 rounded shadow-2xs"
                  >
                    <span className="font-semibold">{off.nama}</span>
                    <button
                      type="button"
                      onClick={() => handleOfficerToggle(col.key, id)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Officer Options List */}
          <div className="max-h-36 overflow-y-auto space-y-1 bg-white p-1.5 rounded border border-slate-200">
            {filteredOfficers.length === 0 ? (
              <p className="text-[11px] text-slate-400 p-2 text-center">
                Tidak ada petugas ditemukan di database. Tambahkan petugas baru di Menu Petugas.
              </p>
            ) : (
              filteredOfficers.map((off) => {
                const isChecked = selectedIds.includes(off.id);
                return (
                  <label
                    key={off.id}
                    className={`flex items-start gap-1.5 p-1 rounded cursor-pointer text-xs transition ${
                      isChecked ? "bg-emerald-50 text-emerald-950 font-medium" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleOfficerToggle(col.key, off.id)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="leading-tight">
                      <div className="font-bold text-slate-900 text-[11px]">{off.nama}</div>
                      <div className="text-[10px] text-slate-500">
                        {off.pangkat} — NIP. {off.nip} {off.jabatan ? `(${off.jabatan})` : ""}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      );
    }

    if (col.type === "textarea") {
      return (
        <textarea
          id={`input-field-${col.key}`}
          rows={2}
          value={val}
          placeholder={col.placeholder || `Masukkan ${col.label.toLowerCase()}...`}
          onChange={(e) => handleChange(col.key, e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
        />
      );
    }

    // Default text
    return (
      <>
        <input
          type="text"
          id={`input-field-${col.key}`}
          list={col.key === "kode_penyimpanan" ? "storage-codes-datalist" : undefined}
          value={val}
          placeholder={col.placeholder || `Masukkan ${col.label.toLowerCase()}...`}
          onChange={(e) => handleChange(col.key, e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
        />
        {col.key === "kode_penyimpanan" && (
          <datalist id="storage-codes-datalist">
            {storageCodesList.map((sc, idx) => (
              <option key={idx} value={sc.kode}>
                {sc.asal} ({sc.kode})
              </option>
            ))}
          </datalist>
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-slate-300 animate-in fade-in zoom-in-95 duration-100">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-100/90 rounded-t-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-700 text-white">
                {register.code}
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight">
                {initialEntry ? "Edit Data Baris Register" : "Tambah Data Baru ke Register"}
              </h2>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 line-clamp-1">{register.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Row Number Control */}
          <div className="bg-amber-50/80 border border-amber-300/80 p-2 rounded flex items-center justify-between">
            <label className="text-[11px] font-bold text-amber-900 uppercase">Nomor Urut Buku Register</label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-amber-800">Kolom 1 (NO):</span>
              <input
                type="number"
                id="input-nomor-urut"
                min="1"
                required
                value={nomorUrut}
                onChange={(e) => setNomorUrut(parseInt(e.target.value, 10) || 1)}
                className="w-16 px-2 py-0.5 text-xs font-bold text-center bg-white border border-amber-400 rounded shadow-2xs font-mono"
              />
            </div>
          </div>

          {/* Khusus R.IN.3: Pilihan Bidang / Kategori Intelijen */}
          {register.code === "R.IN.3" && (
            <div className="p-3 bg-emerald-50/70 rounded border border-emerald-300 space-y-1.5">
              <label className="text-[11px] font-bold text-emerald-950 uppercase tracking-tight flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-700" />
                <span>Bidang / Kategori Intelijen (R.IN.3)</span>
              </label>
              <select
                id="select-rin3-category"
                value={formData.kategori || formData.bidang || "IDEOLOGI, POLITIK, PERTAHANAN DAN KEAMANAN"}
                onChange={(e) => {
                  handleChange("kategori", e.target.value);
                  handleChange("bidang", e.target.value);
                }}
                className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-emerald-400 rounded focus:ring-1 focus:ring-emerald-600 text-slate-800"
              >
                {RIN3_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-emerald-800 italic">
                *) Sesuai ketentuan R.IN.3, entri diklasifikasikan ke salah satu dari 5 bidang intelijen.
              </p>
            </div>
          )}

          {/* Dynamic Fields generated based on Document Columns */}
          <div className="space-y-3">
            {register.columns
              .filter((c) => c.key !== "no")
              .map((col) => {
                if (col.subColumns && col.subColumns.length > 0) {
                  return (
                    <div key={col.key} className="p-3 bg-slate-50/80 rounded border border-slate-200 space-y-2.5">
                      <div className="text-[11px] font-bold text-slate-800 uppercase tracking-tight flex items-center justify-between border-b border-slate-200 pb-1">
                        <span>{col.label}</span>
                        <span className="text-[10px] text-slate-400 font-normal">Kolom {col.colNumber}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {col.subColumns.map((sc) => (
                          <div key={sc.key} className="space-y-0.5">
                            <label className="block text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                              <span>{sc.label}</span>
                              <span className="text-[9px] text-slate-400 font-mono">Kol. {sc.colNumber}</span>
                            </label>
                            {renderField(sc)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={col.key} className="space-y-0.5">
                    <label className="block text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                      <span>{col.label}</span>
                      <span className="text-[9px] text-slate-400 font-mono">Kolom {col.colNumber}</span>
                    </label>
                    {renderField(col)}
                  </div>
                );
              })}
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              id="btn-submit-entry"
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simpan ke Database</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

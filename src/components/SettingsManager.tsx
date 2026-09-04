import React, { useState } from "react";
import { AppSettings } from "../types.js";
import { Settings, Save, Check, Building, PenTool, Calendar, Plus, Trash2, AlignCenter, AlignJustify, Database, HardDrive, Download, Upload } from "lucide-react";
import { MONTH_NAMES_ID, getDefaultClosingDate, formatDateIndonesian } from "../lib/date-utils.js";

interface SettingsManagerProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  onOpenArchiveManager?: () => void;
  canManageArchive?: boolean;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  settings,
  onUpdateSettings,
  onOpenArchiveManager,
  canManageArchive = false,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [availableYears, setAvailableYears] = useState<number[]>(
    settings.availableYears && settings.availableYears.length > 0
      ? settings.availableYears
      : [2024, 2025, 2026, 2027, 2028]
  );
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [newYearInput, setNewYearInput] = useState<string>("");
  const [closingDatesState, setClosingDatesState] = useState<Record<string, string>>(
    settings.closingDates || {}
  );
  const [signatureAlignment, setSignatureAlignment] = useState<"split" | "center">(
    settings.signatureAlignment || "split"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleChange = (key: keyof AppSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setSavedSuccess(false);
  };

  const handleClosingDateChange = (monthIdx: number, val: string) => {
    const monthKey = `${selectedYear}-${String(monthIdx + 1).padStart(2, "0")}`;
    setClosingDatesState((prev) => ({ ...prev, [monthKey]: val }));
    setSavedSuccess(false);
  };

  const handleResetMonthClosing = (monthIdx: number) => {
    const def = getDefaultClosingDate(selectedYear, monthIdx + 1);
    handleClosingDateChange(monthIdx, def);
  };

  const handleAddYear = () => {
    const y = parseInt(newYearInput.trim(), 10);
    if (!isNaN(y) && y >= 1990 && y <= 2100) {
      if (!availableYears.includes(y)) {
        const sorted = [...availableYears, y].sort((a, b) => a - b);
        setAvailableYears(sorted);
        setSelectedYear(y);
        setNewYearInput("");
        setSavedSuccess(false);
      } else {
        alert(`Tahun ${y} sudah ada dalam daftar.`);
      }
    } else {
      alert("Masukkan 4 digit angka tahun yang valid (contoh: 2029).");
    }
  };

  const handleRemoveYear = (y: number) => {
    if (availableYears.length <= 1) {
      alert("Minimal harus ada 1 tahun dalam daftar.");
      return;
    }
    const filtered = availableYears.filter((item) => item !== y);
    setAvailableYears(filtered);
    if (selectedYear === y) {
      setSelectedYear(filtered[0]);
    }
    setSavedSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onUpdateSettings({
        ...formData,
        availableYears,
        signatureAlignment,
        closingDates: closingDatesState,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert("Gagal menyimpan pengaturan: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* High Density Header */}
      <div className="bg-white rounded-lg shadow-2xs border border-slate-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm sm:text-base font-bold text-slate-800 uppercase tracking-tight">
              Pengaturan Satker, Penandatangan & Tahun
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Konfigurasi kepala satuan kerja (Kajari), Kasi Intelijen, format posisi tanda tangan (Center / Kiri-Kanan), kelola tahun , serta tanggal penutupan register tiap bulan.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300 font-medium">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tersimpan!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Satuan Kerja & Tempat */}
        <div className="bg-white rounded-lg shadow-2xs border border-slate-200 p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 uppercase">
            <Building className="w-3.5 h-3.5 text-emerald-700" />
            Identitas Satuan Kerja Kejaksaan
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Nama Kejaksaan (Kop Dokumen)
              </label>
              <input
                type="text"
                id="input-setting-kejaksaan"
                value={formData.kejaksaanName}
                onChange={(e) => handleChange("kejaksaanName", e.target.value)}
                required
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
              />
              <span className="text-[10px] text-slate-400">Contoh: KEJAKSAAN NEGERI TABANAN</span>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Tempat Pembuatan Dokumen
              </label>
              <input
                type="text"
                id="input-setting-tempat"
                value={formData.tempatDokumen}
                onChange={(e) => handleChange("tempatDokumen", e.target.value)}
                required
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
              />
              <span className="text-[10px] text-slate-400">Contoh: Tabanan</span>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Tanggal Dokumen Default
              </label>
              <input
                type="date"
                id="input-setting-tanggal"
                value={formData.tanggalDokumen || ""}
                onChange={(e) => handleChange("tanggalDokumen", e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
              />
              <span className="text-[10px] text-slate-400">Digunakan jika periode bulanan tidak dipilih</span>
            </div>
          </div>
        </div>

        {/* Manajemen Tahun & Format Penandatangan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kelola Daftar Tahun */}
          <div className="bg-white rounded-lg shadow-2xs border border-slate-200 p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 uppercase">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              Kelola Daftar Tahun
            </h3>
            <p className="text-[11px] text-slate-500">
              Tambahkan tahun baru (misal: 2027, 2028, 2029) agar muncul pada seleksi register & laporan:
            </p>

            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Contoh: 2029"
                value={newYearInput}
                onChange={(e) => setNewYearInput(e.target.value)}
                min={1990}
                max={2100}
                className="w-32 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white font-mono"
              />
              <button
                type="button"
                onClick={handleAddYear}
                className="px-3 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Tahun</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {availableYears.map((yr) => (
                <div
                  key={yr}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border ${
                    selectedYear === yr
                      ? "bg-emerald-100 border-emerald-400 text-emerald-900 font-bold"
                      : "bg-slate-100 border-slate-300 text-slate-700"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedYear(yr)}
                    className="hover:underline cursor-pointer"
                    title="Pilih tahun untuk atur tanggal penutupan di bawah"
                  >
                    {yr}
                  </button>
                  {availableYears.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveYear(yr)}
                      className="text-slate-400 hover:text-red-600 p-0.5"
                      title={`Hapus tahun ${yr}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Posisi & Alignment Penandatangan (Center vs Kiri-Kanan) */}
          <div className="bg-white rounded-lg shadow-2xs border border-slate-200 p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 uppercase">
              <PenTool className="w-3.5 h-3.5 text-emerald-700" />
              Format Posisi Tanda Tangan
            </h3>
            <p className="text-[11px] text-slate-500">
              Pilih perataan tanda tangan untuk dokumen register dan cetakan PDF:
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <label
                className={`p-2.5 rounded border cursor-pointer flex flex-col justify-between transition ${
                  signatureAlignment === "center"
                    ? "bg-emerald-50 border-emerald-600 text-emerald-900 ring-1 ring-emerald-600"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="signatureAlignment"
                    value="center"
                    checked={signatureAlignment === "center"}
                    onChange={() => {
                      setSignatureAlignment("center");
                      setSavedSuccess(false);
                    }}
                    className="text-emerald-700 focus:ring-emerald-600"
                  />
                  <span className="font-bold text-xs flex items-center gap-1">
                    <AlignCenter className="w-3.5 h-3.5 text-emerald-700" />
                    Center (Tengah)
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 pl-5">
                  Tanda tangan pimpinan & Kasi Intelijen terpusat (<strong>Center</strong>).
                </p>
              </label>

              <label
                className={`p-2.5 rounded border cursor-pointer flex flex-col justify-between transition ${
                  signatureAlignment === "split"
                    ? "bg-emerald-50 border-emerald-600 text-emerald-900 ring-1 ring-emerald-600"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="signatureAlignment"
                    value="split"
                    checked={signatureAlignment === "split"}
                    onChange={() => {
                      setSignatureAlignment("split");
                      setSavedSuccess(false);
                    }}
                    className="text-emerald-700 focus:ring-emerald-600"
                  />
                  <span className="font-bold text-xs flex items-center gap-1">
                    <AlignJustify className="w-3.5 h-3.5 text-slate-700" />
                    Kiri - Kanan
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 pl-5">
                  Pimpinan di <strong>Kiri</strong>, Kasi Intelijen di <strong>Kanan</strong>.
                </p>
              </label>
            </div>
          </div>
        </div>

        {/* Tanggal Penutupan Register Tiap Bulan (Monthly Closing Dates Table) */}
        <div className="bg-white rounded-lg shadow-2xs border border-slate-200 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                Tanggal Penutupan Buku Register Tiap Bulan ({selectedYear})
              </h3>
              <p className="text-[11px] text-slate-500">
                Sesuaikan tanggal penutupan per bulan untuk tahun yang dipilih:
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-700">Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded font-bold text-slate-900"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {MONTH_NAMES_ID.map((monthName, idx) => {
              const monthKey = `${selectedYear}-${String(idx + 1).padStart(2, "0")}`;
              const defaultClosing = getDefaultClosingDate(selectedYear, idx + 1);
              const currentVal = closingDatesState[monthKey] || defaultClosing;

              return (
                <div
                  key={monthKey}
                  className="p-2.5 rounded border border-slate-200 bg-slate-50/70 hover:bg-white transition flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900">
                      {idx + 1}. {monthName} {selectedYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleResetMonthClosing(idx)}
                      className="text-[10px] text-slate-400 hover:text-emerald-700 underline"
                      title="Kembalikan ke akhir bulan kalender"
                    >
                      Reset Default
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-600">
                      Tanggal Penutupan Register:
                    </label>
                    <input
                      type="date"
                      value={currentVal}
                      onChange={(e) => handleClosingDateChange(idx, e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 font-mono"
                    />
                    <p className="text-[10px] text-slate-500 font-medium">
                      Ditutup: {formatDateIndonesian(currentVal, true)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dual Signers Setup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Signer (Kepala Kejaksaan Negeri Tabanan) */}
          <div className="bg-white rounded-lg shadow-2xs border border-slate-200 p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 uppercase">
              <PenTool className="w-3.5 h-3.5 text-emerald-700" />
              Penandatangan 1 (Pimpinan / Kajari)
            </h3>

            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Jabatan Penandatangan Pimpinan
                </label>
                <textarea
                  rows={2}
                  id="input-setting-left-title"
                  value={formData.leftSignerTitle}
                  onChange={(e) => handleChange("leftSignerTitle", e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
                />
                <span className="text-[10px] text-slate-400">Default: Mengetahui: KEPALA KEJAKSAAN NEGERI TABANAN</span>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Nama Pejabat Pimpinan
                </label>
                <input
                  type="text"
                  id="input-setting-left-name"
                  value={formData.leftSignerName}
                  onChange={(e) => handleChange("leftSignerName", e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Pangkat & NIP Pimpinan
                </label>
                <input
                  type="text"
                  id="input-setting-left-pangkat"
                  value={formData.leftSignerPangkatNip}
                  onChange={(e) => handleChange("leftSignerPangkatNip", e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Right Signer (Kepala Seksi Intelijen) */}
          <div className="bg-white rounded-lg shadow-2xs border border-slate-200 p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 uppercase">
              <PenTool className="w-3.5 h-3.5 text-emerald-700" />
              Penandatangan 2 (Kasi Intelijen)
            </h3>

            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Jabatan Penandatangan Kasi Intelijen
                </label>
                <input
                  type="text"
                  id="input-setting-right-title"
                  value={formData.rightSignerTitle}
                  onChange={(e) => handleChange("rightSignerTitle", e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
                />
                <span className="text-[10px] text-slate-400">Default: KEPALA SEKSI INTELIJEN</span>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Nama Kepala Seksi Intelijen
                </label>
                <input
                  type="text"
                  id="input-setting-right-name"
                  value={formData.rightSignerName}
                  onChange={(e) => handleChange("rightSignerName", e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Pangkat & NIP Kasi Intelijen
                </label>
                <input
                  type="text"
                  id="input-setting-right-pangkat"
                  value={formData.rightSignerPangkatNip}
                  onChange={(e) => handleChange("rightSignerPangkatNip", e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Database Capacity & Archive Management (3-Year Retention) - Khusus hijau.kn.tabanan@gmail */}
        {canManageArchive && (
          <div className="bg-white rounded-lg shadow-2xs border border-emerald-200/80 p-4 space-y-3 bg-gradient-to-br from-white to-emerald-50/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase">
                  <Database className="w-3.5 h-3.5 text-emerald-700" />
                  Kapasitas Database & Manajemen Arsip (Retensi 3 Tahun)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Mekanisme pengarsipan data tahun lama ke Google Drive / JSON dan pemulihan data on-demand untuk menjaga batas resource Neon Database.
                </p>
              </div>
              {onOpenArchiveManager && (
                <button
                  type="button"
                  onClick={onOpenArchiveManager}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-xs font-bold shadow-2xs transition cursor-pointer self-start sm:self-auto"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Buka Manajemen Arsip & Restore</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block">Kebijakan Retensi Aktif</span>
                <span className="text-xs font-bold text-emerald-900 block mt-0.5">
                  3 Tahun Terakhir (Aktif di DB)
                </span>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                  Data &gt; 3 tahun dapat diekspor ke format JSON dan dikosongkan dari DB.
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block">Pencadangan Google Drive</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">
                  File Cadangan Mandiri (.json)
                </span>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                  Menyimpan seluruh data entri R.IN.1–R.IN.23 beserta kunci penandatangan.
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block">Pemulihan Data (Restore)</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">
                  On-Demand Restore Kapan Saja
                </span>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                  Bila diperlukan audit tahun lama, unggah kembali file JSON untuk me-restore data seketika.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Bar */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            id="btn-save-settings"
            disabled={isSaving}
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Menyimpan..." : "Simpan Semua Pengaturan"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

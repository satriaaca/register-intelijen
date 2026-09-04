import React, { useState } from "react";
import { Officer } from "../types.js";
import { Users, UserPlus, Trash2, Edit3, Search, Check, X, Shield, AlertCircle } from "lucide-react";

interface OfficersManagerProps {
  officers: Officer[];
  onAddOfficer: (officer: { nama: string; pangkat: string; nip: string; jabatan?: string }) => Promise<void>;
  onUpdateOfficer: (id: number, officer: Partial<Officer>) => Promise<void>;
  onDeleteOfficer: (id: number) => Promise<void>;
}

export const OfficersManager: React.FC<OfficersManagerProps> = ({
  officers,
  onAddOfficer,
  onUpdateOfficer,
  onDeleteOfficer,
}) => {
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [officerToDelete, setOfficerToDelete] = useState<Officer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [nama, setNama] = useState("");
  const [pangkat, setPangkat] = useState("");
  const [nip, setNip] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const PANGKAT_PRESETS = [
    "Jaksa Utama Madya (IV/d)",
    "Jaksa Utama Pratama (IV/b)",
    "Jaksa Madya (IV/a)",
    "Jaksa Muda (III/d)",
    "Jaksa Pratama (III/c)",
    "Ajun Jaksa (III/b)",
    "Ajun Jaksa Madya (III/a)",
    "Sena Wira (III/d)",
    "Madya Wira (III/c)",
    "Muda Wira (III/b)",
    "Yuana Wira (III/a)",
    "Sena Darma (II/d)",
    "Madya Darma (II/c)",
    "Muda Darma (II/b)",
    "Yuana Darma (II/a)"
  ];

  const resetForm = () => {
    setNama("");
    setPangkat("");
    setNip("");
    setJabatan("");
    setIsAdding(false);
    setEditingId(null);
    setErrorMsg("");
  };

  const handleStartEdit = (off: Officer) => {
    setEditingId(off.id);
    setNama(off.nama);
    setPangkat(off.pangkat);
    setNip(off.nip);
    setJabatan(off.jabatan || "");
    setIsAdding(true);
    setErrorMsg("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !pangkat.trim() || !nip.trim()) {
      setErrorMsg("Nama, Pangkat, dan NIP/NRP wajib diisi!");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");

      if (editingId) {
        await onUpdateOfficer(editingId, {
          nama: nama.trim(),
          pangkat: pangkat.trim(),
          nip: nip.trim(),
          jabatan: jabatan.trim() || undefined,
        });
      } else {
        await onAddOfficer({
          nama: nama.trim(),
          pangkat: pangkat.trim(),
          nip: nip.trim(),
          jabatan: jabatan.trim() || undefined,
        });
      }
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan data petugas");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!officerToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteOfficer(officerToDelete.id);
      setOfficerToDelete(null);
    } catch (err: any) {
      console.error("Gagal menghapus petugas:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredOfficers = officers.filter(
    (o) =>
      o.nama.toLowerCase().includes(search.toLowerCase()) ||
      o.nip.toLowerCase().includes(search.toLowerCase()) ||
      o.pangkat.toLowerCase().includes(search.toLowerCase()) ||
      (o.jabatan && o.jabatan.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* High Density Header & Action bar */}
      <div className="bg-white rounded-lg shadow-2xs border border-slate-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm sm:text-base font-bold text-slate-800 uppercase tracking-tight">
              Manajemen Data Petugas Pelaksana Intelijen
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Daftar petugas pelaksana yang dapat dipilih pada kolom Nama Petugas Pelaksana di seluruh 23 buku register.
          </p>
        </div>

        <button
          id="btn-add-officer-main"
          onClick={() => {
            resetForm();
            setIsAdding(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold shadow-2xs transition cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Tambah Petugas Baru</span>
        </button>
      </div>

      {/* Add / Edit Form Panel */}
      {isAdding && (
        <div className="bg-white rounded-lg shadow-xs border border-emerald-600/60 p-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase">
              <Shield className="w-3.5 h-3.5 text-emerald-700" />
              {editingId ? "Edit Data Petugas Intelijen" : "Tambah Petugas Intelijen Baru"}
            </h3>
            <button
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Nama Lengkap & Gelar <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="input-officer-nama"
                placeholder="Contoh: I GUSTI NGURAH ANOM SUKASIH, S.H."
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                NIP / NRP <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="input-officer-nip"
                placeholder="Contoh: 19820815 200712 1 001"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Pangkat / Golongan <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  id="input-officer-pangkat"
                  placeholder="Ketik atau pilih preset..."
                  value={pangkat}
                  onChange={(e) => setPangkat(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
                />
                <select
                  onChange={(e) => {
                    if (e.target.value) setPangkat(e.target.value);
                  }}
                  className="text-xs border border-slate-300 rounded px-2 bg-slate-100 text-slate-700"
                >
                  <option value="">Preset</option>
                  {PANGKAT_PRESETS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Jabatan / Posisi Penugasan
              </label>
              <input
                type="text"
                id="input-officer-jabatan"
                placeholder="Contoh: Kasubsi Hankam / Jaksa Fungsional"
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2 pt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition"
              >
                Batal
              </button>
              <button
                type="submit"
                id="btn-save-officer"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded shadow-2xs flex items-center gap-1 transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{editingId ? "Perbarui Data Petugas" : "Simpan Petugas"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* High Density Officers Table */}
      <div className="bg-white rounded-lg shadow-2xs border border-slate-200 overflow-hidden">
        {/* Search Header */}
        <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-slate-50/60">
          <div className="text-xs font-bold text-slate-700">
            Total Terdaftar: <span className="text-emerald-700 font-mono">{officers.length} Petugas</span>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              id="input-search-officers"
              placeholder="Cari nama, NIP, pangkat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200 text-[10px]">
              <tr>
                <th className="px-3 py-2 w-10 text-center">NO</th>
                <th className="px-3 py-2">NAMA PETUGAS</th>
                <th className="px-3 py-2">PANGKAT / GOLONGAN</th>
                <th className="px-3 py-2">NIP / NRP</th>
                <th className="px-3 py-2">JABATAN</th>
                <th className="px-3 py-2 text-center w-20">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredOfficers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    Tidak ada data petugas yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredOfficers.map((off, index) => (
                  <tr key={off.id} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-2 text-center font-mono text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-900">
                      {off.nama}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 text-[11px]">
                        {off.pangkat}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-700 text-[11px]">
                      {off.nip}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {off.jabatan || "-"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          id={`btn-edit-officer-${off.id}`}
                          onClick={() => handleStartEdit(off)}
                          title="Edit Petugas"
                          className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-officer-${off.id}`}
                          onClick={() => setOfficerToDelete(off)}
                          title="Hapus Petugas"
                          className="p-1 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {officerToDelete && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Petugas</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus data petugas <strong className="text-slate-900">{officerToDelete.nama}</strong> ({officerToDelete.pangkat} / NIP: {officerToDelete.nip})? Tindakan ini akan menghapus data petugas dari daftar pilihan.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setOfficerToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
              <button
                id="btn-confirm-delete-officer"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Petugas"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

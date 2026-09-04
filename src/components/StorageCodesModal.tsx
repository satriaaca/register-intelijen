import React, { useState, useEffect } from "react";
import { StorageCodeMapping } from "../types.js";
import { authFetch } from "../lib/api.js";
import {
  FolderArchive,
  Plus,
  Trash2,
  Edit2,
  Search,
  Check,
  X,
  AlertCircle,
  Building2,
  Tag,
  FileText,
  RotateCcw,
} from "lucide-react";

interface StorageCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCode?: (code: string) => void;
}

export const StorageCodesModal: React.FC<StorageCodesModalProps> = ({
  isOpen,
  onClose,
  onSelectCode,
}) => {
  const [mappings, setMappings] = useState<StorageCodeMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form fields
  const [kode, setKode] = useState("");
  const [asal, setAsal] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/storage-codes");
      if (res.ok) {
        const data = await res.json();
        setMappings(data);
      }
    } catch (err) {
      console.error("Failed to fetch storage codes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCodes();
    }
  }, [isOpen]);

  const resetForm = () => {
    setKode("");
    setAsal("");
    setKeterangan("");
    setIsAdding(false);
    setEditingId(null);
    setFormError("");
  };

  const handleStartEdit = (item: StorageCodeMapping) => {
    setEditingId(item.id || null);
    setKode(item.kode);
    setAsal(item.asal);
    setKeterangan(item.keterangan || "");
    setIsAdding(true);
    setFormError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kode.trim() || !asal.trim()) {
      setFormError("Nomor / Kode Penyimpanan dan Asal Instansi wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError("");

      const url = editingId ? `/api/storage-codes/${editingId}` : "/api/storage-codes";
      const method = editingId ? "PUT" : "POST";

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kode: kode.trim(),
          asal: asal.trim(),
          keterangan: keterangan.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menyimpan kode penyimpanan");
      }

      await fetchCodes();
      resetForm();
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    try {
      const res = await authFetch(`/api/storage-codes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMappings((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete storage code:", err);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  if (!isOpen) return null;

  const filteredMappings = mappings.filter(m =>
    m.kode.toLowerCase().includes(search.toLowerCase()) ||
    m.asal.toLowerCase().includes(search.toLowerCase()) ||
    (m.keterangan && m.keterangan.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Tabel Kode Penyimpanan Arsip (R.IN.6)
              </h2>
              <p className="text-xs text-slate-500">
                Kelola relasi Nomor/Kode Penyimpanan dengan Asal Surat/Instansi (1 Asal dapat memiliki beberapa Nomor)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Controls / Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan Kode, Nomor, atau Asal Instansi..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            {!isAdding && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsAdding(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-700 rounded-lg hover:bg-amber-800 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Tambah Kode Baru
              </button>
            )}
          </div>

          {/* Form Add / Edit */}
          {isAdding && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-4 animate-scale-up">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                <h3 className="text-sm font-semibold text-amber-950 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-700" />
                  {editingId ? "Edit Kode Penyimpanan" : "Tambah Entri Kode Penyimpanan Baru"}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Batal
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor / Kode Penyimpanan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: ARSIP-01 atau 01"
                    value={kode}
                    onChange={e => setKode(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Kode berkas arsip pada rak/lemari
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asal Instansi / Pengirim Surat *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: KEJAKSAAN TINGGI BALI"
                    value={asal}
                    onChange={e => setAsal(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    1 Asal bisa memiliki beberapa nomor kode
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Keterangan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Arsip Surat Masuk 2026"
                    value={keterangan}
                    onChange={e => setKeterangan(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>

                <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 flex items-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {editingId ? "Perbarui" : "Simpan Kode"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Table List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-40">Nomor / Kode</th>
                  <th className="py-3 px-4">Asal Instansi / Pengirim</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-4 w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Memuat daftar kode penyimpanan...
                    </td>
                  </tr>
                ) : filteredMappings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FolderArchive className="w-8 h-8 text-slate-300" />
                        <p className="text-sm font-medium">Belum ada kode penyimpanan</p>
                        <p className="text-xs text-slate-400">
                          Klik &quot;Tambah Kode Baru&quot; untuk menambahkan relasi nomor dan asal.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMappings.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="py-2.5 px-4 text-center text-slate-500 font-mono text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-amber-900 bg-amber-50/40">
                        {item.kode}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{item.asal}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-xs">
                        {item.keterangan || "-"}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {onSelectCode && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCode(item.kode);
                                onClose();
                              }}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-semibold"
                              title="Pilih Kode Ini"
                            >
                              Pilih
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {confirmDeleteId === item.id ? (
                            <div className="inline-flex items-center gap-1 bg-red-50 p-0.5 rounded border border-red-200">
                              <button
                                type="button"
                                onClick={() => item.id && handleDelete(item.id)}
                                className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 rounded cursor-pointer"
                              >
                                Ya, Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1 py-0.5 text-[10px] text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => item.id && setConfirmDeleteId(item.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Total {filteredMappings.length} Kode Penyimpanan terdaftar
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

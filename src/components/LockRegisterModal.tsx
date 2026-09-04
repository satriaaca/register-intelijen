import React, { useState, useEffect } from "react";
import { AppSettings, RegisterDefinition, RegisterLock } from "../types.js";
import { DEFAULT_SETTINGS } from "../lib/constants.js";
import { Lock, Unlock, ShieldAlert, Check, X, Info } from "lucide-react";
import { authFetch } from "../lib/api.js";

interface LockRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  register: RegisterDefinition;
  settings?: AppSettings;
  currentSettings?: AppSettings;
  periodKey: string;
  periodLabel: string;
  activeClosingDate?: string;
  defaultClosingDate?: string;
  selectedYear?: number;
  selectedMonth?: number | "all";
  currentLock: RegisterLock | null;
  onLockUpdated?: () => void;
  onLockSaved?: (updatedLock: RegisterLock | null) => void;
}

export const LockRegisterModal: React.FC<LockRegisterModalProps> = ({
  isOpen,
  onClose,
  register,
  settings,
  currentSettings,
  periodKey,
  periodLabel,
  activeClosingDate,
  defaultClosingDate,
  currentLock,
  onLockUpdated,
  onLockSaved,
}) => {
  const safeSettings: AppSettings = currentSettings || settings || (DEFAULT_SETTINGS as AppSettings);
  const safeClosingDate = defaultClosingDate || activeClosingDate || new Date().toISOString().split("T")[0];

  const [leftSignerTitle, setLeftSignerTitle] = useState("");
  const [leftSignerName, setLeftSignerName] = useState("");
  const [leftSignerPangkatNip, setLeftSignerPangkatNip] = useState("");
  const [rightSignerTitle, setRightSignerTitle] = useState("");
  const [rightSignerName, setRightSignerName] = useState("");
  const [rightSignerPangkatNip, setRightSignerPangkatNip] = useState("");
  const [signatureAlignment, setSignatureAlignment] = useState<"split" | "center">("split");
  const [tempatDokumen, setTempatDokumen] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (currentLock && currentLock.isLocked) {
        setLeftSignerTitle(currentLock.leftSignerTitle || safeSettings.leftSignerTitle || "");
        setLeftSignerName(currentLock.leftSignerName || safeSettings.leftSignerName || "");
        setLeftSignerPangkatNip(currentLock.leftSignerPangkatNip || safeSettings.leftSignerPangkatNip || "");
        setRightSignerTitle(currentLock.rightSignerTitle || safeSettings.rightSignerTitle || "");
        setRightSignerName(currentLock.rightSignerName || safeSettings.rightSignerName || "");
        setRightSignerPangkatNip(currentLock.rightSignerPangkatNip || safeSettings.rightSignerPangkatNip || "");
        setSignatureAlignment(currentLock.signatureAlignment || safeSettings.signatureAlignment || "split");
        setTempatDokumen(currentLock.tempatDokumen || safeSettings.tempatDokumen || "Tabanan");
        setClosingDate(currentLock.closingDate || safeClosingDate);
      } else {
        setLeftSignerTitle(safeSettings.leftSignerTitle || "");
        setLeftSignerName(safeSettings.leftSignerName || "");
        setLeftSignerPangkatNip(safeSettings.leftSignerPangkatNip || "");
        setRightSignerTitle(safeSettings.rightSignerTitle || "");
        setRightSignerName(safeSettings.rightSignerName || "");
        setRightSignerPangkatNip(safeSettings.rightSignerPangkatNip || "");
        setSignatureAlignment(safeSettings.signatureAlignment || "split");
        setTempatDokumen(safeSettings.tempatDokumen || "Tabanan");
        setClosingDate(safeClosingDate);
      }
    }
  }, [isOpen, currentLock, safeSettings, safeClosingDate]);

  if (!isOpen) return null;

  const handleLockRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await authFetch("/api/register-locks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registerCode: register.code,
          periodKey,
          isLocked: true,
          leftSignerTitle,
          leftSignerName,
          leftSignerPangkatNip,
          rightSignerTitle,
          rightSignerName,
          rightSignerPangkatNip,
          signatureAlignment,
          tempatDokumen,
          closingDate,
          lockedBy: "Petugas / Administrator",
        }),
      });

      const savedLockData = await response.json();
      onLockSaved?.(savedLockData);
      onLockUpdated?.();
      onClose();
    } catch (err: any) {
      console.error("Lock register error:", err);
      setError(err.message || "Terjadi kesalahan saat mengunci register.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlockRegister = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await authFetch("/api/register-locks/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registerCode: register.code,
          periodKey,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal membuka kunci register.");
      }

      onLockSaved?.(null);
      onLockUpdated?.();
      onClose();
    } catch (err: any) {
      console.error("Unlock register error:", err);
      setError(err.message || "Terjadi kesalahan saat membuka kunci register.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCurrentlyLocked = currentLock && currentLock.isLocked;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className={`px-4 py-3.5 flex items-center justify-between border-b ${
          isCurrentlyLocked
            ? "bg-amber-500/10 border-amber-200 text-amber-950"
            : "bg-emerald-500/10 border-emerald-200 text-emerald-950"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              isCurrentlyLocked ? "bg-amber-500 text-white" : "bg-emerald-700 text-white"
            }`}>
              {isCurrentlyLocked ? <Lock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                <span>{isCurrentlyLocked ? "Pengaturan Kunci Register" : "Kunci Penandatangan Register"}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-white">
                  {register.code}
                </span>
              </h2>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Periode: <strong className="font-semibold text-slate-800">{periodLabel}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Modal */}
        <form onSubmit={handleLockRegister} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Penjelasan Fitur Lock */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Prinsip Perlindungan Snapshot Kunci Register:</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Ketika register ini <strong>dikunci</strong>, seluruh data pejabat penandatangan di bawah akan dibekukan khusus untuk periode <strong>{periodLabel}</strong>. Jika di masa mendatang data pejabat pada menu <em>Pengaturan Instansi</em> diperbarui, register ini <strong>tidak akan terpengaruh</strong> sampai kunci dibuka kembali.
            </p>
            {isCurrentlyLocked && currentLock?.lockedAt && (
              <div className="pt-1 text-[10px] font-semibold text-amber-800 flex items-center gap-1 border-t border-slate-200">
                <span>🔒 Register telah dikunci pada: {new Date(currentLock.lockedAt).toLocaleString("id-ID")}</span>
              </div>
            )}
          </div>

          {/* Form Pejabat Kiri (Kajari / Pimpinan) */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1">
              <span>Pejabat Penandatangan Kiri (Mengetahui / Kajari)</span>
              <span className="text-[10px] text-slate-400 font-normal">Snapshot Tersimpan</span>
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">Jabatan / Instansi</label>
                <input
                  type="text"
                  value={leftSignerTitle}
                  onChange={(e) => setLeftSignerTitle(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    value={leftSignerName}
                    onChange={(e) => setLeftSignerName(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">Pangkat / NIP</label>
                  <input
                    type="text"
                    value={leftSignerPangkatNip}
                    onChange={(e) => setLeftSignerPangkatNip(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Pejabat Kanan (Kasi Intel / Pembuat) */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1">
              <span>Pejabat Penandatangan Kanan (Kasi Intel)</span>
              <span className="text-[10px] text-slate-400 font-normal">Snapshot Tersimpan</span>
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">Jabatan / Instansi</label>
                <input
                  type="text"
                  value={rightSignerTitle}
                  onChange={(e) => setRightSignerTitle(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    value={rightSignerName}
                    onChange={(e) => setRightSignerName(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">Pangkat / NIP</label>
                  <input
                    type="text"
                    value={rightSignerPangkatNip}
                    onChange={(e) => setRightSignerPangkatNip(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Detail Lokasi & Tanggal Tutup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">Tempat Pembuatan</label>
              <input
                type="text"
                value={tempatDokumen}
                onChange={(e) => setTempatDokumen(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">Tanggal Tutup Register</label>
              <input
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Footer Tombol Modal */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              {isCurrentlyLocked && (
                <button
                  type="button"
                  onClick={handleUnlockRegister}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-300 hover:bg-red-100 rounded flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Memproses..." : "Buka Kunci (Unlock)"}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Menyimpan..." : isCurrentlyLocked ? "Simpan Perubahan Kunci" : "Kunci Register Sekarang"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

import { useEffect, useState, useRef } from "react";
import { AlertCircle, CheckCircle2, Loader2, LogOut } from "lucide-react";

import { Navbar } from "./components/Navbar.js";
import { RegisterSelector } from "./components/RegisterSelector.js";
import { RegisterDocumentView } from "./components/RegisterDocumentView.js";
import { OfficersManager } from "./components/OfficersManager.js";
import { SettingsManager } from "./components/SettingsManager.js";
import { StorageCodesModal } from "./components/StorageCodesModal.js";
import { ArchiveManagerModal } from "./components/ArchiveManagerModal.js";
import LoginGate from "./components/LoginGate.js";

import {
  logOutFromFirebase,
  subscribeToAuthState,
} from "./lib/firebase.js";
import { authFetch } from "./lib/api.js";

import type {
  AppSettings,
  AppUser,
  Officer,
  RegisterDefinition,
  RegisterEntryRow,
} from "./types.js";

import {
  DEFAULT_SETTINGS,
  REGISTER_DEFINITIONS,
} from "./lib/constants.js";

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<
    "registers" | "officers" | "settings"
  >("registers");

  const [selectedCode, setSelectedCode] = useState("R.IN.1");

  const [registers, setRegisters] = useState<
    (RegisterDefinition & { entryCount?: number })[]
  >(REGISTER_DEFINITIONS);

  const [entries, setEntries] = useState<RegisterEntryRow[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);

  // Client-side in-memory cache untuk entri register agar perpindahan register instan (0ms)
  const entriesCacheRef = useRef<Map<string, RegisterEntryRow[]>>(new Map());

  const [settings, setSettings] = useState<AppSettings>(
    DEFAULT_SETTINGS as AppSettings,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  /*
   * Modal global: dipanggil dari Navbar dan dapat dibuka
   * untuk semua register.
   */
  const [isStorageCodesOpen, setIsStorageCodesOpen] = useState(false);
  const [isArchiveManagerOpen, setIsArchiveManagerOpen] = useState(false);

  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showNotification = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setNotification({ message, type });

    window.setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const [regResponse, officerResponse, settingsResponse] =
        await Promise.all([
          authFetch("/api/registers"),
          authFetch("/api/officers"),
          authFetch("/api/settings"),
        ]);

      if (!regResponse.ok || !officerResponse.ok || !settingsResponse.ok) {
        throw new Error("Gagal memuat data dari server.");
      }

      const [regData, officerData, settingsData] = await Promise.all([
        regResponse.json(),
        officerResponse.json(),
        settingsResponse.json(),
      ]);

      if (regData.registers) {
        setRegisters(regData.registers);
      }

      if (Array.isArray(officerData)) {
        setOfficers(officerData);
      }

      if (settingsData?.kejaksaanName) {
        setSettings(settingsData);
      }
    } catch (error) {
      console.error("Error loading application data:", error);

      showNotification(
        "Gagal memuat data dari database. Pastikan koneksi aktif.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEntries = async (code: string, forceFresh = false) => {
    const cached = entriesCacheRef.current.get(code.toLowerCase());
    if (cached && !forceFresh) {
      setEntries(cached);
    }

    try {
      const response = await authFetch(`/api/registers/${code}/entries`);

      if (!response.ok) {
        throw new Error("Gagal memuat data register.");
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setEntries(data);
        entriesCacheRef.current.set(code.toLowerCase(), data);
      }
    } catch (error) {
      console.error(`Error loading entries for ${code}:`, error);
      if (!cached) {
        showNotification("Gagal memuat isi register.", "error");
      }
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      void fetchData();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && selectedCode) {
      void fetchEntries(selectedCode);
    }
  }, [currentUser, selectedCode]);

  const handleLogout = async () => {
    try {
      await logOutFromFirebase();

      setCurrentUser(null);
      setEntries([]);
      setOfficers([]);

      showNotification("Anda telah keluar dari sistem.");
    } catch (error) {
      console.error("Logout error:", error);
      showNotification("Logout gagal. Silakan coba kembali.", "error");
    }
  };

  const handleAddOfficer = async (officer: {
    nama: string;
    pangkat: string;
    nip: string;
    jabatan?: string;
  }) => {
    const response = await authFetch("/api/officers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(officer),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Gagal menambah petugas.");
    }

    const created = await response.json();

    setOfficers((previous) => [...previous, created]);
    showNotification("Petugas berhasil ditambahkan ke database.");
  };

  const handleUpdateOfficer = async (
    id: number,
    officer: Partial<Officer>,
  ) => {
    const response = await authFetch(`/api/officers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(officer),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Gagal memperbarui petugas.");
    }

    const updated = await response.json();

    setOfficers((previous) =>
      previous.map((item) => (item.id === id ? updated : item)),
    );

    showNotification("Data petugas berhasil diperbarui.");
  };

  const handleDeleteOfficer = async (id: number) => {
    const response = await authFetch(`/api/officers/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Gagal menghapus petugas.");
    }

    setOfficers((previous) =>
      previous.filter((officer) => officer.id !== id),
    );

    showNotification("Petugas berhasil dihapus dari database.");
  };

  const handleUpdateSettings = async (
    newSettings: Partial<AppSettings>,
  ) => {
    const response = await authFetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Gagal menyimpan pengaturan.");
    }

    const saved = await response.json();

    setSettings(saved);
    showNotification("Pengaturan dan penandatangan berhasil disimpan.");
  };

  const handleSaveEntry = async (entryData: {
    id?: number;
    nomorUrut: number;
    tgl?: string;
    waktu?: string;
    data: Record<string, unknown>;
  }) => {
    const response = await authFetch(`/api/registers/${selectedCode}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entryData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Gagal menyimpan data entry.");
    }

    showNotification("Data baris register berhasil disimpan ke database.");

    entriesCacheRef.current.delete(selectedCode.toLowerCase());
    await fetchEntries(selectedCode, true);

    const registerResponse = await authFetch("/api/registers");
    const registerData = await registerResponse.json();

    if (registerData.registers) {
      setRegisters(registerData.registers);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    const response = await authFetch(
      `/api/registers/${selectedCode}/entries/${id}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      throw new Error("Gagal menghapus baris data register.");
    }

    entriesCacheRef.current.delete(selectedCode.toLowerCase());
    setEntries((previous) => previous.filter((entry) => entry.id !== id));

    showNotification("Baris data register berhasil dihapus.");

    const registerResponse = await authFetch("/api/registers");
    const registerData = await registerResponse.json();

    if (registerData.registers) {
      setRegisters(registerData.registers);
    }
  };

  const handleBatchDeleteEntries = async (ids: number[]) => {
    if (!ids || ids.length === 0) return;

    const response = await authFetch(
      `/api/registers/${selectedCode}/entries/batch-delete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      },
    );

    if (!response.ok) {
      throw new Error("Gagal menghapus baris data register terpilih.");
    }

    const resJson = await response.json();
    const count = resJson.count || ids.length;

    entriesCacheRef.current.delete(selectedCode.toLowerCase());
    const idSet = new Set(ids);
    setEntries((previous) => previous.filter((entry) => !idSet.has(entry.id)));

    showNotification(`${count} baris data register berhasil dihapus.`);

    const registerResponse = await authFetch("/api/registers");
    const registerData = await registerResponse.json();

    if (registerData.registers) {
      setRegisters(registerData.registers);
    }
  };

  const handleSeedSample = async () => {
    try {
      setIsSeeding(true);

      const response = await authFetch("/api/seed-samples", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Gagal memuat data contoh.");
      }

      showNotification("Data contoh register berhasil dimuat.");

      await fetchData();
      await fetchEntries(selectedCode);
    } catch (error) {
      console.error("Seed sample error:", error);
      showNotification("Gagal memuat data contoh.", "error");
    } finally {
      setIsSeeding(false);
    }
  };

  const currentRegister =
    registers.find((register) => register.code === selectedCode) ||
    REGISTER_DEFINITIONS[0];

  const totalEntriesCount = registers.reduce(
    (total, register) => total + (register.entryCount || 0),
    0,
  );

  // Akses menu backup, arsip, dan restore khusus hanya untuk akun hijau.kn.tabanan@gmail
  const isArchiveSuperAdmin = Boolean(
    currentUser?.email &&
    (currentUser.email.toLowerCase().trim() === "hijau.kn.tabanan@gmail.com" ||
     currentUser.email.toLowerCase().trim().startsWith("hijau.kn.tabanan@gmail"))
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 bg-slate-100 text-slate-600">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
        <span className="text-sm font-medium">Memeriksa sesi login...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginGate />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans antialiased text-slate-800">
      <div className="border-b border-emerald-900 bg-emerald-950 px-4 py-2 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-xs">
          <div className="min-w-0">
            <span className="font-semibold">{currentUser.name}</span>

            <span className="ml-2 hidden text-emerald-200 sm:inline">
              {currentUser.role}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-500/60 px-2.5 py-1.5 font-semibold text-emerald-50 transition hover:bg-emerald-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        </div>
      </div>

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedRegisterCode={selectedCode}
        totalOfficers={officers.length}
        totalEntries={totalEntriesCount}
        onSeedSample={handleSeedSample}
        isSeeding={isSeeding}
        onManageStorageCodes={() => setIsStorageCodesOpen(true)}
        onOpenArchiveManager={isArchiveSuperAdmin ? () => setIsArchiveManagerOpen(true) : undefined}
      />

      {notification && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-bold shadow-lg ${notification.type === "success"
              ? "border-emerald-500/40 bg-slate-900 text-emerald-400"
              : "border-red-800 bg-red-950 text-red-200"
            }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
          )}

          <span>{notification.message}</span>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-2.5 py-3 sm:px-4 sm:py-4">
        {isLoading ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2.5 text-slate-500">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />

            <p className="text-xs font-medium">
              Menghubungkan ke Database & Memuat Data Register...
            </p>
          </div>
        ) : (
          <>
            {activeTab === "registers" && (
              <div className="space-y-3 sm:space-y-4">
                <RegisterSelector
                  registers={registers}
                  selectedCode={selectedCode}
                  onSelect={setSelectedCode}
                />

                <RegisterDocumentView
                  register={currentRegister}
                  entries={entries}
                  officers={officers}
                  settings={settings}
                  onSaveEntry={handleSaveEntry}
                  onDeleteEntry={handleDeleteEntry}
                  onBatchDeleteEntries={handleBatchDeleteEntries}
                  onUpdateSettings={handleUpdateSettings}
                  onReload={() => void fetchEntries(selectedCode)}
                />
              </div>
            )}

            {activeTab === "officers" && (
              <OfficersManager
                officers={officers}
                onAddOfficer={handleAddOfficer}
                onUpdateOfficer={handleUpdateOfficer}
                onDeleteOfficer={handleDeleteOfficer}
              />
            )}

            {activeTab === "settings" && (
              <SettingsManager
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onOpenArchiveManager={isArchiveSuperAdmin ? () => setIsArchiveManagerOpen(true) : undefined}
                canManageArchive={isArchiveSuperAdmin}
              />
            )}
          </>
        )}
      </main>

      <footer className="mt-auto border-t border-slate-800 bg-slate-900 px-4 py-2.5 text-center text-[11px] text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1.5 sm:flex-row">
          <span>
            Buku Register Administrasi Intelijen Kejaksaan RI — Standardisasi
            R.IN.1 s/d R.IN.23
          </span>

          <span className="font-mono font-medium text-emerald-400/90">
            {settings.kejaksaanName}
          </span>
        </div>
      </footer>

      {/* Modal global kode penyimpanan */}
      {isStorageCodesOpen && (
        <StorageCodesModal
          isOpen={isStorageCodesOpen}
          onClose={() => setIsStorageCodesOpen(false)}
        />
      )}

      {/* Modal manajemen kapasitas database & arsip 3 tahun (Khusus hijau.kn.tabanan@gmail) */}
      {isArchiveManagerOpen && isArchiveSuperAdmin && (
        <ArchiveManagerModal
          isOpen={isArchiveManagerOpen}
          onClose={() => setIsArchiveManagerOpen(false)}
          onDataChanged={() => {
            void fetchData();
            if (selectedCode) void fetchEntries(selectedCode);
          }}
        />
      )}
    </div>
  );
}
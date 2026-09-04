import { AppSettings, Officer, RegisterDefinition } from "../types.js";
import { DEFAULT_SETTINGS, REGISTER_DEFINITIONS } from "./constants.js";

const SETTINGS_KEY = "amerta_cached_settings_v1";
const OFFICERS_KEY = "amerta_cached_officers_v1";
const COUNTS_KEY = "amerta_cached_counts_v1";

export function getCachedSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS as AppSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.kejaksaanName) {
        return parsed as AppSettings;
      }
    }
  } catch {
    // Ignore error and use default
  }
  return DEFAULT_SETTINGS as AppSettings;
}

export function setCachedSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota error
  }
}

export function getCachedOfficers(): Officer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFICERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as Officer[];
      }
    }
  } catch {
    // Ignore error
  }
  return [];
}

export function setCachedOfficers(officers: Officer[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OFFICERS_KEY, JSON.stringify(officers));
  } catch {
    // Ignore storage quota error
  }
}

export function getCachedRegisterCounts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(COUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, number>;
      }
    }
  } catch {
    // Ignore error
  }
  return {};
}

export function setCachedRegisterCounts(counts: Record<string, number>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COUNTS_KEY, JSON.stringify(counts));
  } catch {
    // Ignore storage quota error
  }
}

export function getInitialRegisters(): (RegisterDefinition & { entryCount?: number })[] {
  const cachedCounts = getCachedRegisterCounts();
  return REGISTER_DEFINITIONS.map((def) => ({
    ...def,
    entryCount: cachedCounts[def.code] || 0,
  }));
}

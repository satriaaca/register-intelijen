import { getApp, getApps, initializeApp } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    type User as FirebaseUser,
} from "firebase/auth";

import firebaseConfig from "../../firebase-applet-config.json" with { type: "json" };
import type { AppUser } from "../types.js";
import { verifyEmailWhitelist } from "./emailWhitelistService.js";

// Inisialisasi Firebase hanya satu kali.
export const app = getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

export const auth = getAuth(app);

// Provider Google / Google Workspace.
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
    prompt: "select_account",
});

/**
 * Mengubah user Firebase menjadi struktur pengguna aplikasi.
 * Fungsi ini hanya boleh dipanggil untuk email yang sudah lolos whitelist.
 */
export function mapFirebaseUserToAppUser(user: FirebaseUser): AppUser {
    const email = user.email?.trim().toLowerCase() || "";
    const check = verifyEmailWhitelist(email);

    if (!check.allowed || !check.config) {
        throw new Error(
            check.reason || "Akun tidak terdaftar dalam daftar pengguna yang diizinkan.",
        );
    }

    const cfg = check.config;

    return {
        username: email.split("@")[0],
        name: cfg.name || user.displayName || "Petugas Intelijen",
        nip: cfg.nip || "-",
        role: cfg.role,
        unit: cfg.unit,
        email,
        photoURL: user.photoURL || undefined,
        uid: user.uid,
        isLoggedIn: true,
    };
}

/**
 * Login melalui Google dan periksa whitelist setelah autentikasi Firebase berhasil.
 */
export async function signInWithGoogleSSO(): Promise<AppUser> {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const appUser = mapFirebaseUserToAppUser(result.user);

        return appUser;
    } catch (error: unknown) {
        // Jika Firebase berhasil login tetapi whitelist menolak user,
        // hapus sesi Firebase agar user tidak tersimpan sebagai user aktif.
        if (auth.currentUser) {
            await signOut(auth);
        }

        console.error("Google SSO error:", error);

        if (error instanceof Error) {
            throw error;
        }

        throw new Error("Login Google gagal. Silakan coba kembali.");
    }
}

/**
 * Logout Firebase.
 */
export async function logOutFromFirebase(): Promise<void> {
    try {
        await signOut(auth);
    } catch (error: unknown) {
        console.error("Logout error:", error);

        if (error instanceof Error) {
            throw error;
        }

        throw new Error("Logout gagal. Silakan coba kembali.");
    }
}

/**
 * Memantau status sesi Firebase setiap kali aplikasi dibuka atau user berganti akun.
 * User yang tidak tercantum pada whitelist akan segera dikeluarkan.
 */
export function subscribeToAuthState(
    onUserChanged: (user: AppUser | null) => void,
) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
            onUserChanged(null);
            return;
        }

        try {
            const appUser = mapFirebaseUserToAppUser(firebaseUser);
            onUserChanged(appUser);
        } catch (error) {
            console.warn("Akses pengguna ditolak:", error);

            await signOut(auth);
            onUserChanged(null);
        }
    });
}
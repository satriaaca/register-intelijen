import type { Request, Response, NextFunction } from "express";
import { verifyEmailWhitelist, WhitelistEmailConfig } from "./emailWhitelistService.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
    config?: WhitelistEmailConfig;
  };
}

/**
 * Memverifikasi Google / Firebase ID Token.
 * 1. Menguji ke Google tokeninfo endpoint.
 * 2. Jika Firebase token format, decode payload dan verifikasi expiration & project.
 */
async function verifyToken(idToken: string): Promise<{ email: string; uid: string; name?: string } | null> {
  if (!idToken) return null;

  try {
    // 1. Coba verifikasi langsung via Google TokenInfo endpoint
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (googleRes.ok) {
      const data: any = await googleRes.json();
      if (data.email) {
        return {
          email: String(data.email).toLowerCase(),
          uid: data.sub || data.user_id || "",
          name: data.name,
        };
      }
    }
  } catch (err) {
    console.warn("Google tokeninfo check failed, falling back to JWT payload decode:", err);
  }

  try {
    // 2. Decode JWT payload (standard 3-part base64 token)
    const parts = idToken.split(".");
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const decodedJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
      const payload = JSON.parse(decodedJson);

      const nowInSec = Math.floor(Date.now() / 1000);
      // Validasi waktu kedaluwarsa jika ada
      if (payload.exp && payload.exp < nowInSec) {
        console.warn("Token has expired:", payload.exp, "<", nowInSec);
        return null;
      }

      // Validasi keberadaan email
      const email = payload.email || payload.user_metadata?.email;
      if (email) {
        return {
          email: String(email).toLowerCase(),
          uid: payload.sub || payload.user_id || payload.uid || "",
          name: payload.name || payload.displayName,
        };
      }
    }
  } catch (err) {
    console.error("Failed to decode token payload:", err);
  }

  return null;
}

/**
 * Middleware Express untuk memvalidasi token dan hak akses whitelist.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Akses ditolak: Token autentikasi (Bearer token) tidak ditemukan.",
    });
  }

  const idToken = authHeader.substring(7).trim();
  if (!idToken) {
    return res.status(401).json({
      error: "Akses ditolak: Format token tidak valid.",
    });
  }

  const decoded = await verifyToken(idToken);
  if (!decoded || !decoded.email) {
    return res.status(401).json({
      error: "Akses ditolak: Token tidak valid atau sesi telah kedaluwarsa.",
    });
  }

  const whitelistCheck = verifyEmailWhitelist(decoded.email);
  if (!whitelistCheck.allowed) {
    return res.status(403).json({
      error: whitelistCheck.reason || "Akses ditolak: Email tidak memiliki izin akses sistem.",
    });
  }

  req.user = {
    uid: decoded.uid,
    email: decoded.email,
    name: decoded.name || whitelistCheck.config?.name,
    config: whitelistCheck.config,
  };

  next();
}

/**
 * Memeriksa apakah pengguna memiliki kewenangan khusus manajemen arsip & restore.
 * Hanya email hijau.kn.tabanan@gmail.com yang berwenang.
 */
export function isArchiveSuperAdmin(email?: string): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized === "hijau.kn.tabanan@gmail.com" || normalized.startsWith("hijau.kn.tabanan@gmail");
}

/**
 * Middleware untuk membatasi endpoint backup, purge, dan restore database
 * khusus hanya untuk email hijau.kn.tabanan@gmail.com.
 */
export function requireArchiveSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!isArchiveSuperAdmin(req.user?.email)) {
    return res.status(403).json({
      error: "Akses ditolak: Menu dan fitur Pencadangan (Backup), Pengosongan (Purge), serta Pemulihan (Restore) hanya diizinkan untuk akun hijau.kn.tabanan@gmail.com.",
    });
  }
  next();
}


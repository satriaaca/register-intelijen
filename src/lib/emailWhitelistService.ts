export interface WhitelistEmailConfig {
    email: string;
    name: string;
    role:
    | "Kasi Intelijen"
    | "Jaksa Fungsional Intelijen"
    | "Staf Intelijen"
    | "Administrator";
    unit: string;
    nip?: string;
    note?: string;
    isActive: boolean;
}

export const DEFAULT_ALLOWED_EMAILS: WhitelistEmailConfig[] = [
    {
        email: "hijau.kn.tabanan@gmail.com",
        name: "Kasi Intelijen Kejari Tabanan",
        role: "Kasi Intelijen",
        unit: "Seksi Intelijen Kejaksaan Negeri Tabanan",
        nip: "19820514 200703 1 002",
        note: "Akun Pejabat Kasi Intelijen",
        isActive: true,
    },
    {
        email: "ikadek.satriawan@gmail.com",
        name: "I Kadek Satriawan, S.Kom. (Administrator)",
        role: "Administrator",
        unit: "Administrator Sistem Intelijen Kejaksaan Negeri Tabanan",
        nip: "19820514 200703 1 001",
        note: "Akun Administrator Sistem",
        isActive: true,
    },

        {
        email: "intelijenkejaritabanan@gmail.com",
        name: "Komang Nita Indriani, S.H. (Administrator)",
        role: "Administrator",
        unit: "Administrator Sistem Intelijen Kejaksaan Negeri Tabanan",
        nip: "19820514 200703 1 001",
        note: "Akun Administrator Sistem",
        isActive: true,
    },
];

function normalizeEmailStr(email: string): string {
    return email.trim().toLowerCase();
}

export function verifyEmailWhitelist(email: string): {
    allowed: boolean;
    config?: WhitelistEmailConfig;
    reason?: string;
} {
    const normalizedEmail = normalizeEmailStr(email);

    if (!normalizedEmail) {
        return {
            allowed: false,
            reason: "AKSES DITOLAK: Akun Google tidak memiliki alamat email.",
        };
    }

    const match = DEFAULT_ALLOWED_EMAILS.find(
        (item) => normalizeEmailStr(item.email) === normalizedEmail,
    );

    if (!match) {
        return {
            allowed: false,
            reason:
                "AKSES DITOLAK: Email Anda tidak memiliki hak akses ke Sistem Intelijen Kejari Tabanan.",
        };
    }

    if (!match.isActive) {
        return {
            allowed: false,
            reason: "AKSES DITOLAK: Akun Anda sedang dinonaktifkan.",
        };
    }

    return {
        allowed: true,
        config: match,
    };
}
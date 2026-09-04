import http from "node:http";
import { URL } from "node:url";
import { google } from "googleapis";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = "http://localhost:8787/oauth2callback";

if (!clientId || !clientSecret) {
    throw new Error(
        "GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum diisi di terminal.",
    );
}

const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri,
);

const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive.file"],
});

console.log("\nBuka URL ini di browser, lalu login dengan Gmail tujuan backup:\n");
console.log(authUrl);
console.log("\nMenunggu callback di http://localhost:8787 ...\n");

const server = http.createServer(async (request, response) => {
    try {
        const callbackUrl = new URL(
            request.url || "",
            "http://localhost:8787",
        );

        if (callbackUrl.pathname !== "/oauth2callback") {
            response.writeHead(404, { "Content-Type": "text/plain" });
            response.end("Not found");
            return;
        }

        const error = callbackUrl.searchParams.get("error");

        if (error) {
            throw new Error(`Google OAuth ditolak: ${error}`);
        }

        const code = callbackUrl.searchParams.get("code");

        if (!code) {
            throw new Error("Authorization code tidak ditemukan.");
        }

        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
            throw new Error(
                "Refresh token tidak diperoleh. Hapus akses aplikasi dari Google Account, lalu jalankan ulang script.",
            );
        }

        console.log("\n==============================================");
        console.log("GOOGLE_REFRESH_TOKEN — simpan sebagai GitHub Secret:");
        console.log("==============================================\n");
        console.log(tokens.refresh_token);
        console.log("\n==============================================\n");

        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(`
      <!doctype html>
      <html>
        <head>
          <title>OAuth berhasil</title>
        </head>
        <body style="font-family: sans-serif; padding: 2rem">
          <h2>OAuth berhasil.</h2>
          <p>Refresh token sudah muncul di Terminal. Anda dapat menutup halaman ini.</p>
        </body>
      </html>
    `);

        server.close();
    } catch (error) {
        console.error("\nGagal membuat refresh token:\n", error);

        response.writeHead(500, {
            "Content-Type": "text/html; charset=utf-8",
        });

        response.end(`
      <h2>OAuth gagal.</h2>
      <p>Periksa pesan error pada Terminal.</p>
    `);

        server.close();
        process.exitCode = 1;
    }
});

server.listen(8787, "127.0.0.1");
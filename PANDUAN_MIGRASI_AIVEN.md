# Panduan Migrasi Database ke Aiven PostgreSQL (Aiven for PostgreSQL)
**Sistem Buku Register Intelijen Kejaksaan Negeri Tabanan**

Dokumen ini berisi panduan langkah demi langkah untuk memindahkan (migrasi) database aplikasi dari **Neon Postgres** ke **Aiven for PostgreSQL**.

---

## 1. Keunggulan Aiven PostgreSQL
- **Always-On & No Cold Start**: Berbeda dengan Neon serverless yang bisa "tidur" saat tidak ada trafik (scale-to-zero), Aiven PostgreSQL berjalan pada dedicated VM (instan respons kapan saja).
- **Kompatibilitas Penuh**: Menggunakan standar protokol PostgreSQL murni (`pg` / `node-postgres`), 100% kompatibel dengan Drizzle ORM yang saat ini digunakan di aplikasi.
- **Backup Otomatis Terkelola**: Dilengkapi point-in-time recovery bawaan dari platform Aiven.

---

## 2. Langkah Pembuatan Database di Aiven

1. **Daftar / Masuk ke Akun Aiven**:
   - Buka konsol di [https://console.aiven.io/](https://console.aiven.io/).
2. **Buat Service PostgreSQL Baru**:
   - Klik tombol **"Create service"**.
   - Pilih layanan **"PostgreSQL"**.
   - Pilih Cloud Provider & Region terdekat (contoh: **Google Cloud Platform (GCP)** atau **AWS** region **Singapore / `asia-southeast1`** untuk latensi tercepat).
   - Pilih paket layanan sesuai kebutuhan (contoh: *Free Plan* atau *Startup-4*).
   - Beri nama service, misalnya: `intel-tabanan-db`.
   - Klik **"Create service"**.
3. **Salin Connection URI**:
   - Setelah status service berubah menjadi **Running** (aktif):
   - Masuk ke tab **Overview** -> bagian **Connection information**.
   - Pada dropdown **Service URI**, klik ikon **Copy**.
   - Format URL Aiven PostgreSQL adalah:
     ```text
     postgres://avnadmin:<PASSWORD>@<HOST_AIVEN>:<PORT>/defaultdb?sslmode=require
     ```

---

## 3. Langkah Migrasi Data dari Database Lama ke Aiven

Ada 2 cara mudah untuk memindahkan seluruh data yang ada saat ini:

### Opsi A: Menggunakan Fitur Backup & Restore JSON Bawaan Aplikasi (Paling Mudah)
1. Buka aplikasi yang sedang berjalan menggunakan akun `hijau.kn.tabanan@gmail.com`.
2. Klik tombol **Kapasitas Database & Arsip** di Navbar (atau di menu Pengaturan).
3. Klik tombol **"Cadangkan Semua Data (.json)"** untuk mengunduh seluruh data entri R.IN.1–R.IN.23 beserta kunci register ke komputer Anda.
4. Ganti konfigurasi `DATABASE_URL` ke Aiven (lihat Langkah 4).
5. Jalankan aplikasi, buka kembali menu **Kapasitas Database & Arsip**, lalu pilih **"Unggah & Restore File Cadangan"** dan pilih file JSON tadi. Seluruh data akan otomatis masuk ke database Aiven.

---

### Opsi B: Menggunakan Tool Standar `pg_dump` & `psql` (Migrasi Langsung)
Jika Anda memiliki data yang sangat banyak dan ingin migrasi direct dump:
```bash
# 1. Ekspor seluruh schema dan data dari Neon
pg_dump "postgres://<USER_NEON>:<PASSWORD_NEON>@<HOST_NEON>/<DBNAME>?sslmode=require" -Fc -f backup_intel_tabanan.dump

# 2. Impor ke database Aiven PostgreSQL baru
pg_restore -d "postgres://avnadmin:<PASSWORD_AIVEN>@<HOST_AIVEN>:<PORT>/defaultdb?sslmode=require" --no-owner --no-privileges backup_intel_tabanan.dump
```

---

## 4. Konfigurasi Aplikasi untuk Menghubungkan ke Aiven

1. **Ubah Environment Variable**:
   Perbarui nilai `DATABASE_URL` pada file konfigurasi environment (Settings Secret di AI Studio / Cloud Run / file `.env`):
   ```env
   DATABASE_URL="postgres://avnadmin:YOUR_PASSWORD@your-aiven-host.aivencloud.com:12345/defaultdb?sslmode=require"
   ```

2. **Inisialisasi Tabel Otomatis**:
   - Aplikasi ini telah dilengkapi dengan fungsi `ensureTablesExist()` bawaan saat startup server.
   - Begitu server dinyalakan dengan `DATABASE_URL` baru dari Aiven, tabel-tabel berikut akan dibuat secara otomatis jika belum ada:
     - `register_entries` (Data entri R.IN.1 s/d R.IN.23)
     - `officers` (Data pejabat penandatangan)
     - `app_settings` (Konfigurasi aplikasi)
     - `storage_codes` (Pemetaan kode arsip)
     - `register_locks` (Kunci periode & verifikasi)
     - `audit_logs` (Log aktivitas sistem)

---

## 5. Pemeriksaan & Verifikasi Setelah Pindah

Setelah `DATABASE_URL` diarahkan ke Aiven:
1. Jalankan aplikasi dan periksa log koneksi server:
   ```text
   Database connection successfully initialized.
   Tables verified/created successfully.
   ```
2. Coba buka salah satu register (misal **R.IN.1** atau **R.IN.3**) dan lakukan pengujian input 1 baris entri uji coba.
3. Buka menu **Pengaturan Pejabat** untuk memastikan daftar pejabat dan NIP tampil dengan baik.
4. Buka modal **Kapasitas Database & Arsip** untuk memverifikasi kapasitas penyimpanan di Aiven.

---

## 6. Tips Optimasi Performa di Aiven

1. **Connection Pooling Aiven**:
   - Di dashboard Aiven, Anda dapat mengaktifkan tab **Connection Pools** (PgBouncer bawaan) jika aplikasi memiliki banyak pengguna simultan.
   - Gunakan URI Pooler dari Aiven (port biasanya `1xxxx` dengan mode `transaction`).
2. **IP Whitelisting / Firewall (Opsional)**:
   - Jika ingin membatasi akses database hanya dari IP Cloud Run / Hosting Anda, buka tab **Allowed IP addresses** di dashboard service Aiven.
   - Jika dibiarkan default (`0.0.0.0/0`), pastikan password `avnadmin` tetap kuat dan opsi `sslmode=require` selalu aktif.

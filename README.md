# 🛣️ Road Damage Detection System (Web Platform)

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Laravel](https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)

Selamat datang di repositori web **Road Damage Detection System**. Aplikasi ini adalah sebuah _platform_ cerdas yang ditujukan bagi instansi atau dinas terkait (seperti Dinas PU) untuk memantau, mendeteksi, dan mengelola pelaporan kerusakan jalan secara terintegrasi dan _real-time_.

---

## 🔗 Integrasi Model Artificial Intelligence (AI)

> **⚠️ PENTING:**
> Repositori ini **hanya berisi bagian aplikasi web (Frontend & Backend)**. Sistem pendeteksian cerdas pada aplikasi ini didukung oleh Model _Computer Vision / Machine Learning_ yang dikerjakan secara terpisah.
>
> Untuk melihat struktur model AI, arsitektur, dan cara pelatihannya, silakan kunjungi repositori terhubung milik rekan peneliti saya di bawah ini:
>
> 👉 **[Tautan Repositori Model AI Teman Saya] (Silakan ganti dengan link GitHub yang sebenarnya)**

---

## ✨ Fitur Utama

Sistem ini memiliki berbagai fitur utama yang disesuaikan berdasarkan hak akses (Role) penggunanya:

### 👨‍💻 Admin

- **Dashboard Analitik**: Melihat ringkasan dan statistik kerusakan jalan berdasarkan tingkat keparahan (_severity_).
- **Manajemen Pengguna**: Menambahkan, mengedit, dan menghapus akun (Petugas Lapangan & Tim Reparasi).
- **Peta Interaktif**: Memantau seluruh titik kerusakan jalan yang telah terdeteksi dalam satu peta komprehensif.

### 🕵️‍♂️ Petugas Lapangan

- **Tracking Otomatis**: Memulai sesi patroli dengan integrasi GPS dan kamera cerdas.
- **Deteksi Real-time**: Secara otomatis menandai jalan berlubang, retak buaya, dsb., saat di perjalanan.
- **Riwayat Tracking**: Melihat rekap rute patroli dan kerusakan yang ditemukan selama sesi sebelumnya.

### 👷 Tim Reparasi

- **Daftar Tugas Perbaikan**: Menerima data titik kerusakan jalan yang valid untuk segera ditindaklanjuti.
- **Update Status**: Mengubah status kerusakan menjadi "Sedang Diperbaiki" atau "Selesai" (dilengkapi bukti perbaikan).
- **Notifikasi Penolakan**: Mendapat catatan langsung apabila bukti perbaikan ditolak oleh Admin.

---

## 🛠️ Teknologi yang Digunakan

Aplikasi ini dibangun menggunakan arsitektur _Client-Server_ dengan tumpukan teknologi modern:

**Frontend:**

- [React.js](https://reactjs.org/) (dengan Vite)
- [Tailwind CSS](https://tailwindcss.com/) untuk _styling_ adaptif (Mendukung Light/Dark Mode)
- [Leaflet.js](https://leafletjs.com/) untuk visualisasi Peta (Geospatial)
- Axios untuk manajemen permintaan API

**Backend:**

- [Laravel 11](https://laravel.com/) (PHP)
- [MySQL](https://www.mysql.com/) sebagai Basis Data Relasional
- Laravel Sanctum untuk Autentikasi API yang aman

---

## 📂 Struktur Direktori

```text
Road-Damage-Web/
├── backend/            # Source code Laravel API & Database Migrations
├── frontend/           # Source code React.js & Vite
├── .gitignore          # File gitignore utama
├── setup-laravel.bat   # Script otomatisasi instalasi pertama kali (Windows)
├── start.bat           # Script otomatisasi untuk menjalankan web (Windows)
└── restart.bat         # Script otomatisasi restart server
```

---

## 🚀 Panduan Instalasi (Local Development)

Untuk menjalankan proyek ini di mesin lokal (komputer/laptop) Anda, pastikan Anda telah menginstal beberapa perangkat lunak berikut:

- **Node.js** (Versi 18+ disarankan)
- **PHP** (Versi 8.1+)
- **Composer** (Package manager PHP)
- **MySQL / MariaDB** (Disarankan menggunakan Laragon / XAMPP)

### Langkah 1: Persiapan Database

1. Buka aplikasi Laragon / XAMPP Anda dan jalankan MySQL.
2. Buat database baru dengan nama `road_damage_db` (atau sesuai keinginan Anda).

### Langkah 2: Setup Otomatis (Hanya Pengguna Windows)

Kami telah menyediakan skrip _batch_ agar instalasi lebih mudah.

1. _Clone_ atau _download_ repositori ini.
2. Buka Terminal/Command Prompt di folder proyek utama.
3. Jalankan skrip setup berikut:
   ```bash
   setup-laravel.bat
   ```
   _(Skrip ini otomatis menginstal dependensi Composer, NPM, dan menyiapkan file `.env` dasar)_
4. Buka file `backend/.env` dan pastikan konfigurasi koneksi database Anda sudah benar:
   ```env
   DB_DATABASE=road_damage_db
   DB_USERNAME=root
   DB_PASSWORD=
   ```
5. Migrasikan database:
   ```bash
   cd backend
   php artisan migrate --seed
   ```

### Langkah 3: Menjalankan Aplikasi

Anda hanya perlu menjalankan satu perintah dari folder _root_ proyek untuk menyalakan Backend API dan Frontend secara bersamaan:

```bash
start.bat
```

- **Frontend (Web App)** akan otomatis berjalan di `http://localhost:5173`
- **Backend (API)** akan berjalan di `http://localhost:8000`

---

## 👨‍🎓 Hak Cipta & Pengembang

Aplikasi web ini dikembangkan sebagai bagian dari Tugas Akhir dan Diusulkan untuk Dinas Pekerjaan Umum Kabupaten Kubu Raya. Seluruh _source code_ dirancang untuk keperluan akademis dan penelitian terkait integrasi _Computer Vision_ pada aplikasi pemantauan jalan raya.

Dibuat oleh **Muhamad Pahmi**
NIM **3202316122**
**Politeknik Negeri Pontianak**

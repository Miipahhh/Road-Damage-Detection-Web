# Road Damage Detection System (Web Platform)

Repositori ini berisi *source code* untuk aplikasi web (Frontend & Backend) dari **Road Damage Detection System**. Sistem ini digunakan untuk memantau, mendeteksi, dan melacak kerusakan jalan secara *real-time*.

> **Catatan Penting:** 
> Sistem deteksi kerusakan pada aplikasi web ini terintegrasi dan saling terhubung dengan Model Machine Learning / Computer Vision yang dikembangkan secara terpisah.
> 
> 🔗 **Repository Model AI dapat diakses di sini:** `[MASUKKAN_LINK_REPO_TEMAN_ANDA_DI_SINI]`

## Struktur Proyek

Proyek ini terdiri dari dua bagian utama:
1. **Frontend**: Menggunakan React.js dan Vite, serta Tailwind CSS untuk antarmuka pengguna.
2. **Backend**: Menggunakan Laravel (PHP) sebagai REST API dan sistem manajemen basis data.

## Prasyarat
- **Node.js** (v18 atau lebih baru)
- **PHP** (v8.1 atau lebih baru)
- **Composer**
- **MySQL/MariaDB**

## Cara Menjalankan Aplikasi di Local

1. Buka terminal di folder proyek ini.
2. Untuk pertama kali, Anda bisa menjalankan script setup (pastikan Anda sudah mengonfigurasi `.env` di backend):
   ```bash
   setup-laravel.bat
   ```
3. Untuk menjalankan aplikasi (menjalankan backend dan frontend secara bersamaan):
   ```bash
   start.bat
   ```
4. Aplikasi frontend akan dapat diakses di `http://localhost:5173` dan backend API di `http://localhost:8000`.

## Pengembang

Aplikasi web ini dikembangkan sebagai bagian dari Tugas Akhir.

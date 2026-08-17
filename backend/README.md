# Setup Laravel Backend - Road Damage Detection

## Prasyarat

Pastikan sudah terinstall:
- ✅ PHP 8.1 atau lebih tinggi
- ✅ Composer
- ✅ MySQL/MariaDB
- ✅ Laragon (recommended untuk Windows)

## Cara Setup

### Opsi 1: Otomatis (Recommended)

1. **Jalankan script setup:**
   ```bash
   setup-laravel.bat
   ```

2. **Script akan otomatis:**
   - Install dependencies dengan Composer
   - Generate application key
   - Buat database
   - Jalankan migrasi
   - Buat storage link

### Opsi 2: Manual

1. **Masuk ke folder Backend:**
   ```bash
   cd Backend
   ```

2. **Install dependencies:**
   ```bash
   composer install
   ```

3. **Generate application key:**
   ```bash
   php artisan key:generate
   ```

4. **Buat database:**
   - Buka phpMyAdmin: http://localhost/phpmyadmin
   - Buat database baru: `road_damage_detection`
   
   Atau via command line:
   ```bash
   mysql -u root -e "CREATE DATABASE road_damage_detection"
   ```

5. **Jalankan migrasi:**
   ```bash
   php artisan migrate
   ```

6. **Buat storage link:**
   ```bash
   php artisan storage:link
   ```

## Konfigurasi

File `.env` sudah dibuat otomatis. Jika perlu edit:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=road_damage_detection
DB_USERNAME=root
DB_PASSWORD=

YOLO_API_URL=http://localhost:5000
```

## Menjalankan Server

```bash
cd Backend
php artisan serve
```

Server akan berjalan di: http://localhost:8000

## Testing API

### Health Check
```bash
curl http://localhost:8000/api/health
```

Response:
```json
{
  "status": "ok",
  "service": "Road Damage Detection API",
  "timestamp": "2024-01-01T12:00:00.000000Z"
}
```

## Troubleshooting

### Error: "composer: command not found"

**Solusi:**
1. Download Composer dari https://getcomposer.org
2. Install dengan default settings
3. Restart terminal

### Error: "Class not found"

**Solusi:**
```bash
cd Backend
composer dump-autoload
php artisan config:clear
php artisan cache:clear
```

### Error: "Database connection failed"

**Solusi:**
1. Pastikan MySQL running (cek di Laragon)
2. Cek kredensial di file `.env`
3. Pastikan database sudah dibuat

### Error: "Permission denied" (storage)

**Solusi Windows:**
```bash
icacls "storage" /grant Everyone:F /t
```

**Solusi Linux:**
```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

### Error: "No application encryption key"

**Solusi:**
```bash
php artisan key:generate
```

## Struktur Folder

```
Backend/
├── app/
│   ├── Http/Controllers/
│   │   └── RoadDamageController.php
│   ├── Models/
│   │   └── RoadDamage.php
│   └── Providers/
├── bootstrap/
├── config/
├── database/
│   └── migrations/
│       └── 2024_01_01_000001_create_road_damages_table.php
├── public/
├── routes/
│   ├── api.php
│   └── web.php
├── storage/
├── .env
├── artisan
└── composer.json
```

## Perintah Artisan Berguna

```bash
# Lihat semua routes
php artisan route:list

# Clear cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Rollback migrasi
php artisan migrate:rollback

# Fresh migrasi (hapus semua data)
php artisan migrate:fresh

# Lihat status migrasi
php artisan migrate:status

# Masuk ke tinker (Laravel REPL)
php artisan tinker
```

## API Endpoints

Setelah server running, API tersedia di:

- `GET /api/health` - Health check
- `GET /api/road-damages` - List all damages
- `GET /api/road-damages/{id}` - Get single damage
- `POST /api/road-damages/detect` - Detect from image
- `PUT /api/road-damages/{id}` - Update damage
- `DELETE /api/road-damages/{id}` - Delete damage
- `GET /api/road-damages/stats/summary` - Statistics
- `GET /api/road-damages/map/markers` - Map markers

Dokumentasi lengkap: [API_REFERENCE.md](../API_REFERENCE.md)

## Database Schema

Table: `road_damages`

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| image_path | varchar | Path gambar |
| damage_type | varchar | Jenis kerusakan |
| confidence | decimal | Confidence score |
| latitude | decimal | GPS latitude |
| longitude | decimal | GPS longitude |
| location_address | varchar | Alamat |
| area_cm2 | decimal | Luas (cm²) |
| area_m2 | decimal | Luas (m²) |
| area_px | integer | Luas (pixel) |
| bbox | json | Bounding box |
| notes | text | Catatan |
| severity | enum | Keparahan (low/medium/high) |
| status | enum | Status (pending/verified/repaired) |
| created_at | timestamp | Waktu dibuat |
| updated_at | timestamp | Waktu diupdate |

## Next Steps

Setelah Laravel setup selesai:

1. ✅ Setup Frontend:
   ```bash
   cd Frontend
   npm install
   ```

2. ✅ Jalankan semua services:
   ```bash
   # Di root folder
   start.bat
   ```

3. ✅ Buka aplikasi:
   - Frontend: http://localhost:3000
    - Backend API: http://localhost:8000
    - YOLO API: http://localhost:5000

## Support

Jika ada masalah:
1. Cek [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
2. Cek Laravel logs: `Backend/storage/logs/laravel.log`
3. Hubungi developer

---

**Happy Coding! 🚀**

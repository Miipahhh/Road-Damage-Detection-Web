@echo off
title Road Damage Detection - Control Panel
color 0A
cd /d "%~dp0"

echo.
echo  =============================================
echo    ROAD DAMAGE DETECTION SYSTEM
echo    Dinas Pekerjaan Umum Kabupaten Kubu Raya
echo  =============================================
echo.

set "PHP_PATH=C:\laragon\bin\php\php-8.3.16-Win32-vs16-x64"
set "PROJECT_PATH=%~dp0"
set "PATH=%PHP_PATH%;%PATH%"

echo  [1/3] Starting YOLO API...
start "YOLO-API" /MIN cmd /c "cd /d "%PROJECT_PATH%" && C:\Users\nitro\AppData\Local\Programs\Python\Python311\python.exe Model/api.py"

echo  [2/3] Starting Laravel Backend...
start "Laravel-Backend" /MIN cmd /c "cd /d "%PROJECT_PATH%Backend" && "%PHP_PATH%\php.exe" artisan serve --host=0.0.0.0 --port=8000"

echo  [3/3] Starting React Frontend...
start "React-Frontend" /MIN cmd /c "cd /d "%PROJECT_PATH%Frontend" && npm run dev"

echo.
echo  Menunggu semua service siap...
timeout /t 8 /nobreak >nul

echo.
echo  =============================================
echo    SEMUA SERVICE BERJALAN!
echo  =============================================
echo.
echo   YOLO API        http://localhost:5000
echo   Laravel Backend  http://0.0.0.0:8000
echo   React Frontend   http://0.0.0.0:3000
echo.
echo   AKUN LOGIN:
echo   Admin    : admin@admin.com / admin123
echo   Petugas  : petugas@petugas.com / petugas123
echo.
echo   Buka browser: http://localhost:3000
echo   Dari HP: https://192.168.x.x:3000 (ganti dengan IP PC)
echo.
echo  =============================================
echo   Tekan tombol apa saja untuk STOP semua...
pause >nul

taskkill /FI "WindowTitle eq YOLO-API*" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq Laravel-Backend*" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq React-Frontend*" /T /F >nul 2>&1
echo.
echo  [OK] Semua service dihentikan.
pause

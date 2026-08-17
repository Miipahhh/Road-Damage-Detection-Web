@echo off
title Road Damage Detection - RESTART
color 0E
cd /d "%~dp0"

echo.
echo  =============================================
echo    ROAD DAMAGE DETECTION SYSTEM - RESTART
echo    Dinas Pekerjaan Umum Kabupaten Kubu Raya
echo  =============================================
echo.

set "PHP_PATH=C:\laragon\bin\php\php-8.3.16-Win32-vs16-x64"
set "PROJECT_PATH=%~dp0"
set "PATH=%PHP_PATH%;%PATH%"

echo  [STOP] Menghentikan semua service yang berjalan...
taskkill /FI "WindowTitle eq YOLO-API*" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq Laravel-Backend*" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq React-Frontend*" /T /F >nul 2>&1

echo  [WAIT] Menunggu semua process berhenti...
timeout /t 3 /nobreak >nul

echo.
echo  [1/3] Memulai ulang YOLO API...
start "YOLO-API" /MIN cmd /c "cd /d "%PROJECT_PATH%" && python Model/api.py"

echo  [2/3] Memulai ulang Laravel Backend...
start "Laravel-Backend" /MIN cmd /c "cd /d "%PROJECT_PATH%backend" && "%PHP_PATH%\php.exe" artisan serve --host=0.0.0.0 --port=8000"

echo  [3/3] Memulai ulang React Frontend...
start "React-Frontend" /MIN cmd /c "cd /d "%PROJECT_PATH%frontend" && npm run dev"

echo.
echo  Menunggu semua service siap...
timeout /t 8 /nobreak >nul

echo.
echo  =============================================
echo    SEMUA SERVICE BERHASIL DI-RESTART!
echo  =============================================
echo.
echo   YOLO API        http://localhost:5000
echo   Laravel Backend  http://localhost:8000
echo   React Frontend   http://localhost:3000
echo.
echo   Buka browser: http://localhost:3000
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

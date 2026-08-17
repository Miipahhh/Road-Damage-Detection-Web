@echo off
echo ========================================
echo Road Damage Detection - Laravel Setup
echo ========================================
echo.

cd Backend

echo [1/6] Checking Composer...
where composer >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Composer not found! Please install Composer first.
    echo Download from: https://getcomposer.org
    pause
    exit /b 1
)

echo [2/6] Installing Laravel dependencies...
call composer install --no-interaction --prefer-dist

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Composer install failed!
    pause
    exit /b 1
)

echo.
echo [3/6] Generating application key...
call php artisan key:generate --ansi

echo.
echo [4/6] Creating database...
mysql -u root -e "CREATE DATABASE IF NOT EXISTS road_damage_detection" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Could not create database automatically.
    echo Please create database manually: road_damage_detection
)

echo.
echo [5/6] Running migrations...
call php artisan migrate --force

echo.
echo [6/6] Creating storage link...
call php artisan storage:link

cd ..

echo.
echo ========================================
echo Laravel Backend Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Configure database in Backend/.env if needed
echo 2. Install frontend: cd Frontend ^&^& npm install
echo 3. Start services with start.bat
echo.
pause

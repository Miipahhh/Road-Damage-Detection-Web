@echo off
echo ========================================
echo  Starting Laravel Backend
echo ========================================
echo.

set PHP_PATH=C:\laragon\bin\php\php-8.3.16-Win32-vs16-x64

echo PHP Path: %PHP_PATH%\php.exe
echo.

"%PHP_PATH%\php.exe" artisan serve --port=8000

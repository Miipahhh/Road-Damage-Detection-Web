<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Route web biasa (middleware group "web"), bukan API. Cuma dipakai
| untuk halaman info dasar, endpoint utama ada di routes/api.php
|
*/

// Halaman root, cuma info service
Route::get('/', function () {
    return response()->json([
        'message' => 'Road Damage Detection API',
        'version' => '1.0.0',
        'documentation' => '/api/health'
    ]);
});

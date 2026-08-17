<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\RoadDamageController;
use App\Http\Controllers\TrackingSessionController;
use App\Http\Controllers\UserManagementController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ==================== ROUTE PUBLIK (TANPA LOGIN) ====================
// Login -> AuthController@login, dibatasi 5 percobaan/menit per IP biar aman dari brute-force
// dipakai di: contexts/AuthContext.jsx (login) <- LoginPage.jsx
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

// Cek status server hidup atau tidak
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'Road Damage Detection API - Dinas PU Kubu Raya',
        'timestamp' => now()->toIso8601String()
    ]);
});

// ==================== ROUTE WAJIB LOGIN (auth:sanctum) ====================
Route::middleware('auth:sanctum')->group(function () {

    // ---- Autentikasi & profil sendiri ----
    // Logout -> AuthController@logout, hapus token yang sedang dipakai
    // dipakai di: contexts/AuthContext.jsx (logout)
    Route::post('/logout', [AuthController::class, 'logout']);
    // Ambil data user yang sedang login -> AuthController@me
    // dipakai di: contexts/AuthContext.jsx, dipanggil tiap app dibuka buat cek sesi
    Route::get('/me', [AuthController::class, 'me']);
    // Update nama/HP sendiri -> AuthController@updateProfile
    // dipakai di: pages/ProfilePage.jsx (handlePhoneSubmit)
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    // Ganti password sendiri -> AuthController@updatePassword, semua token dicabut setelah ganti
    // dipakai di: pages/ProfilePage.jsx (handlePasswordSubmit)
    Route::put('/profile/password', [AuthController::class, 'updatePassword']);

    // ==================== KERUSAKAN JALAN ====================
    Route::prefix('road-damages')->group(function () {
        // Route statis harus di atas route {id} biar tidak ketangkep sebagai id
        // Statistik ringkasan -> RoadDamageController@statistics
        // dipakai di: pages/AdminDashboard.jsx, pages/HistoryPage.jsx
        Route::get('/stats/summary', [RoadDamageController::class, 'statistics']);
        // Data marker untuk peta -> RoadDamageController@mapData
        // dipakai di: pages/MapPage.jsx, pages/ReparasiDashboard.jsx, components/ReparasiGlobalNotifier.jsx
        Route::get('/map/markers', [RoadDamageController::class, 'mapData']);
        // Upload gambar & deteksi kerusakan pakai YOLO -> RoadDamageController@detect
        // catatan: deteksi live sekarang lewat HF Space (/yolo/detect), endpoint ini belum dipanggil dari frontend
        Route::post('/detect', [RoadDamageController::class, 'detect']);

        // List semua kerusakan (dengan filter) -> RoadDamageController@index
        // dipakai di: pages/HistoryPage.jsx
        Route::get('/', [RoadDamageController::class, 'index']);
        // Hapus banyak data sekaligus -> RoadDamageController@bulkDestroy
        // dipakai di: pages/HistoryPage.jsx (hapus massal)
        Route::post('/bulk-delete', [RoadDamageController::class, 'bulkDestroy']);
        // Detail satu kerusakan -> RoadDamageController@show
        // catatan: belum dipanggil langsung dari frontend, detail dipakai dari data getAll
        Route::get('/{id}', [RoadDamageController::class, 'show']);
        // Lapor perbaikan selesai -> RoadDamageController@laporPerbaikan, khusus role reparasi
        // dipakai di: pages/MapPage.jsx (form lapor perbaikan)
        Route::post('/{id}/lapor-perbaikan', [RoadDamageController::class, 'laporPerbaikan'])->middleware('role:reparasi');
        // Setujui laporan perbaikan -> RoadDamageController@approveRepair, khusus admin
        // dipakai di: pages/HistoryPage.jsx (tombol setujui)
        Route::post('/{id}/approve-repair', [RoadDamageController::class, 'approveRepair'])->middleware('role:admin');
        // Tolak laporan perbaikan -> RoadDamageController@rejectRepair, khusus admin
        // dipakai di: pages/HistoryPage.jsx (tombol tolak)
        Route::post('/{id}/reject-repair', [RoadDamageController::class, 'rejectRepair'])->middleware('role:admin');
        // Update status/severity/catatan -> RoadDamageController@update
        // dipakai di: pages/HistoryPage.jsx (ubah status, edit catatan)
        Route::put('/{id}', [RoadDamageController::class, 'update']);
        // Hapus satu data kerusakan -> RoadDamageController@destroy
        // dipakai di: pages/HistoryPage.jsx
        Route::delete('/{id}', [RoadDamageController::class, 'destroy']);
    });

    // ==================== SESI TRACKING (PETUGAS) ====================
    Route::prefix('tracking')->group(function () {
        // Mulai sesi tracking -> TrackingSessionController@start
        // dipakai di: pages/TrackingPage.jsx (klik "Mulai Tracking")
        Route::post('/start', [TrackingSessionController::class, 'start']);
        // Selesaikan sesi tracking -> TrackingSessionController@stop
        // dipakai di: pages/TrackingPage.jsx (klik "Selesai")
        Route::post('/{id}/stop', [TrackingSessionController::class, 'stop']);
        // Tambah titik GPS ke rute -> TrackingSessionController@updateRoute
        // dipakai di: pages/TrackingPage.jsx (polling GPS tiap beberapa detik)
        Route::post('/{id}/route', [TrackingSessionController::class, 'updateRoute']);
        // Simpan kerusakan yang terdeteksi selama tracking -> TrackingSessionController@saveDamage
        // dipakai di: pages/TrackingPage.jsx (setelah YOLO deteksi kerusakan)
        Route::post('/{id}/damage', [TrackingSessionController::class, 'saveDamage']);
        // Cek sesi tracking yang sedang aktif milik user -> TrackingSessionController@activeSession
        // dipakai di: pages/TrackingPage.jsx, pages/PetugasDashboard.jsx
        Route::get('/active', [TrackingSessionController::class, 'activeSession']);
        // Riwayat tracking milik user sendiri -> TrackingSessionController@myHistory
        // dipakai di: pages/TrackingHistoryPage.jsx, pages/PetugasDashboard.jsx
        Route::get('/my-history', [TrackingSessionController::class, 'myHistory']);
        // Detail satu sesi tracking -> TrackingSessionController@show
        // dipakai di: pages/TrackingHistoryPage.jsx (expand detail sesi, fokus peta)
        Route::get('/{id}', [TrackingSessionController::class, 'show']);
    });

    // ==================== KHUSUS ADMIN (role:admin) ====================
    Route::middleware('role:admin')->group(function () {
        // ---- Manajemen user / RBAC ----
        Route::prefix('users')->group(function () {
            // List semua user -> UserManagementController@index
            // dipakai di: pages/UserManagementPage.jsx, pages/TrackingHistoryPage.jsx (dropdown filter petugas)
            Route::get('/', [UserManagementController::class, 'index']);
            // Tambah user baru -> UserManagementController@store
            // dipakai di: pages/UserManagementPage.jsx (form tambah user)
            Route::post('/', [UserManagementController::class, 'store']);
            // Detail satu user -> UserManagementController@show
            // catatan: belum dipanggil langsung dari frontend
            Route::get('/{id}', [UserManagementController::class, 'show']);
            // Update data user -> UserManagementController@update
            // dipakai di: pages/UserManagementPage.jsx (form edit user)
            Route::put('/{id}', [UserManagementController::class, 'update']);
            // Aktif/nonaktifkan akun -> UserManagementController@toggleActive
            // dipakai di: pages/UserManagementPage.jsx
            Route::post('/{id}/toggle-active', [UserManagementController::class, 'toggleActive']);
            // Hapus user (soft delete) -> UserManagementController@destroy
            // dipakai di: pages/UserManagementPage.jsx
            Route::delete('/{id}', [UserManagementController::class, 'destroy']);
        });

        // ---- Sesi tracking (tampilan admin) ----
        // Semua riwayat tracking semua user -> TrackingSessionController@allHistory
        // dipakai di: pages/TrackingHistoryPage.jsx (mode showAll admin)
        Route::get('/tracking-all', [TrackingSessionController::class, 'allHistory']);

        // Sesi tracking yang aktif sekarang, buat live map -> TrackingSessionController@activeSessions
        // dipakai di: pages/MapPage.jsx (polling live tracking)
        Route::get('/tracking-live', [TrackingSessionController::class, 'activeSessions']);

        // Hapus sesi tracking, kerusakan jalannya tetap ada (tidak ikut terhapus) -> TrackingSessionController@destroy
        // dipakai di: pages/TrackingHistoryPage.jsx
        Route::delete('/tracking/{id}', [TrackingSessionController::class, 'destroy']);
        // Hapus banyak sesi tracking sekaligus -> TrackingSessionController@bulkDestroy
        // dipakai di: pages/TrackingHistoryPage.jsx, pages/MapPage.jsx
        Route::post('/tracking-bulk-delete', [TrackingSessionController::class, 'bulkDestroy']);
    });
});

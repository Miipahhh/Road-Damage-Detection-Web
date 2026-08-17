<?php

namespace App\Http\Controllers;

use App\Models\TrackingSession;
use App\Models\RoadDamage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TrackingSessionController extends Controller
{
    /**
     * Mulai sesi tracking baru (semua role, wajib login, biasanya dipakai petugas)
     */
    public function start(Request $request)
    {
        $user = $request->user();

        // Satu user cuma boleh punya 1 sesi aktif
        $activeSession = TrackingSession::where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if ($activeSession) {
            return response()->json([
                'success' => false,
                'message' => 'Anda sudah memiliki sesi tracking yang aktif.',
                'session' => $activeSession,
            ], 400);
        }

        // Validasi titik mulai & akhir (opsional, tapi direkomendasikan)
        $request->validate([
            'start_point'      => 'nullable|array',
            'start_point.lat'  => 'required_with:start_point|numeric|between:-90,90',
            'start_point.lng'  => 'required_with:start_point|numeric|between:-180,180',
            'end_point'        => 'nullable|array',
            'end_point.lat'    => 'required_with:end_point|numeric|between:-90,90',
            'end_point.lng'    => 'required_with:end_point|numeric|between:-180,180',
            'ruas_jalan_name'  => 'nullable|string|max:255',
        ]);

        $session = TrackingSession::create([
            'user_id'         => $user->id,
            'started_at'      => now(),
            'route_path'      => [],
            'status'          => 'active',
            'start_point'     => $request->start_point,
            'end_point'       => $request->end_point,
            'ruas_jalan_name' => $request->ruas_jalan_name,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sesi tracking dimulai.',
            'session' => $session,
        ]);
    }

    /**
     * Selesaikan sesi tracking milik sendiri (semua role, wajib login)
     */
    public function stop(Request $request, $id)
    {
        $user = $request->user();
        $session = TrackingSession::where('id', $id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->firstOrFail();

        $session->update([
            'ended_at' => now(),
            'status' => 'completed',
        ]);

        $session->load('roadDamages');

        return response()->json([
            'success' => true,
            'message' => 'Sesi tracking selesai.',
            'session' => $session,
            'total_damages' => $session->roadDamages->count(),
        ]);
    }

    /**
     * Tambah titik GPS ke rute sesi yang sedang aktif (semua role, wajib login)
     */
    public function updateRoute(Request $request, $id)
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $user = $request->user();
        $session = TrackingSession::where('id', $id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->firstOrFail();

        $routePath = $session->route_path ?? [];
        $routePath[] = [
            'lat' => $request->latitude,
            'lng' => $request->longitude,
            'timestamp' => now()->toIso8601String(),
        ];

        $session->update(['route_path' => $routePath]);

        return response()->json([
            'success' => true,
            'message' => 'Rute diperbarui.',
        ]);
    }

    /**
     * Simpan kerusakan yang terdeteksi selama sesi tracking aktif (semua role, wajib login)
     */
    public function saveDamage(Request $request, $id)
    {
        $request->validate([
            'image' => 'required|string', // gambar base64
            'damage_type' => 'required|string|in:Retak-Buaya,Retak-Memanjang,Retak-Melintang,Lubang',
            'confidence' => 'required|numeric|between:0,1',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $user = $request->user();
        $session = TrackingSession::where('id', $id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->firstOrFail();

        // Ubah base64 jadi file gambar
        $imageData = $request->image;
        if (str_contains($imageData, ',')) {
            $imageData = explode(',', $imageData)[1];
        }
        $imageName = Str::uuid() . '.jpg';
        $imagePath = 'uploads/' . $imageName;
        Storage::disk('public')->put($imagePath, base64_decode($imageData));

        $damage = RoadDamage::create([
            'tracking_session_id' => $session->id,
            'image_path' => $imagePath,
            'damage_type' => $request->damage_type,
            'confidence' => $request->confidence,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'severity' => 'medium',
            'status' => 'pending',
        ]);

        // Hitung ulang severity berdasarkan tipe & luas area
        $damage->severity = $damage->calculateSeverity();
        $damage->save();

        return response()->json([
            'success' => true,
            'message' => 'Data kerusakan tersimpan.',
            'damage' => $damage,
        ]);
    }

    /**
     * Riwayat sesi tracking milik user sendiri (semua role, wajib login)
     */
    public function myHistory(Request $request)
    {
        $user = $request->user();
        $query = TrackingSession::where('user_id', $user->id)
            ->withCount('roadDamages')
            ->orderBy('created_at', 'desc');

        // Filter rentang waktu
        if ($request->has('time_range') && $request->time_range !== 'all' && $request->time_range !== '') {
            $range = $request->time_range;
            if ($range === 'today') {
                $query->whereDate('started_at', \Carbon\Carbon::today());
            } elseif ($range === 'yesterday') {
                $query->whereDate('started_at', \Carbon\Carbon::yesterday());
            } elseif ($range === 'this_week') {
                $query->whereBetween('started_at', [\Carbon\Carbon::now()->startOfWeek(), \Carbon\Carbon::now()->endOfWeek()]);
            } elseif ($range === 'this_month') {
                $query->whereMonth('started_at', \Carbon\Carbon::now()->month)
                      ->whereYear('started_at', \Carbon\Carbon::now()->year);
            } elseif ($range === 'custom' && $request->start_date && $request->end_date) {
                $query->whereDate('started_at', '>=', $request->start_date)
                      ->whereDate('started_at', '<=', $request->end_date);
            }
        }

        // Filter ruas jalan
        if ($request->has('ruas_jalan') && $request->ruas_jalan !== '') {
            $query->where('ruas_jalan_name', 'like', '%' . $request->ruas_jalan . '%');
        }

        $sessions = $query->paginate(10);

        return response()->json($sessions);
    }

    /**
     * Riwayat semua sesi tracking semua user (khusus admin)
     */
    public function allHistory(Request $request)
    {
        try {
            $query = TrackingSession::with([
                    'user:id,name,email',
                    'roadDamages',
                ])
                ->withCount('roadDamages')
                ->orderBy('created_at', 'desc');

            // Filter status, default cuma yang completed
            if ($request->has('status') && $request->status !== '' && $request->status !== 'all') {
                $query->where('status', $request->status);
            } elseif (!$request->has('status')) {
                $query->where('status', 'completed');
            }

            // Filter berdasarkan user
            if ($request->has('user_id') && $request->user_id !== '' && $request->user_id !== 'all') {
                $query->where('user_id', $request->user_id);
            }

            // Filter rentang waktu
            if ($request->has('time_range') && $request->time_range !== 'all' && $request->time_range !== '') {
                $range = $request->time_range;
                if ($range === 'today') {
                    $query->whereDate('started_at', \Carbon\Carbon::today());
                } elseif ($range === 'yesterday') {
                    $query->whereDate('started_at', \Carbon\Carbon::yesterday());
                } elseif ($range === 'this_week') {
                    $query->whereBetween('started_at', [\Carbon\Carbon::now()->startOfWeek(), \Carbon\Carbon::now()->endOfWeek()]);
                } elseif ($range === 'this_month') {
                    $query->whereMonth('started_at', \Carbon\Carbon::now()->month)
                          ->whereYear('started_at', \Carbon\Carbon::now()->year);
                } elseif ($range === 'custom' && $request->start_date && $request->end_date) {
                    $query->whereDate('started_at', '>=', $request->start_date)
                          ->whereDate('started_at', '<=', $request->end_date);
                }
            }

            // Filter ruas jalan
            if ($request->has('ruas_jalan') && $request->ruas_jalan !== '') {
                $query->where('ruas_jalan_name', 'like', '%' . $request->ruas_jalan . '%');
            }

            /** @var \Illuminate\Pagination\LengthAwarePaginator $sessions */
            $sessions = $query->paginate(10);

            // Konversi image_path ke image_url untuk setiap damage
            $sessions->getCollection()->transform(function ($session) {
                if ($session->roadDamages && $session->roadDamages->count() > 0) {
                    $session->roadDamages->each(function ($damage) {
                        $damage->image_url = $damage->image_path
                            ? Storage::url($damage->image_path)
                            : null;
                    });
                }
                return $session;
            });

            return response()->json($sessions);
        } catch (\Exception $e) {
            \Log::error('TrackingSessionController@allHistory - ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'error' => 'Server error: ' . $e->getMessage(),
                'data' => [],
            ], 500);
        }
    }

    /**
     * Detail satu sesi tracking (semua role, wajib login)
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();

        $query = TrackingSession::with(['user:id,name,email', 'roadDamages']);

        // Petugas cuma boleh lihat sesi miliknya sendiri
        if ($user->isPetugas()) {
            $query->where('user_id', $user->id);
        }

        $session = $query->findOrFail($id);

        if ($session->roadDamages && $session->roadDamages->count() > 0) {
            $session->roadDamages->each(function ($damage) {
                $damage->image_url = $damage->image_path
                    ? Storage::url($damage->image_path)
                    : null;
            });
        }

        return response()->json([
            'success' => true,
            'session' => $session,
        ]);
    }

    /**
     * Hapus satu sesi tracking (khusus admin)
     * Data kerusakan jalan tidak ikut terhapus, cuma dilepas kaitannya
     */
    public function destroy(Request $request, $id)
    {
        $session = TrackingSession::findOrFail($id);

        // Lepaskan kaitan kerusakan jalan agar data kerusakan & marker yang dibuat petugas AMAN tidak terhapus
        RoadDamage::where('tracking_session_id', $session->id)->update(['tracking_session_id' => null]);

        $session->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sesi tracking berhasil dihapus.',
        ]);
    }

    /**
     * Hapus banyak sesi tracking sekaligus (khusus admin)
     */
    public function bulkDestroy(Request $request)
    {
        $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'integer|exists:tracking_sessions,id',
        ]);

        // Lepaskan kaitan kerusakan jalan agar data kerusakan & marker yang dibuat petugas AMAN tidak terhapus
        RoadDamage::whereIn('tracking_session_id', $request->ids)->update(['tracking_session_id' => null]);

        TrackingSession::whereIn('id', $request->ids)->delete();

        return response()->json([
            'success' => true,
            'message' => count($request->ids) . ' sesi tracking berhasil dihapus.',
            'deleted_count' => count($request->ids),
        ]);
    }

    /**
     * Cek sesi tracking yang sedang aktif milik user (semua role, wajib login)
     */
    public function activeSession(Request $request)
    {
        $user = $request->user();
        $session = TrackingSession::where('user_id', $user->id)
            ->where('status', 'active')
            ->with('roadDamages')
            ->first();

        return response()->json([
            'success' => true,
            'session' => $session,
        ]);
    }

    /**
     * Semua sesi tracking yang sedang aktif, buat live map (khusus admin)
     */
    public function activeSessions(Request $request)
    {
        $sessions = TrackingSession::where('status', 'active')
            ->with(['user:id,name,email', 'roadDamages:id,tracking_session_id,damage_type,confidence,latitude,longitude,created_at'])
            ->get();

        return response()->json([
            'success' => true,
            'sessions' => $sessions->map(function ($session) {
                $routePath = $session->route_path ?? [];
                $lastPosition = count($routePath) > 0 ? end($routePath) : null;

                return [
                    'id'              => $session->id,
                    'user'            => $session->user,
                    'started_at'      => $session->started_at,
                    'route_path'      => $routePath,
                    'last_position'   => $lastPosition,
                    'start_point'     => $session->start_point,
                    'end_point'       => $session->end_point,
                    'ruas_jalan_name' => $session->ruas_jalan_name,
                    'damages'         => $session->roadDamages,
                    'total_damages'   => $session->roadDamages->count(),
                ];
            }),
        ]);
    }
}

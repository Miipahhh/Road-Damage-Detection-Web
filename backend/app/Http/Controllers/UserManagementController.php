<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    /**
     * List semua user + filter & search (khusus admin)
     */
    public function index(Request $request)
    {
        $query = User::query();

        // Filter berdasarkan role
        if ($request->has('role') && $request->role !== '') {
            $query->where('role', $request->role);
        }

        // Filter berdasarkan status aktif
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Cari berdasarkan nama atau email
        if ($request->has('search') && $request->search !== '') {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->withCount(['trackingSessions', 'repairedDamages'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($users);
    }

    /**
     * Tambah user baru (khusus admin)
     */
    public function store(Request $request)
    {
        $request->validate([
            'name'      => 'required|string|max:255',
            'email'     => 'required|email|unique:users,email',
            'phone'     => 'nullable|string|max:20',
            'password'  => 'required|string|min:8',
            'role'      => 'required|in:admin,petugas,reparasi',
        ]);

        $user = User::create([
            'name'      => $request->name,
            'email'     => $request->email,
            'phone'     => $request->phone ?? null,
            'password'  => Hash::make($request->password),
            'role'      => $request->role,
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Akun pengguna berhasil dibuat.',
            'user'    => $user,
        ], 201);
    }

    /**
     * Detail satu user (khusus admin)
     */
    public function show($id)
    {
        $user = User::withCount(['trackingSessions', 'repairedDamages'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'user'    => $user,
        ]);
    }

    /**
     * Update data user (khusus admin)
     * Password cuma diganti kalau field-nya diisi
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'name'      => 'sometimes|string|max:255',
            'email'     => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'phone'     => 'sometimes|nullable|string|max:20',
            'password'  => 'sometimes|nullable|string|min:8',
            'role'      => 'sometimes|in:admin,petugas,reparasi',
            'is_active' => 'sometimes|boolean',
        ]);

        $data = $request->only(['name', 'email', 'phone', 'role', 'is_active']);

        // Cuma ganti password kalau field-nya diisi
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
            // Cabut semua token, user itu harus login ulang pakai password baru
            $user->tokens()->delete();
        }

        $user->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Data pengguna berhasil diperbarui.',
            'user'    => $user->fresh(),
        ]);
    }

    /**
     * Aktif/nonaktifkan akun user (khusus admin)
     */
    public function toggleActive($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => !$user->is_active]);

        return response()->json([
            'success' => true,
            'message' => $user->is_active ? 'Akun diaktifkan.' : 'Akun dinonaktifkan.',
            'user'    => $user,
        ]);
    }

    /**
     * Hapus user (khusus admin), soft delete, riwayat kerja tetap aman
     */
    public function destroy($id)
    {
        // Tambahkan kolom deleted_at otomatis kalau tabel users belum punya
        if (!\Illuminate\Support\Facades\Schema::hasColumn('users', 'deleted_at')) {
            \Illuminate\Support\Facades\Schema::table('users', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->softDeletes();
            });
        }

        $user = User::findOrFail($id);

        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak dapat menghapus akun Anda sendiri.',
            ], 400);
        }

        // Ubah email biar tidak bentrok sama unique constraint kalau email dipakai daftar lagi nanti
        $user->email = $user->email . '.deleted.' . time();
        $user->is_active = false;
        $user->tokens()->delete();
        $user->save();

        // Soft delete, data tracking & perbaikan tetap tersimpan
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pengguna berhasil dihapus. Data riwayat pekerjaan tetap dipertahankan.',
        ]);
    }
}

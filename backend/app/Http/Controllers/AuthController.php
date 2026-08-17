<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login -> cek email & password, tolak kalau akun nonaktif
     * Bisa diakses siapa saja (belum login)
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ], [
            'email.required'    => 'Silakan isi email terlebih dahulu.',
            'email.email'       => 'Format email tidak valid (contoh: nama@email.com).',
            'password.required' => 'Silakan isi password terlebih dahulu.',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Akun Anda telah dinonaktifkan. Hubungi administrator.'],
            ]);
        }

        // Hapus token lama biar tidak numpuk
        $user->tokens()->delete();

        // Buat token baru buat sesi login ini
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil',
            'user'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role'  => $user->role,
            ],
            'token' => $token,
        ]);
    }

    /**
     * Logout -> cabut token yang sedang dipakai (semua role, wajib login)
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil',
        ]);
    }

    /**
     * Ambil data user yang sedang login (semua role, wajib login)
     */
    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'user'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role'  => $user->role,
            ],
        ]);
    }

    /**
     * Update nama & HP sendiri (semua role, wajib login)
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        // Nomor HP wajib format 08xxx biar konsisten
        $validated = $request->validate([
            'name'  => 'sometimes|string|max:255',
            'phone' => 'sometimes|nullable|string|regex:/^08[0-9]{8,11}$/',
        ], [
            'phone.regex' => 'Nomor HP tidak valid. Gunakan format 08xxxxxxxxxx (10-13 digit).',
        ]);

        $user->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diperbarui',
            'user'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role'  => $user->role,
            ],
        ]);
    }

    /**
     * Ganti password sendiri (semua role, wajib login)
     * Semua token dicabut setelah ganti, jadi harus login ulang
     */
    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password'          => 'required|string',
            'new_password'              => 'required|string|min:8|confirmed',
            'new_password_confirmation' => 'required|string',
        ]);

        $user = $request->user();

        // Cek password lama dulu sebelum ganti
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Password saat ini tidak benar.',
                'errors'  => ['current_password' => ['Password saat ini tidak benar.']],
            ], 422);
        }

        // Password otomatis di-hash lewat cast 'hashed' di model User
        $user->update(['password' => $request->new_password]);

        // Cabut semua token biar user login ulang pakai password baru
        $user->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diubah. Silakan login ulang.',
        ]);
    }
}

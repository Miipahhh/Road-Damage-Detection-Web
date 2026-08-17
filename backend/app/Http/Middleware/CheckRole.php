<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{

    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Tidak terautentikasi.'], 401);
        }

        if (!in_array($request->user()->role, $roles)) {
            return response()->json(['message' => 'Akses ditolak. Anda tidak memiliki izin.'], 403);
        }

        if (!$request->user()->is_active) {
            return response()->json(['message' => 'Akun Anda telah dinonaktifkan.'], 403);
        }

        return $next($request);
    }
}

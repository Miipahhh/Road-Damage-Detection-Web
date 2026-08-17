<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'password'  => 'hashed', // otomatis di-hash tiap kali di-set
    ];

    /** Cek role admin */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /** Cek role petugas (surveyor lapangan) */
    public function isPetugas(): bool
    {
        return $this->role === 'petugas';
    }

    /** Cek role tim perbaikan */
    public function isReparasi(): bool
    {
        return $this->role === 'reparasi';
    }

    /** Sesi tracking yang dibuat user ini (petugas) */
    public function trackingSessions()
    {
        return $this->hasMany(TrackingSession::class);
    }

    /** Kerusakan yang diperbaiki user ini (reparasi) */
    public function repairedDamages()
    {
        return $this->hasMany(RoadDamage::class, 'repaired_by');
    }
}

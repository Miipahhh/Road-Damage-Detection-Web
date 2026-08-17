<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TrackingSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'started_at',
        'ended_at',
        'route_path',
        'status',
        'start_point',
        'end_point',
        'ruas_jalan_name',
    ];

    protected $casts = [
        'started_at'  => 'datetime',
        'ended_at'    => 'datetime',
        'route_path'  => 'array', // list titik GPS {lat, lng, timestamp}
        'start_point' => 'array',  // {lat, lng}
        'end_point'   => 'array',  // {lat, lng}
    ];

    /**
     * User pemilik sesi ini, withTrashed biar tetap kebaca walau user sudah dihapus
     */
    public function user()
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    /**
     * Kerusakan jalan yang ditemukan selama sesi ini
     */
    public function roadDamages()
    {
        return $this->hasMany(RoadDamage::class);
    }

    /**
     * Cek apakah sesi masih berjalan
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Hitung durasi sesi dalam menit, null kalau belum selesai
     */
    public function getDurationMinutes(): ?float
    {
        if (!$this->ended_at) return null;
        return $this->started_at->diffInMinutes($this->ended_at);
    }
}

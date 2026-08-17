<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RoadDamage extends Model
{
    use HasFactory;

    protected $fillable = [
        'tracking_session_id',
        'image_path',
        'damage_type',
        'confidence',
        'latitude',
        'longitude',
        'location_address',
        'area_cm2',
        'area_m2',
        'area_px',
        'bbox',
        'notes',
        'severity',
        'status',
        // Field perbaikan
        'repair_photo_path',
        'repair_notes',
        'repaired_by',
        'repaired_at',
    ];

    protected $casts = [
        'confidence'  => 'float',
        'latitude'    => 'float',
        'longitude'   => 'float',
        'area_cm2'    => 'float',
        'area_m2'     => 'float',
        'area_px'     => 'integer',
        'bbox'        => 'array',
        'repaired_at' => 'datetime',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
    ];

    /** Sesi tracking asal kerusakan ini (bisa null kalau sesi dihapus) */
    public function trackingSession()
    {
        return $this->belongsTo(TrackingSession::class);
    }

    /** User reparasi yang memperbaiki, withTrashed biar tetap kebaca walau user sudah dihapus */
    public function repairedBy()
    {
        return $this->belongsTo(User::class, 'repaired_by')->withTrashed();
    }

    /** Hitung severity berdasarkan tipe kerusakan & luas area (cm2) */
    public function calculateSeverity(): string
    {
        if ($this->damage_type === 'Lubang') {
            if ($this->area_cm2 > 1000) return 'high';
            if ($this->area_cm2 > 500)  return 'medium';
            return 'low';
        }

        // Selain lubang berarti retak, threshold luasnya beda
        if ($this->area_cm2 > 5000) return 'high';
        if ($this->area_cm2 > 2000) return 'medium';
        return 'low';
    }

    /** Scope: filter berdasarkan tipe kerusakan */
    public function scopeOfType($query, string $type)
    {
        return $query->where('damage_type', $type);
    }

    /** Scope: filter berdasarkan status */
    public function scopeWithStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /** Scope: filter lokasi dalam radius tertentu (km), pakai bounding box sederhana */
    public function scopeNearLocation($query, float $lat, float $lng, float $radiusKm = 5)
    {
        // 1 derajat lat ~ 111 km, lng disesuaikan dengan cos(lat)
        $latRange = $radiusKm / 111;
        $lngRange = $radiusKm / (111 * cos(deg2rad($lat)));

        return $query->whereBetween('latitude', [$lat - $latRange, $lat + $latRange])
                     ->whereBetween('longitude', [$lng - $lngRange, $lng + $lngRange]);
    }
}

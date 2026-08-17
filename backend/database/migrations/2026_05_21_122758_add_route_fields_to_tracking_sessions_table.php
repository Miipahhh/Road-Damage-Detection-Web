<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tracking_sessions', function (Blueprint $table) {
            // Titik mulai yang dipilih petugas di peta
            $table->json('start_point')->nullable()->after('route_path');
            // Titik akhir yang dipilih petugas di peta
            $table->json('end_point')->nullable()->after('start_point');
            // Nama ruas jalan yang dipilih (dari GeoJSON)
            $table->string('ruas_jalan_name')->nullable()->after('end_point');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tracking_sessions', function (Blueprint $table) {
            $table->dropColumn(['start_point', 'end_point', 'ruas_jalan_name']);
        });
    }
};

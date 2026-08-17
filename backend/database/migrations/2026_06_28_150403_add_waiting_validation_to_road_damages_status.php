<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tambah nilai 'waiting_validation' ke ENUM status pada tabel road_damages.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE road_damages MODIFY COLUMN status ENUM('pending', 'verified', 'waiting_validation', 'repaired') NOT NULL DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Pastikan tidak ada data waiting_validation sebelum rollback
        DB::statement("UPDATE road_damages SET status = 'verified' WHERE status = 'waiting_validation'");
        DB::statement("ALTER TABLE road_damages MODIFY COLUMN status ENUM('pending', 'verified', 'repaired') NOT NULL DEFAULT 'pending'");
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL ENUM harus diubah dengan ALTER TABLE langsung
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin','petugas','reparasi') NOT NULL DEFAULT 'petugas'");
    }

    public function down(): void
    {
        // Rollback: ubah kembali ke enum lama (user dengan role reparasi harus dihapus dulu)
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin','petugas') NOT NULL DEFAULT 'petugas'");
    }
};

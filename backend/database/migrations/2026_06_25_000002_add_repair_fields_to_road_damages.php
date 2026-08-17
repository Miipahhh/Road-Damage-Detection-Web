<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('road_damages', function (Blueprint $table) {
            $table->string('repair_photo_path')->nullable()->after('notes');
            $table->text('repair_notes')->nullable()->after('repair_photo_path');
            $table->foreignId('repaired_by')->nullable()->after('repair_notes')->constrained('users')->nullOnDelete();
            $table->timestamp('repaired_at')->nullable()->after('repaired_by');
        });
    }

    public function down(): void
    {
        Schema::table('road_damages', function (Blueprint $table) {
            $table->dropForeign(['repaired_by']);
            $table->dropColumn(['repair_photo_path', 'repair_notes', 'repaired_by', 'repaired_at']);
        });
    }
};

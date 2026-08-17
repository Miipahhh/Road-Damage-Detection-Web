<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('road_damages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tracking_session_id')->nullable()->constrained('tracking_sessions')->onDelete('cascade');
            $table->string('image_path');
            $table->string('damage_type'); // Retak-Buaya, Retak-Memanjang, Retak-Melintang, Lubang
            $table->decimal('confidence', 5, 4); // 0.0000 - 1.0000
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('location_address')->nullable();
            $table->decimal('area_cm2', 10, 2)->nullable();
            $table->decimal('area_m2', 10, 4)->nullable();
            $table->integer('area_px')->nullable();
            $table->json('bbox')->nullable(); // {x1, y1, x2, y2}
            $table->text('notes')->nullable();
            $table->enum('severity', ['low', 'medium', 'high'])->default('medium');
            $table->enum('status', ['pending', 'verified', 'repaired'])->default('pending');
            $table->timestamps();
            
            // Indexes for better query performance
            $table->index('tracking_session_id');
            $table->index('damage_type');
            $table->index('status');
            $table->index(['latitude', 'longitude']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('road_damages');
    }
};

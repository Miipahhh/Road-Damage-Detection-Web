<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('users') && !\Illuminate\Support\Facades\Schema::hasColumn('users', 'deleted_at')) {
                \Illuminate\Support\Facades\Schema::table('users', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->softDeletes();
                });
            }
        } catch (\Exception $e) {
            // Ignore if DB connection is not available
        }
    }
}

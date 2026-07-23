<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('feeding_schedules', function (Blueprint $table) {
            $table->string('session_type', 100)->default('Regular')->after('title');
        });
    }

    public function down(): void
    {
        Schema::table('feeding_schedules', function (Blueprint $table) {
            $table->dropColumn('session_type');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->time('attendance_time')->nullable()->after('attendance_date');
            $table->timestamp('recorded_at')->nullable()->after('attendance_time');
            $table->foreignId('recorded_by')->nullable()->after('remarks')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recorded_by');
            $table->dropColumn(['attendance_time', 'recorded_at']);
        });
    }
};

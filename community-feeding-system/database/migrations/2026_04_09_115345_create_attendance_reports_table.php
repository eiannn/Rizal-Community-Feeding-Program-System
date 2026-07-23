<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_reports', function (Blueprint $table) {
            $table->id();
            $table->string('report_type', 50);
            $table->foreignId('feeding_schedule_id')->nullable()->constrained('feeding_schedules')->nullOnDelete();
            $table->date('report_date');
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('file_type', 20)->default('csv');
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_reports');
    }
};

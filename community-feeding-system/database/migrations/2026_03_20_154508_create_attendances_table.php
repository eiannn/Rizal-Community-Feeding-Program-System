<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('beneficiary_id')->constrained('beneficiaries')->cascadeOnDelete();
            $table->foreignId('feeding_schedule_id')->constrained('feeding_schedules')->cascadeOnDelete();
            $table->date('attendance_date');
            $table->enum('attendance_status', ['Present', 'Absent', 'Late', 'Excused'])->default('Present');
            $table->boolean('meal_received')->default(false);
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->unique(['beneficiary_id', 'feeding_schedule_id', 'attendance_date'], 'unique_attendance_record');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feeding_schedule_beneficiary', function (Blueprint $table) {
            $table->id();
            $table->foreignId('feeding_schedule_id')->constrained('feeding_schedules')->cascadeOnDelete();
            $table->foreignId('beneficiary_id')->constrained('beneficiaries')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['feeding_schedule_id', 'beneficiary_id'], 'schedule_beneficiary_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feeding_schedule_beneficiary');
    }
};

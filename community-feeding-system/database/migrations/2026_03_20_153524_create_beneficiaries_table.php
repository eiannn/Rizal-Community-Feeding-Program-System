<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('beneficiaries', function (Blueprint $table) {
            $table->id();
            $table->string('beneficiary_code')->unique();
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->enum('sex', ['Male', 'Female']);
            $table->date('birth_date');
            $table->string('guardian_name');
            $table->string('guardian_contact')->nullable();
            $table->text('address');
            $table->foreignId('purok_id')->constrained('puroks')->cascadeOnDelete();
            $table->enum('status', ['Active', 'Inactive', 'Completed'])->default('Active');
            $table->string('profile_photo')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('beneficiaries');
    }
};
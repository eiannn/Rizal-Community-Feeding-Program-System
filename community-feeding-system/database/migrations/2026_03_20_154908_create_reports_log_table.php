<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports_log', function (Blueprint $table) {
            $table->id();
            $table->string('report_type');
            $table->foreignId('generated_by')->constrained('users')->cascadeOnDelete();
            $table->dateTime('date_generated');
            $table->text('parameters')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports_log');
    }
};
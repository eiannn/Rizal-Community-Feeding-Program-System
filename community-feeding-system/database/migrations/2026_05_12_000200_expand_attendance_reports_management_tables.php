<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('beneficiaries', function (Blueprint $table) {
            if (! Schema::hasColumn('beneficiaries', 'complete_name')) {
                $table->string('complete_name')->nullable()->after('last_name');
            }
            if (! Schema::hasColumn('beneficiaries', 'age')) {
                $table->unsignedTinyInteger('age')->nullable()->after('complete_name');
            }
            if (! Schema::hasColumn('beneficiaries', 'date_of_birth')) {
                $table->date('date_of_birth')->nullable()->after('birth_date');
            }
            if (! Schema::hasColumn('beneficiaries', 'height')) {
                $table->decimal('height', 5, 2)->nullable()->after('date_of_birth');
            }
            if (! Schema::hasColumn('beneficiaries', 'weight')) {
                $table->decimal('weight', 5, 2)->nullable()->after('height');
            }
            if (! Schema::hasColumn('beneficiaries', 'contact_number')) {
                $table->string('contact_number')->nullable()->after('weight');
            }
            if (! Schema::hasColumn('beneficiaries', 'school_name')) {
                $table->string('school_name')->nullable()->after('purok_id');
            }
            if (! Schema::hasColumn('beneficiaries', 'school_level')) {
                $table->string('school_level')->nullable()->after('school_name');
            }
            if (! Schema::hasColumn('beneficiaries', 'grade_level')) {
                $table->string('grade_level')->nullable()->after('school_level');
            }
            if (! Schema::hasColumn('beneficiaries', 'school_year')) {
                $table->string('school_year')->nullable()->after('grade_level');
            }
            if (! Schema::hasColumn('beneficiaries', 'father_name')) {
                $table->string('father_name')->nullable()->after('school_year');
            }
            if (! Schema::hasColumn('beneficiaries', 'mother_name')) {
                $table->string('mother_name')->nullable()->after('father_name');
            }
            if (! Schema::hasColumn('beneficiaries', 'relationship_to_guardian')) {
                $table->string('relationship_to_guardian')->nullable()->after('guardian_name');
            }
            if (! Schema::hasColumn('beneficiaries', 'parent_guardian_contact_number')) {
                $table->string('parent_guardian_contact_number')->nullable()->after('guardian_contact');
            }
            if (! Schema::hasColumn('beneficiaries', 'emergency_contact_number')) {
                $table->string('emergency_contact_number')->nullable()->after('parent_guardian_contact_number');
            }
            if (! Schema::hasColumn('beneficiaries', 'feeding_schedule_id')) {
                $table->foreignId('feeding_schedule_id')->nullable()->after('emergency_contact_number')->constrained('feeding_schedules')->nullOnDelete();
            }
        });

        Schema::table('nutrition_records', function (Blueprint $table) {
            if (! Schema::hasColumn('nutrition_records', 'bmi')) {
                $table->decimal('bmi', 5, 2)->nullable()->after('weight_kg');
            }
            if (! Schema::hasColumn('nutrition_records', 'recorded_by')) {
                $table->foreignId('recorded_by')->nullable()->after('remarks')->constrained('users')->nullOnDelete();
            }
        });

        Schema::table('feeding_schedules', function (Blueprint $table) {
            if (! Schema::hasColumn('feeding_schedules', 'schedule_days')) {
                $table->string('schedule_days')->nullable()->after('schedule_date');
            }
            if (! Schema::hasColumn('feeding_schedules', 'remarks')) {
                $table->text('remarks')->nullable()->after('description');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'complete_name')) {
                $table->string('complete_name')->nullable()->after('name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'complete_name')) {
                $table->dropColumn('complete_name');
            }
        });

        Schema::table('feeding_schedules', function (Blueprint $table) {
            foreach (['schedule_days', 'remarks'] as $column) {
                if (Schema::hasColumn('feeding_schedules', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('nutrition_records', function (Blueprint $table) {
            if (Schema::hasColumn('nutrition_records', 'recorded_by')) {
                $table->dropConstrainedForeignId('recorded_by');
            }
            if (Schema::hasColumn('nutrition_records', 'bmi')) {
                $table->dropColumn('bmi');
            }
        });

        Schema::table('beneficiaries', function (Blueprint $table) {
            if (Schema::hasColumn('beneficiaries', 'feeding_schedule_id')) {
                $table->dropConstrainedForeignId('feeding_schedule_id');
            }

            foreach ([
                'complete_name',
                'age',
                'date_of_birth',
                'height',
                'weight',
                'contact_number',
                'school_name',
                'school_level',
                'grade_level',
                'school_year',
                'father_name',
                'mother_name',
                'relationship_to_guardian',
                'parent_guardian_contact_number',
                'emergency_contact_number',
            ] as $column) {
                if (Schema::hasColumn('beneficiaries', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

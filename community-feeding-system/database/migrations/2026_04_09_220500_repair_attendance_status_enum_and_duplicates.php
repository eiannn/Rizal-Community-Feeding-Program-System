<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('attendances') || ! Schema::hasColumn('attendances', 'attendance_status')) {
            return;
        }

        $driver = DB::getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            // Normalize any legacy/invalid values before tightening enum values.
            DB::statement("
                UPDATE attendances
                SET attendance_status = CASE LOWER(attendance_status)
                    WHEN 'present' THEN 'Present'
                    WHEN 'absent' THEN 'Absent'
                    WHEN 'late' THEN 'Late'
                    WHEN 'excused' THEN 'Excused'
                    ELSE 'Present'
                END
            ");

            DB::statement("
                ALTER TABLE attendances
                MODIFY attendance_status ENUM('Present', 'Absent', 'Late', 'Excused')
                NOT NULL DEFAULT 'Present'
            ");
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('attendances') || ! Schema::hasColumn('attendances', 'attendance_status')) {
            return;
        }

        $driver = DB::getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("UPDATE attendances SET attendance_status = 'Absent' WHERE attendance_status IN ('Late', 'Excused')");
            DB::statement("
                ALTER TABLE attendances
                MODIFY attendance_status ENUM('Present', 'Absent')
                NOT NULL DEFAULT 'Present'
            ");
        }
    }
};

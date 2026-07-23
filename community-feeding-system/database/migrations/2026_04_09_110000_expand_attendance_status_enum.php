<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE attendances MODIFY attendance_status ENUM('Present', 'Absent', 'Late', 'Excused') NOT NULL DEFAULT 'Present'");
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("UPDATE attendances SET attendance_status = 'Absent' WHERE attendance_status IN ('Late', 'Excused')");
            DB::statement("ALTER TABLE attendances MODIFY attendance_status ENUM('Present', 'Absent') NOT NULL DEFAULT 'Present'");
        }
    }
};

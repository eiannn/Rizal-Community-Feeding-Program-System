<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'two_factor_enabled')) {
                $table->boolean('two_factor_enabled')->default(false)->after('status');
            }

            if (! Schema::hasColumn('users', 'two_factor_secret')) {
                $table->string('two_factor_secret', 255)->nullable()->after('two_factor_enabled');
            }
        });

        // Enforce allowed values at DB level (MySQL/MariaDB) to reduce invalid role/status writes.
        $driver = DB::getDriverName();
        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("UPDATE users SET role = 'Staff' WHERE role NOT IN ('Admin','Staff','Viewer') OR role IS NULL OR role = ''");
            DB::statement("UPDATE users SET status = 'Active' WHERE status NOT IN ('Active','Inactive') OR status IS NULL OR status = ''");
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('Admin','Staff','Viewer') NOT NULL DEFAULT 'Staff'");
            DB::statement("ALTER TABLE users MODIFY COLUMN status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active'");
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        $driver = DB::getDriverName();
        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE users MODIFY COLUMN role VARCHAR(255) NOT NULL DEFAULT 'Staff'");
            DB::statement("ALTER TABLE users MODIFY COLUMN status VARCHAR(255) NOT NULL DEFAULT 'Active'");
        }

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'two_factor_secret')) {
                $table->dropColumn('two_factor_secret');
            }
            if (Schema::hasColumn('users', 'two_factor_enabled')) {
                $table->dropColumn('two_factor_enabled');
            }
        });
    }
};

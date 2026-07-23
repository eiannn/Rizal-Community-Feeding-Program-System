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
            if (! Schema::hasColumn('users', 'username')) {
                $table->string('username')->nullable()->unique()->after('email');
            }

            if (! Schema::hasColumn('users', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('profile_photo_path')->constrained('users')->nullOnDelete();
            }
        });

        $driver = DB::getDriverName();
        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("UPDATE users SET role = 'Staff' WHERE role NOT IN ('Admin','Staff') OR role IS NULL OR role = ''");
            DB::statement("UPDATE users SET status = 'Active' WHERE status NOT IN ('Active','Inactive','Blocked') OR status IS NULL OR status = ''");
            DB::statement("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL");
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('Admin','Staff') NOT NULL DEFAULT 'Staff'");
            DB::statement("ALTER TABLE users MODIFY COLUMN status ENUM('Active','Inactive','Blocked') NOT NULL DEFAULT 'Active'");
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        $driver = DB::getDriverName();
        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("UPDATE users SET status = 'Inactive' WHERE status = 'Blocked'");
            DB::statement("ALTER TABLE users MODIFY COLUMN status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active'");
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('Admin','Staff','Viewer') NOT NULL DEFAULT 'Staff'");
            DB::statement("UPDATE users SET email = CONCAT('user-', id, '@local.invalid') WHERE email IS NULL OR email = ''");
            DB::statement("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NOT NULL");
        }

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'created_by')) {
                $table->dropConstrainedForeignId('created_by');
            }

            if (Schema::hasColumn('users', 'username')) {
                $table->dropUnique(['username']);
                $table->dropColumn('username');
            }
        });
    }
};

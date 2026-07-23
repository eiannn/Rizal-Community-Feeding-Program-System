<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'name' => 'System Administrator',
                'password' => Hash::make('admin@admin1'),
                'role' => 'Admin',
                'status' => 'Active',
            ]
        );

        User::updateOrCreate(
            ['email' => 'staff@example.com'],
            [
                'name' => 'Staff User',
                'role' => 'Staff',
                'status' => 'Active',
            ]
        );
    }
}

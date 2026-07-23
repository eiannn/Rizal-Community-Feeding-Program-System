<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('beneficiaries', function (Blueprint $table) {
            if (! Schema::hasColumn('beneficiaries', 'province_code')) {
                $table->string('province_code', 50)->nullable()->after('address');
            }
            if (! Schema::hasColumn('beneficiaries', 'province_name')) {
                $table->string('province_name')->nullable()->after('province_code');
            }
            if (! Schema::hasColumn('beneficiaries', 'city_municipality_code')) {
                $table->string('city_municipality_code', 50)->nullable()->after('province_name');
            }
            if (! Schema::hasColumn('beneficiaries', 'city_municipality_name')) {
                $table->string('city_municipality_name')->nullable()->after('city_municipality_code');
            }
            if (! Schema::hasColumn('beneficiaries', 'barangay_code')) {
                $table->string('barangay_code', 50)->nullable()->after('city_municipality_name');
            }
            if (! Schema::hasColumn('beneficiaries', 'barangay_name')) {
                $table->string('barangay_name')->nullable()->after('barangay_code');
            }
            if (! Schema::hasColumn('beneficiaries', 'street_address')) {
                $table->text('street_address')->nullable()->after('barangay_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('beneficiaries', function (Blueprint $table) {
            foreach ([
                'street_address',
                'barangay_name',
                'barangay_code',
                'city_municipality_name',
                'city_municipality_code',
                'province_name',
                'province_code',
            ] as $column) {
                if (Schema::hasColumn('beneficiaries', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

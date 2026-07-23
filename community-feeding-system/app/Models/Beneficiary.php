<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Beneficiary extends Model
{
    protected $fillable = [
        'beneficiary_code',
        'first_name',
        'middle_name',
        'last_name',
        'complete_name',
        'age',
        'sex',
        'birth_date',
        'date_of_birth',
        'height',
        'weight',
        'contact_number',
        'guardian_name',
        'relationship_to_guardian',
        'guardian_contact',
        'parent_guardian_contact_number',
        'emergency_contact_number',
        'address',
        'province_code',
        'province_name',
        'city_municipality_code',
        'city_municipality_name',
        'barangay_code',
        'barangay_name',
        'street_address',
        'purok_id',
        'school_name',
        'school_level',
        'grade_level',
        'school_year',
        'father_name',
        'mother_name',
        'feeding_schedule_id',
        'status',
        'profile_photo',
    ];

    public function purok(): BelongsTo
    {
        return $this->belongsTo(Purok::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function nutritionRecords(): HasMany
    {
        return $this->hasMany(NutritionRecord::class);
    }

    public function latestNutritionRecord(): HasOne
    {
        return $this->hasOne(NutritionRecord::class)->latestOfMany('date_recorded');
    }

    public function feedingSchedules(): BelongsToMany
    {
        return $this->belongsToMany(FeedingSchedule::class, 'feeding_schedule_beneficiary')
            ->withTimestamps();
    }

    public function primaryFeedingSchedule(): BelongsTo
    {
        return $this->belongsTo(FeedingSchedule::class, 'feeding_schedule_id');
    }
}

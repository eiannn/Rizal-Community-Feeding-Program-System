<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FeedingSchedule extends Model
{
    protected $fillable = [
        'title',
        'session_type',
        'description',
        'schedule_date',
        'schedule_days',
        'start_time',
        'end_time',
        'location',
        'remarks',
        'status',
    ];

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function beneficiaries(): BelongsToMany
    {
        return $this->belongsToMany(Beneficiary::class, 'feeding_schedule_beneficiary')
            ->withTimestamps();
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    protected $fillable = [
        'beneficiary_id',
        'feeding_schedule_id',
        'attendance_date',
        'attendance_time',
        'attendance_status',
        'meal_received',
        'remarks',
        'recorded_at',
        'recorded_by',
    ];

    protected $casts = [
        'attendance_date' => 'date:Y-m-d',
        'recorded_at' => 'datetime',
        'meal_received' => 'boolean',
    ];

    public function beneficiary(): BelongsTo
    {
        return $this->belongsTo(Beneficiary::class);
    }

    public function feedingSchedule(): BelongsTo
    {
        return $this->belongsTo(FeedingSchedule::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}

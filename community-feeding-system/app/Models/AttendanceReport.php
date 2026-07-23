<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceReport extends Model
{
    protected $fillable = [
        'report_type',
        'feeding_schedule_id',
        'report_date',
        'period_start',
        'period_end',
        'file_name',
        'file_path',
        'file_type',
        'generated_by',
        'meta',
    ];

    protected $casts = [
        'report_date' => 'date:Y-m-d',
        'period_start' => 'date:Y-m-d',
        'period_end' => 'date:Y-m-d',
        'meta' => 'array',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(FeedingSchedule::class, 'feeding_schedule_id');
    }

    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}

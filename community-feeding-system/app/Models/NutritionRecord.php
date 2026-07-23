<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NutritionRecord extends Model
{
    protected $fillable = [
        'beneficiary_id',
        'date_recorded',
        'height_cm',
        'weight_kg',
        'bmi',
        'nutrition_status',
        'remarks',
        'recorded_by',
    ];

    public function beneficiary(): BelongsTo
    {
        return $this->belongsTo(Beneficiary::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}

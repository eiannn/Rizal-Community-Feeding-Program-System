<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Purok extends Model
{
    protected $fillable = [
        'purok_name',
    ];

    public function beneficiaries(): HasMany
    {
        return $this->hasMany(Beneficiary::class);
    }
}
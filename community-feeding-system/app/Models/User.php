<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'complete_name',
        'email',
        'username',
        'role',
        'status',
        'profile_photo_path',
        'created_by',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function normalizedRole(): string
    {
        return strtolower(trim((string) ($this->role ?? '')));
    }

    public function normalizedStatus(): string
    {
        return strtolower(trim((string) ($this->status ?? 'Active')));
    }

    public function isAdmin(): bool
    {
        return $this->normalizedRole() === 'admin';
    }

    public function isStaff(): bool
    {
        return $this->normalizedRole() === 'staff';
    }

    public function isActive(): bool
    {
        return $this->normalizedStatus() === 'active';
    }
}

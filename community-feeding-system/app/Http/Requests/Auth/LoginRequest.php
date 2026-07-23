<?php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    private const MAX_ATTEMPTS = 5;
    private const BASE_BACKOFF_SECONDS = 30;
    private const MAX_BACKOFF_SECONDS = 900;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email_or_username' => ['bail', 'required', 'string', 'max:255'],
            'password' => ['required', 'string'],
            'role' => ['required', Rule::in(['admin', 'staff'])],
            'two_factor_code' => ['nullable', 'string', 'size:6'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $identifier = $this->input('email_or_username', $this->input('email'));
        $role = $this->input('role');

        if (is_string($identifier)) {
            $identifier = Str::lower(trim($identifier));
        }

        if (is_string($role)) {
            $role = Str::lower(trim($role));
        }

        $this->merge([
            'email_or_username' => $identifier,
            'email' => $identifier,
            'role' => $role,
        ]);
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        try {
            $user = $this->findUserByIdentifier((string) $this->input('email_or_username'));
        } catch (QueryException $e) {
            throw ValidationException::withMessages([
                'email_or_username' => 'Login is temporarily unavailable because the database is offline. Please start MySQL and try again.',
            ]);
        }

        if (! $user || ! Hash::check((string) $this->input('password'), (string) $user->password)) {
            $this->hitRateLimiter();
            $this->throwLoginError('email_or_username', 'Invalid email/username or password.');
        }

        $actualStatus = $this->normalizeValue((string) ($user->status ?? 'Active'));
        if ($actualStatus !== 'active') {
            $this->throwLoginError('email_or_username', 'Your account is not allowed to access the system. Please contact the administrator.');
        }

        $actualRole = $this->normalizeValue((string) ($user->role ?? ''));
        if (! in_array($actualRole, ['admin', 'staff'], true)) {
            $this->throwLoginError('role', 'Access denied. Authorized personnel only.');
        }

        $selectedRole = $this->normalizeValue((string) $this->input('role'));
        if ($selectedRole !== $actualRole) {
            $message = $actualRole === 'staff'
                ? 'Role mismatch. This account is registered as Staff. Please select Staff to continue.'
                : 'Role mismatch. This account is registered as Admin. Please select Admin to continue.';

            $this->throwLoginError('role', $message);
        }

        Auth::login($user, $this->boolean('remember'));
        $this->ensureAdminTwoFactorIfEnabled();
        RateLimiter::clear($this->throttleKey());
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), self::MAX_ATTEMPTS)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email_or_username' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('email_or_username')).'|'.$this->ip());
    }

    private function ensureAdminTwoFactorIfEnabled(): void
    {
        $user = Auth::user();

        if (! $user) {
            return;
        }

        $isAdmin = $this->normalizeValue((string) ($user->role ?? '')) === 'admin';
        $twoFactorEnabled = (bool) ($user->two_factor_enabled ?? false);
        $twoFactorSecret = (string) ($user->two_factor_secret ?? '');

        if (! $isAdmin || ! $twoFactorEnabled || $twoFactorSecret === '') {
            return;
        }

        $submittedCode = (string) $this->input('two_factor_code', '');
        if (! preg_match('/^\d{6}$/', $submittedCode)) {
            Auth::logout();
            throw ValidationException::withMessages([
                'two_factor_code' => 'Two-factor authentication code is required for this admin account.',
            ]);
        }

        if (! hash_equals($twoFactorSecret, $submittedCode)) {
            Auth::logout();
            throw ValidationException::withMessages([
                'two_factor_code' => 'Invalid two-factor authentication code.',
            ]);
        }
    }

    private function hitRateLimiter(): void
    {
        $attempts = RateLimiter::attempts($this->throttleKey()) + 1;
        $decaySeconds = min(self::BASE_BACKOFF_SECONDS * (2 ** max($attempts - 1, 0)), self::MAX_BACKOFF_SECONDS);

        RateLimiter::hit($this->throttleKey(), $decaySeconds);
    }

    private function findUserByIdentifier(string $identifier): mixed
    {
        $identifier = Str::lower(trim($identifier));
        $userModel = config('auth.providers.users.model');

        return $userModel::query()
            ->whereRaw('LOWER(email) = ?', [$identifier])
            ->when(Schema::hasColumn('users', 'username'), function ($query) use ($identifier) {
                $query->orWhereRaw('LOWER(username) = ?', [$identifier]);
            })
            ->first();
    }

    private function normalizeValue(string $value): string
    {
        return Str::of($value)->trim()->lower()->toString();
    }

    private function throwLoginError(string $field, string $message): never
    {
        $messages = [$field => $message];

        if ($field === 'email_or_username') {
            $messages['email'] = $message;
        }

        throw ValidationException::withMessages($messages);
    }
}

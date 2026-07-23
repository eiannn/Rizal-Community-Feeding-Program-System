<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\AttendanceReport;
use App\Models\Beneficiary;
use App\Models\FeedingSchedule;
use App\Models\NutritionRecord;
use App\Models\Purok;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Carbon;

class AppDataController extends Controller
{
    private function calculateBmiValue(mixed $heightCm, mixed $weightKg): float
    {
        $heightMeters = ((float) $heightCm) / 100;
        if ($heightMeters <= 0) {
            return 0.0;
        }

        return round(((float) $weightKg) / ($heightMeters * $heightMeters), 1);
    }

    private function resolveNutritionStatusFromBmi(float $bmi, ?string $existingStatus = null): string
    {
        if ($bmi < 16.0) {
            return 'Severely Underweight';
        }

        if ($bmi < 18.5) {
            return 'Underweight';
        }

        if ($bmi <= 24.9) {
            return 'Normal';
        }

        return 'Overweight';
    }

    private function hasColumn(string $table, string $column): bool
    {
        return Schema::hasTable($table) && Schema::hasColumn($table, $column);
    }

    private function hasTable(string $table): bool
    {
        return Schema::hasTable($table);
    }

    private function fullNameLikeExpression(string $tablePrefix = ''): string
    {
        $prefix = $tablePrefix !== '' ? $tablePrefix.'.' : '';

        if (DB::getDriverName() === 'sqlite') {
            return "LOWER(TRIM(REPLACE(REPLACE(COALESCE({$prefix}first_name, '') || ' ' || COALESCE({$prefix}middle_name, '') || ' ' || COALESCE({$prefix}last_name, ''), '  ', ' '), '  ', ' '))) LIKE ?";
        }

        return "LOWER(TRIM(CONCAT_WS(' ', NULLIF({$prefix}first_name, ''), NULLIF({$prefix}middle_name, ''), NULLIF({$prefix}last_name, '')))) LIKE ?";
    }

    private function searchNeedle(mixed $value): string
    {
        return '%'.Str::lower(trim((string) $value)).'%';
    }

    private function whereBeneficiaryNameContains($query, mixed $value, string $tablePrefix = 'beneficiaries'): void
    {
        $needle = $this->searchNeedle($value);
        $prefix = $tablePrefix !== '' ? $tablePrefix.'.' : '';

        $query->where(function ($builder) use ($needle, $prefix, $tablePrefix) {
            $builder
                ->whereRaw("LOWER({$prefix}first_name) LIKE ?", [$needle])
                ->orWhereRaw("LOWER({$prefix}middle_name) LIKE ?", [$needle])
                ->orWhereRaw("LOWER({$prefix}last_name) LIKE ?", [$needle])
                ->orWhereRaw($this->fullNameLikeExpression($tablePrefix), [$needle]);

            if ($this->hasColumn('beneficiaries', 'complete_name')) {
                $builder->orWhereRaw("LOWER({$prefix}complete_name) LIKE ?", [$needle]);
            }
        });
    }

    private function resolveUserProfilePhotoUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return Storage::disk('public')->url($path);
    }

    private function normalizeUserRole(?string $role): string
    {
        return Str::of($role ?? 'staff')->trim()->lower()->toString();
    }

    private function normalizeUserStatus(?string $status): string
    {
        return Str::of($status ?? 'active')->trim()->lower()->toString();
    }

    private function displayUserRole(?string $role): string
    {
        return ucfirst($this->normalizeUserRole($role));
    }

    private function displayUserStatus(?string $status): string
    {
        return ucfirst($this->normalizeUserStatus($status));
    }

    private function displayUserEmail(User $user): ?string
    {
        $email = $user->email;

        if ($user->username && $email && Str::endsWith($email, '@local.invalid')) {
            return null;
        }

        return $email;
    }

    private function authenticatedUserPayload(?User $user): array
    {
        if (! $user) {
            return [];
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $this->displayUserEmail($user),
            'username' => $this->hasColumn('users', 'username') ? $user->username : null,
            'role' => $this->normalizeUserRole($user->role),
            'display_role' => $this->displayUserRole($user->role),
            'status' => $this->normalizeUserStatus($user->status),
            'display_status' => $this->displayUserStatus($user->status),
            'profile_photo_url' => $this->resolveUserProfilePhotoUrl($user->profile_photo_path),
        ];
    }

    private function manilaNow(): Carbon
    {
        return now('Asia/Manila');
    }

    private function normalizePhoneNumber(?string $value): ?string
    {
        $raw = trim((string) $value);
        if ($raw === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $raw) ?: '';

        if (preg_match('/^09\d{9}$/', $digits)) {
            return $digits;
        }

        if (preg_match('/^639\d{9}$/', $digits)) {
            return '0'.substr($digits, 2);
        }

        return $raw;
    }

    private function calculateAgeFromDate(?string $date): ?int
    {
        if (! $date) {
            return null;
        }

        try {
            return (int) Carbon::parse($date)->diffInYears($this->manilaNow());
        } catch (\Throwable) {
            return null;
        }
    }

    private function resolvePurokIdFromRequest(Request $request, ?Beneficiary $beneficiary = null): int
    {
        $this->ensureDefaultPuroks();

        if ($request->filled('purok_id')) {
            return (int) $request->input('purok_id');
        }

        if ($request->filled('purok')) {
            return Purok::firstOrCreate([
                'purok_name' => trim((string) $request->input('purok')),
            ])->id;
        }

        return (int) ($beneficiary?->purok_id ?? Purok::query()->value('id'));
    }

    private function beneficiaryPayloadFromRequest(Request $request, ?Beneficiary $beneficiary = null): array
    {
        $birthDate = $request->input('birth_date', $request->input('date_of_birth', $beneficiary?->birth_date));
        $firstName = trim((string) $request->input('first_name', $beneficiary?->first_name));
        $middleName = trim((string) $request->input('middle_name', $beneficiary?->middle_name));
        $lastName = trim((string) $request->input('last_name', $beneficiary?->last_name));
        $height = $request->input('height_cm', $request->input('height', $beneficiary?->height));
        $weight = $request->input('weight_kg', $request->input('weight', $beneficiary?->weight));
        $guardianContact = $this->normalizePhoneNumber($request->input(
            'guardian_contact',
            $request->input('guardian_contact_number', $request->input('parent_guardian_contact', $beneficiary?->guardian_contact))
        ));

        $payload = [
            'beneficiary_code' => $request->input('beneficiary_code', $beneficiary?->beneficiary_code),
            'first_name' => $firstName,
            'middle_name' => $middleName ?: null,
            'last_name' => $lastName,
            'sex' => $request->input('sex', $beneficiary?->sex ?? 'Male'),
            'birth_date' => $birthDate,
            'guardian_name' => $request->input('guardian_name', $beneficiary?->guardian_name),
            'guardian_contact' => $guardianContact,
            'address' => $request->input('address', $beneficiary?->address),
            'purok_id' => $this->resolvePurokIdFromRequest($request, $beneficiary),
            'status' => $request->input('status', $beneficiary?->status ?? 'Active'),
        ];

        $optional = [
            'complete_name' => trim(collect([$firstName, $middleName, $lastName])->filter()->implode(' ')),
            'age' => $request->filled('age') ? (int) $request->input('age') : $this->calculateAgeFromDate($birthDate),
            'date_of_birth' => $birthDate,
            'height' => $height === null || $height === '' ? null : (float) $height,
            'weight' => $weight === null || $weight === '' ? null : (float) $weight,
            'contact_number' => $this->normalizePhoneNumber($request->input('contact_number', $request->input('student_contact', $beneficiary?->contact_number))),
            'relationship_to_guardian' => $request->input('relationship_to_guardian', $request->input('guardian_relationship', $beneficiary?->relationship_to_guardian)),
            'parent_guardian_contact_number' => $this->normalizePhoneNumber($request->input('parent_guardian_contact_number', $request->input('parent_guardian_contact', $beneficiary?->parent_guardian_contact_number))),
            'emergency_contact_number' => $this->normalizePhoneNumber($request->input('emergency_contact_number', $request->input('emergency_contact', $beneficiary?->emergency_contact_number))),
            'province_code' => $request->input('province_code', $beneficiary?->province_code),
            'province_name' => $request->input('province_name', $beneficiary?->province_name),
            'city_municipality_code' => $request->input('city_municipality_code', $beneficiary?->city_municipality_code),
            'city_municipality_name' => $request->input('city_municipality_name', $beneficiary?->city_municipality_name),
            'barangay_code' => $request->input('barangay_code', $beneficiary?->barangay_code),
            'barangay_name' => $request->input('barangay_name', $beneficiary?->barangay_name),
            'street_address' => $request->input('street_address', $beneficiary?->street_address),
            'school_name' => $request->input('school_name', $beneficiary?->school_name),
            'school_level' => $request->input('school_level', $beneficiary?->school_level),
            'grade_level' => $request->input('grade_level', $beneficiary?->grade_level),
            'school_year' => $request->input('school_year', $beneficiary?->school_year),
            'father_name' => $request->input('father_name', $beneficiary?->father_name),
            'mother_name' => $request->input('mother_name', $beneficiary?->mother_name),
            'feeding_schedule_id' => $request->input('feeding_schedule_id', $beneficiary?->feeding_schedule_id),
        ];

        foreach ($optional as $column => $value) {
            if ($this->hasColumn('beneficiaries', $column)) {
                $payload[$column] = $value === '' ? null : $value;
            }
        }

        return $payload;
    }

    private function resolveSortedAttendancePreviewRows(?string $reportDate, mixed $feedingScheduleId): array
    {
        if (! $reportDate) {
            return [];
        }

        return Attendance::with('beneficiary')
            ->whereDate('attendance_date', $reportDate)
            ->when($feedingScheduleId, fn ($query) => $query->where('feeding_schedule_id', $feedingScheduleId))
            ->get()
            ->map(function (Attendance $row) {
                $name = trim(($row->beneficiary?->first_name ?? '').' '.($row->beneficiary?->last_name ?? ''));

                return [
                    'id' => $row->id,
                    'beneficiary_name' => $name,
                    'beneficiary_code' => $row->beneficiary?->beneficiary_code,
                ];
            })
            ->filter(fn (array $row) => $row['beneficiary_name'] !== '')
            ->sortBy(fn (array $row) => Str::lower($row['beneficiary_name']))
            ->values()
            ->all();
    }

    private function ensureDefaultPuroks(): void
    {
        if (Purok::exists()) {
            return;
        }

        $defaults = ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6'];

        foreach ($defaults as $name) {
            Purok::create(['purok_name' => $name]);
        }
    }

    private function ensureDefaultAttendanceDependencies(): void
    {
        $this->ensureDefaultPuroks();

        $defaultPurokId = Purok::query()->value('id');

        if ($defaultPurokId !== null && ! Beneficiary::exists()) {
            Beneficiary::create([
                'beneficiary_code' => 'BEN-001',
                'first_name' => 'Sample',
                'middle_name' => null,
                'last_name' => 'Beneficiary',
                'sex' => 'Male',
                'birth_date' => now()->subYears(8)->toDateString(),
                'guardian_name' => 'Sample Guardian',
                'guardian_contact' => '09000000000',
                'address' => 'Sample Address',
                'purok_id' => $defaultPurokId,
                'status' => 'Active',
            ]);
        }

        if (! FeedingSchedule::exists()) {
            $schedulePayload = [
                'title' => 'Default Feeding Session',
                'description' => 'Auto-created so attendance can be encoded.',
                'schedule_date' => now()->toDateString(),
                'start_time' => '09:00',
                'end_time' => '11:00',
                'location' => 'Barangay Hall',
                'status' => 'Scheduled',
            ];
            if ($this->hasColumn('feeding_schedules', 'session_type')) {
                $schedulePayload['session_type'] = 'Regular';
            }
            $schedule = FeedingSchedule::create($schedulePayload);

            if ($this->hasTable('feeding_schedule_beneficiary')) {
                $schedule->beneficiaries()->sync(Beneficiary::where('status', 'Active')->pluck('id'));
            }
        }
    }

    private function normalizePsgcPayload(mixed $payload): array
    {
        $items = is_array($payload) ? $payload : [];
        if (isset($items['data']) && is_array($items['data'])) {
            $items = $items['data'];
        }

        return collect($items)
            ->filter(fn ($item) => is_array($item))
            ->map(function (array $item) {
                $code = (string) ($item['code'] ?? $item['psgcCode'] ?? $item['psgc10DigitCode'] ?? '');
                $name = (string) ($item['name'] ?? $item['description'] ?? '');

                if ($code === '' || $name === '') {
                    return null;
                }

                return array_merge($item, [
                    'code' => $code,
                    'name' => $name,
                ]);
            })
            ->filter()
            ->sortBy(fn (array $item) => Str::lower($item['name']))
            ->values()
            ->all();
    }

    private function fetchPsgcList(array $sources): array
    {
        foreach ($sources as $source) {
            try {
                $response = Http::acceptJson()
                    ->timeout(20)
                    ->retry(1, 300)
                    ->get($source['url'], $source['query'] ?? []);

                if (! $response->successful()) {
                    continue;
                }

                $items = $this->normalizePsgcPayload($response->json());
                if (! empty($items)) {
                    return $items;
                }
            } catch (\Throwable) {
                continue;
            }
        }

        throw ValidationException::withMessages([
            'psgc' => ['Unable to load PSGC address data. Please try again.'],
        ]);
    }

    private function psgcListResponse(string $cacheKey, array $sources): JsonResponse
    {
        try {
            $cache = config('cache.default') === 'array' ? Cache::store('file') : Cache::store();
            $items = $cache->remember(
                "psgc:{$cacheKey}",
                now()->addDay(),
                fn () => $this->fetchPsgcList($sources)
            );

            return response()->json($items);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->errors()['psgc'][0] ?? 'Unable to load PSGC address data. Please try again.',
            ], 502);
        }
    }

    public function dashboard(): JsonResponse
    {
        $activeBeneficiaries = Beneficiary::where('status', 'Active')->count();
        $totalBeneficiaries = Beneficiary::count();
        $attendanceTotal = Attendance::count();
        $presentToday = Attendance::whereDate('attendance_date', now()->toDateString())
            ->where('attendance_status', 'Present')
            ->count();
        $todaySchedules = FeedingSchedule::whereDate('schedule_date', now()->toDateString())->count();
        $upcomingSchedules = FeedingSchedule::where('schedule_date', '>=', now()->toDateString())->count();
        $nutritionRecords = NutritionRecord::count();

        return response()->json([
            'stats' => [
                'active_beneficiaries' => $activeBeneficiaries,
                'total_beneficiaries' => $totalBeneficiaries,
                'attendance_total' => $attendanceTotal,
                'present_today' => $presentToday,
                'today_schedules' => $todaySchedules,
                'upcoming_schedules' => $upcomingSchedules,
                'nutrition_records' => $nutritionRecords,
            ],
        ]);
    }

    public function currentUser(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->authenticatedUserPayload($request->user()),
        ]);
    }

    public function psgcProvinces(): JsonResponse
    {
        return $this->psgcListResponse('provinces', [
            ['url' => 'https://psgc.gitlab.io/api/provinces/'],
            ['url' => 'https://psgc.cloud/api/provinces'],
        ]);
    }

    public function psgcCitiesMunicipalities(): JsonResponse
    {
        return $this->psgcListResponse('cities-municipalities', [
            ['url' => 'https://psgc.gitlab.io/api/cities-municipalities/'],
            ['url' => 'https://psgc.cloud/api/v1/cities-municipalities', 'query' => ['per_page' => 2000]],
        ]);
    }

    public function psgcBarangays(): JsonResponse
    {
        return $this->psgcListResponse('barangays', [
            ['url' => 'https://psgc.gitlab.io/api/barangays/'],
            ['url' => 'https://psgc.cloud/api/barangays'],
        ]);
    }

    public function psgcCitiesMunicipalitiesByProvince(string $provinceCode): JsonResponse
    {
        return $this->psgcListResponse("province-{$provinceCode}-cities-municipalities", [
            ['url' => "https://psgc.gitlab.io/api/provinces/{$provinceCode}/cities-municipalities/"],
            ['url' => 'https://psgc.cloud/api/v1/cities-municipalities', 'query' => ['province_code' => $provinceCode, 'per_page' => 2000]],
        ]);
    }

    public function psgcBarangaysByCityMunicipality(string $cityOrMunicipalityCode): JsonResponse
    {
        return $this->psgcListResponse("city-municipality-{$cityOrMunicipalityCode}-barangays", [
            ['url' => "https://psgc.gitlab.io/api/cities-municipalities/{$cityOrMunicipalityCode}/barangays/"],
            ['url' => "https://psgc.cloud/api/v1/cities-municipalities/{$cityOrMunicipalityCode}/barangays", 'query' => ['per_page' => 5000]],
        ]);
    }

    public function beneficiaries(Request $request): JsonResponse
    {
        $query = Beneficiary::with(['purok', 'latestNutritionRecord'])->latest();

        if ($request->filled('status') && $request->status !== 'All Status') {
            $query->where('status', $request->status);
        }

        if ($request->filled('purok') && $request->purok !== 'All Purok') {
            $query->whereHas('purok', function ($builder) use ($request) {
                $builder->where('purok_name', $request->purok);
            });
        }

        if ($request->filled('query')) {
            $needle = $this->searchNeedle($request->input('query'));
            $query->where(function ($builder) use ($needle) {
                $builder
                    ->whereRaw('LOWER(beneficiary_code) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(guardian_name) LIKE ?', [$needle])
                    ->orWhereRaw($this->fullNameLikeExpression(), [$needle]);
            });
        }

        $rows = $query->limit(300)->get()->map(function (Beneficiary $b) {
            $age = $b->birth_date ? Carbon::parse($b->birth_date)->diffInYears(now()) : null;

            return [
                'id' => $b->id,
                'code' => $b->beneficiary_code,
                'name' => trim($b->first_name.' '.$b->last_name),
                'email' => strtolower($b->first_name.'.'.$b->last_name).'@example.com',
                'age_sex' => ($age ?? '-').' / '.$b->sex,
                'first_name' => $b->first_name,
                'middle_name' => $b->middle_name,
                'last_name' => $b->last_name,
                'sex' => $b->sex,
                'birth_date' => $b->birth_date ? Carbon::parse($b->birth_date)->toDateString() : null,
                'date_of_birth' => $this->hasColumn('beneficiaries', 'date_of_birth') && $b->date_of_birth ? Carbon::parse($b->date_of_birth)->toDateString() : ($b->birth_date ? Carbon::parse($b->birth_date)->toDateString() : null),
                'guardian' => $b->guardian_name,
                'guardian_name' => $b->guardian_name,
                'guardian_contact' => $b->guardian_contact,
                'contact_number' => $this->hasColumn('beneficiaries', 'contact_number') ? $b->contact_number : null,
                'address' => $b->address,
                'province_code' => $this->hasColumn('beneficiaries', 'province_code') ? $b->province_code : null,
                'province_name' => $this->hasColumn('beneficiaries', 'province_name') ? $b->province_name : null,
                'city_municipality_code' => $this->hasColumn('beneficiaries', 'city_municipality_code') ? $b->city_municipality_code : null,
                'city_municipality_name' => $this->hasColumn('beneficiaries', 'city_municipality_name') ? $b->city_municipality_name : null,
                'barangay_code' => $this->hasColumn('beneficiaries', 'barangay_code') ? $b->barangay_code : null,
                'barangay_name' => $this->hasColumn('beneficiaries', 'barangay_name') ? $b->barangay_name : null,
                'street_address' => $this->hasColumn('beneficiaries', 'street_address') ? $b->street_address : null,
                'purok' => $b->purok?->purok_name,
                'purok_id' => $b->purok_id,
                'status' => $b->status,
                'profile_photo_url' => $this->hasColumn('beneficiaries', 'profile_photo') ? $this->resolveUserProfilePhotoUrl($b->profile_photo) : null,
                'father_name' => $this->hasColumn('beneficiaries', 'father_name') ? $b->father_name : null,
                'mother_name' => $this->hasColumn('beneficiaries', 'mother_name') ? $b->mother_name : null,
                'relationship_to_guardian' => $this->hasColumn('beneficiaries', 'relationship_to_guardian') ? $b->relationship_to_guardian : null,
                'parent_guardian_contact_number' => $this->hasColumn('beneficiaries', 'parent_guardian_contact_number') ? $b->parent_guardian_contact_number : null,
                'emergency_contact_number' => $this->hasColumn('beneficiaries', 'emergency_contact_number') ? $b->emergency_contact_number : null,
                'school_name' => $this->hasColumn('beneficiaries', 'school_name') ? $b->school_name : null,
                'school_level' => $this->hasColumn('beneficiaries', 'school_level') ? $b->school_level : null,
                'grade_level' => $this->hasColumn('beneficiaries', 'grade_level') ? $b->grade_level : null,
                'school_year' => $this->hasColumn('beneficiaries', 'school_year') ? $b->school_year : null,
                'feeding_schedule_id' => $this->hasColumn('beneficiaries', 'feeding_schedule_id') ? $b->feeding_schedule_id : null,
                'height_cm' => $b->latestNutritionRecord?->height_cm !== null ? (float) $b->latestNutritionRecord->height_cm : null,
                'weight_kg' => $b->latestNutritionRecord?->weight_kg !== null ? (float) $b->latestNutritionRecord->weight_kg : null,
                'initials' => strtoupper(Str::substr($b->first_name, 0, 1).Str::substr($b->last_name, 0, 1)),
            ];
        })->values();

        return response()->json([
            'data' => $rows,
            'stats' => [
                'total' => Beneficiary::count(),
                'active' => Beneficiary::where('status', 'Active')->count(),
                'puroks' => Beneficiary::distinct('purok_id')->count('purok_id'),
                'recent' => Beneficiary::where('created_at', '>=', now()->subDays(7))->count(),
            ],
        ]);
    }

    public function storeBeneficiary(Request $request): JsonResponse
    {
        $request->validate([
            'beneficiary_code' => ['nullable', 'string', 'max:255', Rule::unique('beneficiaries', 'beneficiary_code')],
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'sex' => ['required', Rule::in(['Male', 'Female'])],
            'birth_date' => ['nullable', 'date'],
            'date_of_birth' => ['nullable', 'date'],
            'height_cm' => ['nullable', 'numeric', 'min:10', 'max:250'],
            'height' => ['nullable', 'numeric', 'min:10', 'max:250'],
            'weight_kg' => ['nullable', 'numeric', 'min:1', 'max:300'],
            'weight' => ['nullable', 'numeric', 'min:1', 'max:300'],
            'guardian_name' => ['required', 'string', 'max:255'],
            'guardian_contact' => ['nullable', 'string', 'max:50'],
            'guardian_contact_number' => ['nullable', 'string', 'max:50'],
            'parent_guardian_contact' => ['nullable', 'string', 'max:50'],
            'address' => ['required', 'string', 'max:2000'],
            'province_code' => ['nullable', 'string', 'max:50'],
            'province_name' => ['nullable', 'string', 'max:255'],
            'city_municipality_code' => ['nullable', 'string', 'max:50'],
            'city_municipality_name' => ['nullable', 'string', 'max:255'],
            'barangay_code' => ['nullable', 'string', 'max:50'],
            'barangay_name' => ['nullable', 'string', 'max:255'],
            'street_address' => ['nullable', 'string', 'max:2000'],
            'purok_id' => ['nullable', 'exists:puroks,id'],
            'purok' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['Active', 'Inactive', 'Completed'])],
            'feeding_schedule_id' => ['nullable', 'exists:feeding_schedules,id'],
            'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png', 'max:2048'],
        ]);

        if (! $request->filled('birth_date') && ! $request->filled('date_of_birth')) {
            throw ValidationException::withMessages([
                'birth_date' => ['Date of birth is required.'],
            ]);
        }

        $payload = $this->beneficiaryPayloadFromRequest($request);
        $payload['beneficiary_code'] = $payload['beneficiary_code'] ?: ('BEN-'.str_pad((string) ((Beneficiary::max('id') ?? 0) + 1), 3, '0', STR_PAD_LEFT));
        $payload['status'] = $payload['status'] ?: 'Active';
        if ($this->hasColumn('beneficiaries', 'profile_photo') && $request->hasFile('profile_photo')) {
            $payload['profile_photo'] = $request->file('profile_photo')->store('beneficiaries/profile-photos', 'public');
        }

        $beneficiary = Beneficiary::create($payload);
        $this->upsertLatestNutritionMeasurements($beneficiary, $payload['height'] ?? $request->input('height_cm'), $payload['weight'] ?? $request->input('weight_kg'), $request->user()?->id);

        if ($this->hasTable('feeding_schedule_beneficiary') && ! empty($payload['feeding_schedule_id'])) {
            $beneficiary->feedingSchedules()->syncWithoutDetaching([$payload['feeding_schedule_id']]);
        }

        return response()->json(['message' => 'Beneficiary created.', 'id' => $beneficiary->id], 201);
    }

    public function updateBeneficiary(Request $request, Beneficiary $beneficiary): JsonResponse
    {
        $request->validate([
            'beneficiary_code' => ['nullable', 'string', 'max:255', Rule::unique('beneficiaries', 'beneficiary_code')->ignore($beneficiary->id)],
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'sex' => ['required', Rule::in(['Male', 'Female'])],
            'birth_date' => ['nullable', 'date'],
            'date_of_birth' => ['nullable', 'date'],
            'height_cm' => ['nullable', 'numeric', 'min:10', 'max:250'],
            'height' => ['nullable', 'numeric', 'min:10', 'max:250'],
            'weight_kg' => ['nullable', 'numeric', 'min:1', 'max:300'],
            'weight' => ['nullable', 'numeric', 'min:1', 'max:300'],
            'guardian_name' => ['required', 'string', 'max:255'],
            'guardian_contact' => ['nullable', 'string', 'max:50'],
            'guardian_contact_number' => ['nullable', 'string', 'max:50'],
            'parent_guardian_contact' => ['nullable', 'string', 'max:50'],
            'address' => ['required', 'string', 'max:2000'],
            'province_code' => ['nullable', 'string', 'max:50'],
            'province_name' => ['nullable', 'string', 'max:255'],
            'city_municipality_code' => ['nullable', 'string', 'max:50'],
            'city_municipality_name' => ['nullable', 'string', 'max:255'],
            'barangay_code' => ['nullable', 'string', 'max:50'],
            'barangay_name' => ['nullable', 'string', 'max:255'],
            'street_address' => ['nullable', 'string', 'max:2000'],
            'purok_id' => ['nullable', 'exists:puroks,id'],
            'purok' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['Active', 'Inactive', 'Completed'])],
            'feeding_schedule_id' => ['nullable', 'exists:feeding_schedules,id'],
            'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png', 'max:2048'],
        ]);

        $payload = $this->beneficiaryPayloadFromRequest($request, $beneficiary);
        $payload['status'] = $payload['status'] ?: $beneficiary->status;
        if ($this->hasColumn('beneficiaries', 'profile_photo') && $request->hasFile('profile_photo')) {
            $oldPath = $beneficiary->profile_photo;
            $payload['profile_photo'] = $request->file('profile_photo')->store('beneficiaries/profile-photos', 'public');

            if ($oldPath && $oldPath !== $payload['profile_photo'] && Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $beneficiary->update($payload);
        $this->upsertLatestNutritionMeasurements($beneficiary, $payload['height'] ?? $request->input('height_cm'), $payload['weight'] ?? $request->input('weight_kg'), $request->user()?->id);

        if ($this->hasTable('feeding_schedule_beneficiary') && ! empty($payload['feeding_schedule_id'])) {
            $beneficiary->feedingSchedules()->syncWithoutDetaching([$payload['feeding_schedule_id']]);
        }

        return response()->json(['message' => 'Beneficiary updated.']);
    }

    public function updateBeneficiaryStatus(Request $request, Beneficiary $beneficiary): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['Active', 'Inactive', 'Completed'])],
        ]);

        $beneficiary->update(['status' => $validated['status']]);

        return response()->json(['message' => 'Beneficiary status updated.']);
    }

    public function deleteBeneficiary(Beneficiary $beneficiary): JsonResponse
    {
        $beneficiary->delete();

        return response()->json(['message' => 'Beneficiary deleted.']);
    }

    private function upsertLatestNutritionMeasurements(Beneficiary $beneficiary, mixed $heightCm, mixed $weightKg, ?int $recordedBy = null): void
    {
        if ($heightCm === null || $weightKg === null) {
            return;
        }

        $latest = NutritionRecord::query()
            ->where('beneficiary_id', $beneficiary->id)
            ->latest('date_recorded')
            ->latest('id')
            ->first();

        $bmi = $this->calculateBmiValue($heightCm, $weightKg);
        $payload = [
            'date_recorded' => $this->manilaNow()->toDateString(),
            'height_cm' => $heightCm,
            'weight_kg' => $weightKg,
            'nutrition_status' => $this->resolveNutritionStatusFromBmi($bmi, $latest?->nutrition_status),
            'remarks' => $latest?->remarks,
        ];
        if ($this->hasColumn('nutrition_records', 'bmi')) {
            $payload['bmi'] = $bmi;
        }
        if ($this->hasColumn('nutrition_records', 'recorded_by')) {
            $payload['recorded_by'] = $recordedBy;
        }

        if ($latest) {
            $latest->update($payload);
            return;
        }

        NutritionRecord::create([
            'beneficiary_id' => $beneficiary->id,
            ...$payload,
        ]);
    }

    public function schedules(Request $request): JsonResponse
    {
        $query = FeedingSchedule::query()->latest('schedule_date');
        $withAssignedCount = $this->hasTable('feeding_schedule_beneficiary');
        if ($withAssignedCount) {
            $query->withCount('beneficiaries');
        }

        if ($request->filled('status') && $request->status !== 'All Status') {
            $query->where('status', $request->status);
        }

        if ($request->filled('date') && $request->date !== 'All Dates') {
            if ($request->date === 'Today') {
                $query->whereDate('schedule_date', now()->toDateString());
            } elseif ($request->date === 'This Week') {
                $query->whereBetween('schedule_date', [now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString()]);
            } elseif ($request->date === 'This Month') {
                $query->whereMonth('schedule_date', now()->month)->whereYear('schedule_date', now()->year);
            }
        }

        if (
            $this->hasColumn('feeding_schedules', 'session_type') &&
            $request->filled('session_type') &&
            $request->session_type !== 'All Session Types'
        ) {
            $query->where('session_type', $request->session_type);
        }

        $schedules = $query->limit(200)->get()->map(function (FeedingSchedule $schedule) use ($withAssignedCount) {
            return [
                'id' => $schedule->id,
                'code' => 'SCH-'.str_pad((string) $schedule->id, 4, '0', STR_PAD_LEFT),
                'title' => $schedule->title,
                'session_type' => $this->hasColumn('feeding_schedules', 'session_type') ? $schedule->session_type : 'Regular',
                'date' => $schedule->schedule_date,
                'start_time' => $schedule->start_time,
                'end_time' => $schedule->end_time,
                'location' => $schedule->location,
                'status' => $schedule->status,
                'description' => $schedule->description,
                'assigned_count' => $withAssignedCount ? ($schedule->beneficiaries_count ?? 0) : 0,
            ];
        })->values();

        return response()->json([
            'data' => $schedules,
            'stats' => [
                'total' => FeedingSchedule::count(),
                'today' => FeedingSchedule::whereDate('schedule_date', now()->toDateString())->count(),
                'completed' => FeedingSchedule::where('status', 'Completed')->count(),
                'upcoming' => FeedingSchedule::where('schedule_date', '>=', now()->toDateString())->count(),
            ],
        ]);
    }

    public function storeSchedule(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'session_type' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'schedule_date' => ['required', 'date'],
            'schedule_days' => ['nullable', 'string', 'max:255'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'location' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string', 'max:1000'],
            'status' => ['nullable', Rule::in(['Scheduled', 'Ongoing', 'Completed', 'Cancelled'])],
        ]);

        $payload = [
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'schedule_date' => $validated['schedule_date'],
            'start_time' => $validated['start_time'] ?? null,
            'end_time' => $validated['end_time'] ?? null,
            'location' => $validated['location'] ?? null,
            'status' => $validated['status'] ?? 'Scheduled',
        ];
        if ($this->hasColumn('feeding_schedules', 'session_type')) {
            $payload['session_type'] = $validated['session_type'] ?? 'Regular';
        }
        if ($this->hasColumn('feeding_schedules', 'schedule_days')) {
            $payload['schedule_days'] = $validated['schedule_days'] ?? null;
        }
        if ($this->hasColumn('feeding_schedules', 'remarks')) {
            $payload['remarks'] = $validated['remarks'] ?? null;
        }
        $schedule = FeedingSchedule::create($payload);

        if ($this->hasTable('feeding_schedule_beneficiary')) {
            $activeBeneficiaryIds = Beneficiary::where('status', 'Active')->pluck('id');
            $schedule->beneficiaries()->sync($activeBeneficiaryIds);
        }

        return response()->json(['message' => 'Schedule created successfully.', 'id' => $schedule->id], 201);
    }

    public function updateScheduleStatus(Request $request, FeedingSchedule $feedingSchedule): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['Scheduled', 'Ongoing', 'Completed', 'Cancelled'])],
        ]);

        $feedingSchedule->update([
            'status' => $validated['status'],
        ]);

        return response()->json(['message' => 'Schedule status updated.']);
    }

    public function scheduleBeneficiaries(FeedingSchedule $feedingSchedule): JsonResponse
    {
        $beneficiaryQuery = $this->hasTable('feeding_schedule_beneficiary')
            ? $feedingSchedule->beneficiaries()->with('purok')->orderBy('first_name')
            : Beneficiary::query()->with('purok')->orderBy('first_name');

        $beneficiaries = $beneficiaryQuery
            ->get(['beneficiaries.id', 'beneficiary_code', 'first_name', 'last_name', 'guardian_name', 'status', 'purok_id'])
            ->map(fn (Beneficiary $b) => [
                'id' => $b->id,
                'code' => $b->beneficiary_code,
                'name' => trim($b->first_name.' '.$b->last_name),
                'guardian' => $b->guardian_name,
                'status' => $b->status,
                'purok' => $b->purok?->purok_name,
            ])->values();

        return response()->json([
            'schedule' => [
                'id' => $feedingSchedule->id,
                'title' => $feedingSchedule->title,
                'session_type' => $feedingSchedule->session_type,
                'schedule_date' => $feedingSchedule->schedule_date,
                'start_time' => $feedingSchedule->start_time,
                'end_time' => $feedingSchedule->end_time,
                'location' => $feedingSchedule->location,
                'status' => $feedingSchedule->status,
            ],
            'beneficiaries' => $beneficiaries,
        ]);
    }

    public function updateScheduleBeneficiaries(Request $request, FeedingSchedule $feedingSchedule): JsonResponse
    {
        if (! $this->hasTable('feeding_schedule_beneficiary')) {
            return response()->json(['message' => 'Schedule-beneficiary assignment table is not available yet.'], 422);
        }

        $validated = $request->validate([
            'beneficiary_ids' => ['required', 'array'],
            'beneficiary_ids.*' => ['integer', 'exists:beneficiaries,id'],
        ]);

        $feedingSchedule->beneficiaries()->sync($validated['beneficiary_ids']);

        return response()->json(['message' => 'Assigned beneficiaries updated.']);
    }

    public function attendances(Request $request): JsonResponse
    {
        $query = Attendance::with(['beneficiary.purok', 'feedingSchedule'])->latest('attendance_date')->latest('id');
        $this->applyAttendanceFilters($query, $request);

        $rows = $query->limit(500)->get()->map(function (Attendance $row) {
            return [
                'id' => $row->id,
                'date' => $row->attendance_date,
                'time_recorded' => $row->attendance_time ?: optional($row->recorded_at)->format('H:i:s'),
                'beneficiary_name' => trim(($row->beneficiary?->first_name ?? '').' '.($row->beneficiary?->last_name ?? '')),
                'beneficiary_code' => $row->beneficiary?->beneficiary_code,
                'feeding_schedule' => $row->feedingSchedule?->title,
                'feeding_schedule_id' => $row->feeding_schedule_id,
                'schedule_time' => trim(($row->feedingSchedule?->start_time ?? '').' - '.($row->feedingSchedule?->end_time ?? '')),
                'purok' => $row->beneficiary?->purok?->purok_name,
                'guardian' => $row->beneficiary?->guardian_name,
                'attendance_status' => $row->attendance_status,
                'remarks' => $row->remarks,
                'meal_received' => (bool) $row->meal_received,
                'beneficiary_id' => $row->beneficiary_id,
            ];
        })->values();

        $statsQuery = Attendance::query();
        $this->applyAttendanceFilters($statsQuery, $request);

        $totalChildren = Beneficiary::count();
        $totalRecords = (clone $statsQuery)->count();
        $present = (clone $statsQuery)->where('attendance_status', 'Present')->count();
        $absent = (clone $statsQuery)->where('attendance_status', 'Absent')->count();
        $late = (clone $statsQuery)->where('attendance_status', 'Late')->count();
        $excused = (clone $statsQuery)->where('attendance_status', 'Excused')->count();
        $notYetMarked = 0;

        if ($request->filled('feeding_schedule_id') && $request->filled('attendance_date')) {
            $schedule = FeedingSchedule::find($request->feeding_schedule_id);
            if ($schedule) {
                $assignedCount = $this->hasTable('feeding_schedule_beneficiary')
                    ? $schedule->beneficiaries()->count()
                    : Beneficiary::count();
                $markedCount = Attendance::where('feeding_schedule_id', $schedule->id)
                    ->whereDate('attendance_date', $request->attendance_date)
                    ->count();
                $notYetMarked = max($assignedCount - $markedCount, 0);
            }
        }

        return response()->json([
            'data' => $rows,
            'stats' => [
                'total_children' => $totalChildren,
                'total_records' => $totalRecords,
                'present' => $present,
                'absent' => $absent,
                'late' => $late,
                'excused' => $excused,
                'not_yet_marked' => $notYetMarked,
            ],
        ]);
    }

    public function attendanceBySchedule(Request $request, FeedingSchedule $feedingSchedule): JsonResponse
    {
        $validated = $request->validate([
            'attendance_date' => ['nullable', 'date'],
            'query' => ['nullable', 'string'],
            'status' => ['nullable', 'string'],
            'beneficiary_status' => ['nullable', 'string'],
        ]);

        $attendanceDate = $validated['attendance_date'] ?? $feedingSchedule->schedule_date;
        $usesAssignedBeneficiaries = $this->hasTable('feeding_schedule_beneficiary')
            && $feedingSchedule->beneficiaries()->exists();
        $beneficiaryQuery = $usesAssignedBeneficiaries
            ? $feedingSchedule->beneficiaries()->with('purok')->orderBy('first_name')
            : Beneficiary::query()->with('purok')->orderBy('first_name');

        if (! empty($validated['beneficiary_status']) && $validated['beneficiary_status'] !== 'All Beneficiaries') {
            $beneficiaryQuery->where('status', $validated['beneficiary_status']);
        }

        if (! empty($validated['query'])) {
            $needle = $this->searchNeedle($validated['query']);
            $beneficiaryQuery->where(function ($builder) use ($needle) {
                $builder
                    ->whereRaw('LOWER(beneficiaries.first_name) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(beneficiaries.middle_name) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(beneficiaries.last_name) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(beneficiaries.beneficiary_code) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(beneficiaries.guardian_name) LIKE ?', [$needle])
                    ->orWhereRaw($this->fullNameLikeExpression('beneficiaries'), [$needle]);
            });
        }

        $beneficiaryColumns = $usesAssignedBeneficiaries
            ? ['beneficiaries.id', 'beneficiary_code', 'first_name', 'last_name', 'guardian_name', 'status', 'purok_id']
            : ['id', 'beneficiary_code', 'first_name', 'last_name', 'guardian_name', 'status', 'purok_id'];
        $beneficiaries = $beneficiaryQuery->get($beneficiaryColumns);
        $attendanceRows = Attendance::where('feeding_schedule_id', $feedingSchedule->id)
            ->whereDate('attendance_date', $attendanceDate)
            ->get()
            ->keyBy('beneficiary_id');

        $historicalStats = Attendance::selectRaw("
                beneficiary_id,
                COUNT(*) as total_records,
                SUM(CASE WHEN attendance_status = 'Absent' THEN 1 ELSE 0 END) as absent_records
            ")
            ->groupBy('beneficiary_id')
            ->get()
            ->keyBy('beneficiary_id');

        $children = $beneficiaries->map(function (Beneficiary $beneficiary) use ($attendanceRows, $historicalStats) {
            $attendance = $attendanceRows->get($beneficiary->id);
            $history = $historicalStats->get($beneficiary->id);
            $total = (int) ($history->total_records ?? 0);
            $absent = (int) ($history->absent_records ?? 0);
            $attendancePercentage = $total > 0 ? round((($total - $absent) / $total) * 100, 1) : 100.0;

            return [
                'beneficiary_id' => $beneficiary->id,
                'beneficiary_code' => $beneficiary->beneficiary_code,
                'first_name' => $beneficiary->first_name,
                'last_name' => $beneficiary->last_name,
                'child_name' => trim($beneficiary->first_name.' '.$beneficiary->last_name),
                'guardian_name' => $beneficiary->guardian_name,
                'barangay_area' => $beneficiary->purok?->purok_name,
                'beneficiary_status' => $beneficiary->status,
                'attendance_id' => $attendance?->id,
                'attendance_status' => $attendance?->attendance_status,
                'remarks' => $attendance?->remarks,
                'time_recorded' => $attendance?->attendance_time ?: optional($attendance?->recorded_at)->format('H:i:s'),
                'not_yet_marked' => $attendance === null,
                'frequently_absent' => $total >= 5 && $attendancePercentage < 70,
                'attendance_percentage' => $attendancePercentage,
            ];
        })->values();

        $summary = [
            'total_beneficiaries_in_schedule' => $children->count(),
            'present' => $children->where('attendance_status', 'Present')->count(),
            'absent' => $children->where('attendance_status', 'Absent')->count(),
            'late' => $children->where('attendance_status', 'Late')->count(),
            'excused' => $children->where('attendance_status', 'Excused')->count(),
            'not_yet_marked' => $children->where('not_yet_marked', true)->count(),
        ];

        if (! empty($validated['status']) && $validated['status'] !== 'All Status') {
            $children = $children->filter(function (array $row) use ($validated) {
                if ($validated['status'] === 'Not Yet Marked') {
                    return $row['not_yet_marked'] === true;
                }

                return $row['attendance_status'] === $validated['status'];
            })->values();
        }

        return response()->json([
            'schedule' => [
                'id' => $feedingSchedule->id,
                'title' => $feedingSchedule->title,
                'session_type' => $feedingSchedule->session_type,
                'schedule_date' => $feedingSchedule->schedule_date,
                'start_time' => $feedingSchedule->start_time,
                'end_time' => $feedingSchedule->end_time,
                'location' => $feedingSchedule->location,
                'status' => $feedingSchedule->status,
            ],
            'attendance_date' => $attendanceDate,
            'manila_now' => $this->manilaNow()->format('Y-m-d H:i:s'),
            'summary' => $summary,
            'children' => $children,
        ]);
    }

    public function storeAttendance(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'beneficiary_id' => ['required', 'exists:beneficiaries,id'],
            'feeding_schedule_id' => ['required', 'exists:feeding_schedules,id'],
            'attendance_date' => ['nullable', 'date'],
            'attendance_status' => ['required', Rule::in(['Present', 'Absent', 'Late', 'Excused'])],
            'meal_received' => ['nullable', 'boolean'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $attendanceDate = isset($validated['attendance_date'])
            ? Carbon::parse($validated['attendance_date'], 'Asia/Manila')->toDateString()
            : $this->manilaNow()->toDateString();

        $exists = Attendance::where('beneficiary_id', $validated['beneficiary_id'])
            ->where('feeding_schedule_id', $validated['feeding_schedule_id'])
            ->whereDate('attendance_date', $attendanceDate)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'attendance_date' => ['Attendance has already been recorded for this student today for this schedule.'],
            ]);
        }

        $payload = [
            'beneficiary_id' => $validated['beneficiary_id'],
            'feeding_schedule_id' => $validated['feeding_schedule_id'],
            'attendance_date' => $attendanceDate,
            'attendance_status' => $validated['attendance_status'],
            'meal_received' => $validated['meal_received'] ?? false,
            'remarks' => $validated['remarks'] ?? null,
        ];

        if ($this->hasColumn('attendances', 'attendance_time')) {
            $payload['attendance_time'] = $this->manilaNow()->format('H:i:s');
        }
        if ($this->hasColumn('attendances', 'recorded_at')) {
            $payload['recorded_at'] = $this->manilaNow();
        }
        if ($this->hasColumn('attendances', 'recorded_by')) {
            $payload['recorded_by'] = $request->user()?->id;
        }

        $attendance = Attendance::create($payload);

        return response()->json(['message' => 'Attendance saved successfully.', 'id' => $attendance->id], 201);
    }

    public function updateAttendance(Request $request, Attendance $attendance): JsonResponse
    {
        $validated = $request->validate([
            'beneficiary_id' => ['sometimes', 'required', 'exists:beneficiaries,id'],
            'feeding_schedule_id' => ['sometimes', 'required', 'exists:feeding_schedules,id'],
            'attendance_date' => ['sometimes', 'required', 'date'],
            'attendance_status' => ['required', Rule::in(['Present', 'Absent', 'Late', 'Excused'])],
            'meal_received' => ['nullable', 'boolean'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $nextBeneficiaryId = $validated['beneficiary_id'] ?? $attendance->beneficiary_id;
        $nextScheduleId = $validated['feeding_schedule_id'] ?? $attendance->feeding_schedule_id;
        $nextDate = $validated['attendance_date'] ?? $attendance->attendance_date;
        $conflict = Attendance::where('beneficiary_id', $nextBeneficiaryId)
            ->where('feeding_schedule_id', $nextScheduleId)
            ->whereDate('attendance_date', $nextDate)
            ->where('id', '!=', $attendance->id)
            ->exists();

        if ($conflict) {
            throw ValidationException::withMessages([
                'attendance_date' => ['Another attendance record already exists for this child, schedule, and date.'],
            ]);
        }

        $payload = [
            'beneficiary_id' => $nextBeneficiaryId,
            'feeding_schedule_id' => $nextScheduleId,
            'attendance_date' => $nextDate,
            'attendance_status' => $validated['attendance_status'],
            'meal_received' => $validated['meal_received'] ?? $attendance->meal_received,
            'remarks' => $validated['remarks'] ?? $attendance->remarks,
        ];

        if ($this->hasColumn('attendances', 'attendance_time')) {
            $payload['attendance_time'] = $this->manilaNow()->format('H:i:s');
        }
        if ($this->hasColumn('attendances', 'recorded_at')) {
            $payload['recorded_at'] = $this->manilaNow();
        }
        if ($this->hasColumn('attendances', 'recorded_by')) {
            $payload['recorded_by'] = $request->user()?->id ?? $attendance->recorded_by;
        }

        $attendance->update($payload);

        return response()->json(['message' => 'Attendance updated.']);
    }

    public function storeBulkAttendance(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'feeding_schedule_id' => ['required', 'exists:feeding_schedules,id'],
            'attendance_date' => ['required', 'date'],
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.beneficiary_id' => ['required', 'exists:beneficiaries,id'],
            'rows.*.attendance_status' => ['required', Rule::in(['Present', 'Absent', 'Late', 'Excused'])],
            'rows.*.remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $manilaNow = $this->manilaNow();
        $saved = 0;
        $updated = 0;

        foreach ($validated['rows'] as $row) {
            $existing = Attendance::where('beneficiary_id', $row['beneficiary_id'])
                ->where('feeding_schedule_id', $validated['feeding_schedule_id'])
                ->whereDate('attendance_date', $validated['attendance_date'])
                ->first();

            if ($existing) {
                $payload = [
                    'attendance_status' => $row['attendance_status'],
                    'remarks' => $row['remarks'] ?? null,
                    'meal_received' => in_array($row['attendance_status'], ['Present', 'Late'], true),
                ];
                if ($this->hasColumn('attendances', 'attendance_time')) {
                    $payload['attendance_time'] = $manilaNow->format('H:i:s');
                }
                if ($this->hasColumn('attendances', 'recorded_at')) {
                    $payload['recorded_at'] = $manilaNow;
                }
                if ($this->hasColumn('attendances', 'recorded_by')) {
                    $payload['recorded_by'] = $request->user()?->id;
                }
                $existing->update($payload);
                $updated++;
            } else {
                $payload = [
                    'beneficiary_id' => $row['beneficiary_id'],
                    'feeding_schedule_id' => $validated['feeding_schedule_id'],
                    'attendance_date' => $validated['attendance_date'],
                    'attendance_status' => $row['attendance_status'],
                    'meal_received' => in_array($row['attendance_status'], ['Present', 'Late'], true),
                    'remarks' => $row['remarks'] ?? null,
                ];
                if ($this->hasColumn('attendances', 'attendance_time')) {
                    $payload['attendance_time'] = $manilaNow->format('H:i:s');
                }
                if ($this->hasColumn('attendances', 'recorded_at')) {
                    $payload['recorded_at'] = $manilaNow;
                }
                if ($this->hasColumn('attendances', 'recorded_by')) {
                    $payload['recorded_by'] = $request->user()?->id;
                }
                Attendance::create($payload);
                $saved++;
            }
        }

        return response()->json([
            'message' => 'Attendance batch saved.',
            'saved' => $saved,
            'updated' => $updated,
        ]);
    }

    public function destroyAttendance(Attendance $attendance): JsonResponse
    {
        $attendance->delete();

        return response()->json(['message' => 'Attendance deleted.']);
    }

    public function attendanceHistory(Beneficiary $beneficiary): JsonResponse
    {
        $history = Attendance::with(['feedingSchedule', 'recorder'])
            ->where('beneficiary_id', $beneficiary->id)
            ->orderByDesc('attendance_date')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(fn (Attendance $row) => [
                'id' => $row->id,
                'full_name' => trim($beneficiary->first_name.' '.$beneficiary->last_name),
                'date' => $row->attendance_date,
                'time_in' => $row->attendance_time ?: optional($row->recorded_at)->timezone('Asia/Manila')->format('H:i:s'),
                'feeding_schedule' => $row->feedingSchedule?->title,
                'attendance_status' => $row->attendance_status,
                'remarks' => $row->remarks,
                'recorded_by' => $row->recorder?->name,
            ])
            ->values();

        return response()->json([
            'beneficiary' => [
                'id' => $beneficiary->id,
                'code' => $beneficiary->beneficiary_code,
                'name' => trim($beneficiary->first_name.' '.$beneficiary->last_name),
            ],
            'data' => $history,
        ]);
    }

    public function attendanceReports(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period' => ['required', Rule::in(['daily', 'weekly', 'monthly'])],
            'reference_date' => ['nullable', 'date'],
            'feeding_schedule_id' => ['nullable', 'exists:feeding_schedules,id'],
            'session_type' => ['nullable', 'string'],
            'purok' => ['nullable', 'string'],
        ]);

        $reference = isset($validated['reference_date'])
            ? Carbon::parse($validated['reference_date'])
            : now();

        $period = $validated['period'];

        $query = Attendance::with(['beneficiary.purok', 'feedingSchedule']);

        if ($period === 'daily') {
            $query->whereDate('attendance_date', $reference->toDateString());
        } elseif ($period === 'weekly') {
            $query->whereBetween('attendance_date', [
                $reference->copy()->startOfWeek()->toDateString(),
                $reference->copy()->endOfWeek()->toDateString(),
            ]);
        } else {
            $query->whereYear('attendance_date', $reference->year)
                ->whereMonth('attendance_date', $reference->month);
        }

        if (! empty($validated['feeding_schedule_id'])) {
            $query->where('feeding_schedule_id', $validated['feeding_schedule_id']);
        }

        if (
            $this->hasColumn('feeding_schedules', 'session_type') &&
            ! empty($validated['session_type']) &&
            $validated['session_type'] !== 'All Session Types'
        ) {
            $query->whereHas('feedingSchedule', function ($builder) use ($validated) {
                $builder->where('session_type', $validated['session_type']);
            });
        }

        if (! empty($validated['purok']) && $validated['purok'] !== 'All Puroks') {
            $query->whereHas('beneficiary.purok', function ($builder) use ($validated) {
                $builder->where('purok_name', $validated['purok']);
            });
        }

        $rows = $query->orderByDesc('attendance_date')->limit(1000)->get();

        $summary = [
            'total_records' => $rows->count(),
            'present' => $rows->where('attendance_status', 'Present')->count(),
            'absent' => $rows->where('attendance_status', 'Absent')->count(),
            'late' => $rows->where('attendance_status', 'Late')->count(),
            'excused' => $rows->where('attendance_status', 'Excused')->count(),
        ];

        return response()->json([
            'period' => $period,
            'reference_date' => $reference->toDateString(),
            'summary' => $summary,
            'data' => $rows->map(fn (Attendance $row) => [
                'id' => $row->id,
                'date' => $row->attendance_date,
                'time_recorded' => $row->attendance_time ?: optional($row->recorded_at)->format('H:i:s'),
                'beneficiary_name' => trim(($row->beneficiary?->first_name ?? '').' '.($row->beneficiary?->last_name ?? '')),
                'beneficiary_code' => $row->beneficiary?->beneficiary_code,
                'feeding_schedule' => $row->feedingSchedule?->title,
                'schedule_time' => trim(($row->feedingSchedule?->start_time ?? '').' - '.($row->feedingSchedule?->end_time ?? '')),
                'session_type' => $row->feedingSchedule?->session_type,
                'purok' => $row->beneficiary?->purok?->purok_name,
                'attendance_status' => $row->attendance_status,
                'remarks' => $row->remarks,
            ])->values(),
        ]);
    }

    public function generateAttendanceReportFile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period' => ['required', Rule::in(['daily', 'weekly', 'monthly', 'schedule'])],
            'reference_date' => ['nullable', 'date'],
            'feeding_schedule_id' => ['nullable', 'exists:feeding_schedules,id'],
            'purok' => ['nullable', 'string'],
            'session_type' => ['nullable', 'string'],
        ]);

        $reference = isset($validated['reference_date'])
            ? Carbon::parse($validated['reference_date'], 'Asia/Manila')
            : $this->manilaNow();

        $periodType = $validated['period'];
        $dateFrom = $reference->copy()->toDateString();
        $dateTo = $reference->copy()->toDateString();

        if ($periodType === 'weekly') {
            $dateFrom = $reference->copy()->startOfWeek()->toDateString();
            $dateTo = $reference->copy()->endOfWeek()->toDateString();
        } elseif ($periodType === 'monthly') {
            $dateFrom = $reference->copy()->startOfMonth()->toDateString();
            $dateTo = $reference->copy()->endOfMonth()->toDateString();
        }

        $query = Attendance::with(['beneficiary.purok', 'feedingSchedule'])
            ->whereBetween('attendance_date', [$dateFrom, $dateTo]);

        if (! empty($validated['feeding_schedule_id'])) {
            $query->where('feeding_schedule_id', $validated['feeding_schedule_id']);
        }

        if (! empty($validated['purok']) && $validated['purok'] !== 'All Puroks') {
            $query->whereHas('beneficiary.purok', function ($builder) use ($validated) {
                $builder->where('purok_name', $validated['purok']);
            });
        }

        if (
            $this->hasColumn('feeding_schedules', 'session_type') &&
            ! empty($validated['session_type']) &&
            $validated['session_type'] !== 'All Session Types'
        ) {
            $query->whereHas('feedingSchedule', function ($builder) use ($validated) {
                $builder->where('session_type', $validated['session_type']);
            });
        }

        $query->orderBy('attendance_date');
        if ($this->hasColumn('attendances', 'attendance_time')) {
            $query->orderBy('attendance_time');
        }
        $rows = $query->get();
        $summary = [
            'total_records' => $rows->count(),
            'present' => $rows->where('attendance_status', 'Present')->count(),
            'absent' => $rows->where('attendance_status', 'Absent')->count(),
            'late' => $rows->where('attendance_status', 'Late')->count(),
            'excused' => $rows->where('attendance_status', 'Excused')->count(),
        ];
        $folder = match ($periodType) {
            'daily' => 'reports/attendance-reports/daily-reports',
            'weekly' => 'reports/attendance-reports/weekly-reports',
            'monthly' => 'reports/attendance-reports/monthly-reports',
            default => 'reports/attendance-reports/schedule-reports',
        };

        $label = $periodType === 'monthly'
            ? strtolower($reference->format('F-Y'))
            : $reference->toDateString();

        $scheduleSlug = null;
        if (! empty($validated['feeding_schedule_id'])) {
            $scheduleSlug = Str::slug(optional(FeedingSchedule::find($validated['feeding_schedule_id']))->title ?? '');
        }

        $fileName = $scheduleSlug
            ? "attendance-{$periodType}-{$scheduleSlug}-{$label}.csv"
            : "attendance-{$periodType}-{$label}.csv";
        $filePath = $folder.'/'.$fileName;
        $csv = $this->buildAttendanceCsv($rows);

        Storage::disk('public')->put($filePath, $csv);

        $reportId = null;
        if ($this->hasTable('attendance_reports')) {
            $report = AttendanceReport::create([
                'report_type' => $periodType,
                'feeding_schedule_id' => $validated['feeding_schedule_id'] ?? null,
                'report_date' => $reference->toDateString(),
                'period_start' => $dateFrom,
                'period_end' => $dateTo,
                'file_name' => $fileName,
                'file_path' => $filePath,
                'file_type' => 'csv',
                'generated_by' => $request->user()?->id,
                'meta' => [
                    'purok' => $validated['purok'] ?? null,
                    'session_type' => $validated['session_type'] ?? null,
                    'rows' => $rows->count(),
                    'summary' => $summary,
                    'preview_rows' => $rows->map(fn (Attendance $row) => [
                        'id' => $row->id,
                        'date' => optional($row->attendance_date)->format('Y-m-d'),
                        'time_recorded' => $row->attendance_time ?: optional($row->recorded_at)->format('H:i:s'),
                        'beneficiary_code' => $row->beneficiary?->beneficiary_code,
                        'beneficiary_name' => trim(($row->beneficiary?->first_name ?? '').' '.($row->beneficiary?->last_name ?? '')),
                        'feeding_schedule' => $row->feedingSchedule?->title,
                        'attendance_status' => $row->attendance_status,
                        'remarks' => $row->remarks,
                    ])->values()->all(),
                    'generated_at_manila' => $this->manilaNow()->format('Y-m-d H:i:s'),
                ],
            ]);
            $reportId = $report->id;
        } elseif ($this->hasTable('reports_log')) {
            $previewRows = $rows->map(fn (Attendance $row) => [
                'id' => $row->id,
                'date' => optional($row->attendance_date)->format('Y-m-d'),
                'time_recorded' => $row->attendance_time ?: optional($row->recorded_at)->format('H:i:s'),
                'beneficiary_code' => $row->beneficiary?->beneficiary_code,
                'beneficiary_name' => trim(($row->beneficiary?->first_name ?? '').' '.($row->beneficiary?->last_name ?? '')),
                'feeding_schedule' => $row->feedingSchedule?->title,
                'attendance_status' => $row->attendance_status,
                'remarks' => $row->remarks,
            ])->values()->all();

            $reportId = DB::table('reports_log')->insertGetId([
                'report_type' => 'Attendance',
                'generated_by' => $request->user()?->id,
                'date_generated' => $this->manilaNow(),
                'parameters' => json_encode([
                    'title' => 'Attendance '.ucfirst($periodType).' Report',
                    'period' => "{$dateFrom} to {$dateTo}",
                    'file_name' => $fileName,
                    'file_path' => $filePath,
                    'summary' => $summary,
                    'feeding_schedule_id' => $validated['feeding_schedule_id'] ?? null,
                    'preview_rows' => $previewRows,
                ], JSON_THROW_ON_ERROR),
                'created_at' => $this->manilaNow(),
                'updated_at' => $this->manilaNow(),
            ]);
        }

        return response()->json([
            'message' => 'Attendance report generated and saved.',
            'report' => [
                'id' => $reportId,
                'file_name' => $fileName,
                'file_path' => $filePath,
                'download_url' => asset('storage/'.$filePath),
            ],
        ], 201);
    }

    public function attendanceReportFiles(Request $request): JsonResponse
    {
        $rows = collect();

        if ($this->hasTable('attendance_reports')) {
            $query = AttendanceReport::with(['schedule', 'generator'])->latest();

            if ($request->filled('period') && $request->period !== 'All') {
                $query->where('report_type', $request->period);
            }

            $rows = $query->limit(300)->get()->map(function (AttendanceReport $report) {
                $previewRows = collect(data_get($report->meta, 'preview_rows', []))
                    ->filter(fn ($row) => filled(data_get($row, 'beneficiary_name')))
                    ->sortBy(fn ($row) => Str::lower((string) data_get($row, 'beneficiary_name')))
                    ->values()
                    ->all();

                if (empty($previewRows)) {
                    $previewRows = $this->resolveSortedAttendancePreviewRows(
                        optional($report->report_date)->toDateString(),
                        $report->feeding_schedule_id
                    );
                }

                return [
                    'id' => $report->id,
                    'report_type' => ucfirst($report->report_type),
                    'report_date' => $report->report_date,
                    'feeding_schedule_id' => $report->feeding_schedule_id,
                    'period_start' => $report->period_start,
                    'period_end' => $report->period_end,
                    'schedule' => $report->schedule?->title,
                    'file_name' => $report->file_name,
                    'file_type' => strtoupper($report->file_type),
                    'download_url' => asset('storage/'.$report->file_path),
                    'summary' => [
                        'total_records' => data_get($report->meta, 'summary.total_records', 0),
                        'present' => data_get($report->meta, 'summary.present', 0),
                        'absent' => data_get($report->meta, 'summary.absent', 0),
                        'late' => data_get($report->meta, 'summary.late', 0),
                        'excused' => data_get($report->meta, 'summary.excused', 0),
                    ],
                    'preview_rows' => $previewRows,
                    'generated_by' => $report->generator?->name,
                    'generated_at' => optional($report->created_at)->timezone('Asia/Manila')->format('Y-m-d H:i:s'),
                ];
            });
        }

        if ($this->hasTable('reports_log')) {
            $legacyRows = DB::table('reports_log')
                ->where('report_type', 'Attendance')
                ->orderByDesc('date_generated')
                ->limit(300)
                ->get()
                ->map(function ($row) {
                    $params = json_decode($row->parameters ?? '{}', true) ?: [];
                    $filePath = $params['file_path'] ?? null;

                    if (! $filePath) {
                        return null;
                    }

                    $reportDate = data_get($params, 'period')
                        ? explode(' to ', (string) data_get($params, 'period'))[0]
                        : null;

                    $previewRows = collect(data_get($params, 'preview_rows', []))
                        ->filter(fn ($previewRow) => filled(data_get($previewRow, 'beneficiary_name')))
                        ->sortBy(fn ($previewRow) => Str::lower((string) data_get($previewRow, 'beneficiary_name')))
                        ->values()
                        ->all();

                    if (empty($previewRows)) {
                        $previewRows = $this->resolveSortedAttendancePreviewRows(
                            $reportDate,
                            data_get($params, 'feeding_schedule_id')
                        );
                    }

                    return [
                        'id' => 'LOG-'.$row->id,
                        'report_type' => 'Attendance',
                        'report_date' => $reportDate,
                        'feeding_schedule_id' => data_get($params, 'feeding_schedule_id'),
                        'period_start' => $reportDate,
                        'period_end' => data_get($params, 'period') ? (explode(' to ', (string) data_get($params, 'period'))[1] ?? null) : null,
                        'schedule' => null,
                        'file_name' => $params['file_name'] ?? 'attendance-report.csv',
                        'file_type' => 'CSV',
                        'download_url' => asset('storage/'.$filePath),
                        'summary' => [
                            'total_records' => data_get($params, 'summary.total_records', 0),
                            'present' => data_get($params, 'summary.present', 0),
                            'absent' => data_get($params, 'summary.absent', 0),
                            'late' => data_get($params, 'summary.late', 0),
                            'excused' => data_get($params, 'summary.excused', 0),
                        ],
                        'preview_rows' => $previewRows,
                        'generated_by' => null,
                        'generated_at' => Carbon::parse($row->date_generated)->timezone('Asia/Manila')->format('Y-m-d H:i:s'),
                    ];
                })
                ->filter()
                ->values();

            $rows = $rows->concat($legacyRows);
        }

        $rows = $rows
            ->sortByDesc('generated_at')
            ->values();

        return response()->json(['data' => $rows]);
    }

    public function attendancePrint(Request $request): View
    {
        $validated = $request->validate([
            'feeding_schedule_id' => ['required', 'exists:feeding_schedules,id'],
            'attendance_date' => ['required', 'date'],
        ]);

        $schedule = FeedingSchedule::findOrFail($validated['feeding_schedule_id']);
        $query = Attendance::with(['beneficiary.purok'])
            ->where('feeding_schedule_id', $schedule->id)
            ->whereDate('attendance_date', $validated['attendance_date']);
        if ($this->hasColumn('attendances', 'attendance_time')) {
            $query->orderBy('attendance_time');
        }
        $rows = $query->get();

        return view('attendance.print', [
            'schedule' => $schedule,
            'attendanceDate' => $validated['attendance_date'],
            'rows' => $rows,
        ]);
    }

    private function buildAttendanceCsv($rows): string
    {
        $lines = [];
        $lines[] = [
            'Date',
            'Time Recorded',
            'Beneficiary ID',
            'Child Name',
            'Guardian Name',
            'Barangay/Area',
            'Feeding Schedule',
            'Schedule Time',
            'Attendance Status',
            'Remarks',
        ];

        foreach ($rows as $row) {
            $lines[] = [
                $row->attendance_date,
                $row->attendance_time ?: optional($row->recorded_at)->format('H:i:s'),
                $row->beneficiary?->beneficiary_code,
                trim(($row->beneficiary?->first_name ?? '').' '.($row->beneficiary?->last_name ?? '')),
                $row->beneficiary?->guardian_name,
                $row->beneficiary?->purok?->purok_name,
                $row->feedingSchedule?->title,
                trim(($row->feedingSchedule?->start_time ?? '').' - '.($row->feedingSchedule?->end_time ?? '')),
                $row->attendance_status,
                $row->remarks,
            ];
        }

        $stream = fopen('php://temp', 'w+');
        foreach ($lines as $line) {
            fputcsv($stream, $line);
        }
        rewind($stream);
        $content = stream_get_contents($stream) ?: '';
        fclose($stream);

        return $content;
    }

    private function applyAttendanceFilters($query, Request $request): void
    {
        if ($request->filled('status') && $request->status !== 'All Status') {
            $query->where('attendance_status', $request->status);
        }

        if ($request->filled('feeding_schedule_id')) {
            $query->where('feeding_schedule_id', $request->feeding_schedule_id);
        }

        if (
            $this->hasColumn('feeding_schedules', 'session_type') &&
            $request->filled('session_type') &&
            $request->session_type !== 'All Session Types'
        ) {
            $query->whereHas('feedingSchedule', function ($builder) use ($request) {
                $builder->where('session_type', $request->session_type);
            });
        }

        if ($request->filled('attendance_date')) {
            $query->whereDate('attendance_date', $request->attendance_date);
        } elseif ($request->filled('date') && $request->date !== 'All Dates') {
            if ($request->date === 'Today') {
                $query->whereDate('attendance_date', now()->toDateString());
            } elseif ($request->date === 'This Week') {
                $query->whereBetween('attendance_date', [now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString()]);
            } elseif ($request->date === 'This Month') {
                $query->whereMonth('attendance_date', now()->month)->whereYear('attendance_date', now()->year);
            }
        }

        if ($request->filled('purok') && $request->purok !== 'All Puroks') {
            $query->whereHas('beneficiary.purok', function ($builder) use ($request) {
                $builder->where('purok_name', $request->purok);
            });
        }

        if ($request->filled('beneficiary_status') && $request->beneficiary_status !== 'All Beneficiaries') {
            $query->whereHas('beneficiary', function ($builder) use ($request) {
                $builder->where('status', $request->beneficiary_status);
            });
        }

        if ($request->filled('query')) {
            $needle = $this->searchNeedle($request->input('query'));
            $query->whereHas('beneficiary', function ($builder) use ($needle) {
                $builder
                    ->whereRaw('LOWER(beneficiary_code) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(guardian_name) LIKE ?', [$needle])
                    ->orWhereRaw($this->fullNameLikeExpression(), [$needle]);
            });
        }
    }

    public function nutritionRecords(Request $request): JsonResponse
    {
        $query = NutritionRecord::with(['beneficiary.purok'])->latest('date_recorded');

        if ($request->filled('purok') && $request->purok !== 'All Puroks') {
            $query->whereHas('beneficiary.purok', function ($builder) use ($request) {
                $builder->where('purok_name', $request->purok);
            });
        }

        if ($request->filled('query')) {
            $query->whereHas('beneficiary', function ($beneficiaryQuery) use ($request) {
                $this->whereBeneficiaryNameContains($beneficiaryQuery, $request->input('query'));
            });
        }

        $records = $query->limit(300)->get()->map(function (NutritionRecord $record) {
            $bmi = $this->calculateBmiValue($record->height_cm, $record->weight_kg);
            $status = $this->resolveNutritionStatusFromBmi($bmi, $record->nutrition_status);

            return [
                'id' => $record->id,
                'beneficiary_id' => $record->beneficiary_id,
                'code' => $record->beneficiary?->beneficiary_code,
                'name' => trim(collect([
                    $record->beneficiary?->first_name,
                    $record->beneficiary?->middle_name,
                    $record->beneficiary?->last_name,
                ])->filter()->implode(' ')),
                'purok' => $record->beneficiary?->purok?->purok_name,
                'bmi' => $bmi,
                'status' => $status,
                'nutrition_status' => $status,
                'date_recorded' => $record->date_recorded,
                'last_check' => $record->date_recorded,
                'remarks' => $record->remarks,
                'recommendation' => $record->remarks ?: 'No remarks',
                'height_cm' => (float) $record->height_cm,
                'weight_kg' => (float) $record->weight_kg,
            ];
        });

        if ($request->filled('status') && $request->status !== 'All Status') {
            $records = $records->filter(fn (array $row) => $row['status'] === $request->status);
        }

        $records = $records->values();

        $allStatusRows = NutritionRecord::query()
            ->get(['height_cm', 'weight_kg', 'nutrition_status'])
            ->map(function (NutritionRecord $record) {
                $bmi = $this->calculateBmiValue($record->height_cm, $record->weight_kg);
                return $this->resolveNutritionStatusFromBmi($bmi, $record->nutrition_status);
            });

        return response()->json([
            'data' => $records,
            'stats' => [
                'total' => NutritionRecord::count(),
                'normal' => $allStatusRows->filter(fn (string $status) => $status === 'Normal')->count(),
                'underweight' => $allStatusRows->filter(fn (string $status) => $status === 'Underweight')->count(),
                'overweight' => $allStatusRows->filter(fn (string $status) => $status === 'Overweight')->count(),
                'severely_underweight' => $allStatusRows->filter(fn (string $status) => $status === 'Severely Underweight')->count(),
                'at_risk' => $allStatusRows->filter(fn (string $status) => in_array($status, ['Underweight', 'Severely Underweight'], true))->count(),
            ],
        ]);
    }

    public function storeNutritionRecord(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'beneficiary_id' => ['required', 'exists:beneficiaries,id'],
            'date_recorded' => ['required', 'date'],
            'height_cm' => ['required', 'numeric', 'min:10', 'max:250'],
            'weight_kg' => ['required', 'numeric', 'min:1', 'max:300'],
            'nutrition_status' => ['nullable', 'string', 'max:100'],
            'remarks' => ['nullable', 'string'],
        ]);

        $bmi = $this->calculateBmiValue($validated['height_cm'], $validated['weight_kg']);
        $validated['nutrition_status'] = $this->resolveNutritionStatusFromBmi($bmi, $validated['nutrition_status'] ?? null);
        if ($this->hasColumn('nutrition_records', 'bmi')) {
            $validated['bmi'] = $bmi;
        }
        if ($this->hasColumn('nutrition_records', 'recorded_by')) {
            $validated['recorded_by'] = $request->user()?->id;
        }

        $record = NutritionRecord::create($validated);

        return response()->json(['message' => 'Nutrition record saved.', 'id' => $record->id], 201);
    }

    public function updateNutritionRecord(Request $request, NutritionRecord $nutritionRecord): JsonResponse
    {
        $validated = $request->validate([
            'date_recorded' => ['required', 'date'],
            'height_cm' => ['required', 'numeric', 'min:10', 'max:250'],
            'weight_kg' => ['required', 'numeric', 'min:1', 'max:300'],
            'nutrition_status' => ['nullable', 'string', 'max:100'],
            'remarks' => ['nullable', 'string'],
        ]);

        $bmi = $this->calculateBmiValue($validated['height_cm'], $validated['weight_kg']);
        $validated['nutrition_status'] = $this->resolveNutritionStatusFromBmi($bmi, $validated['nutrition_status'] ?? null);

        if ($this->hasColumn('nutrition_records', 'bmi')) {
            $validated['bmi'] = $bmi;
        }
        if ($this->hasColumn('nutrition_records', 'recorded_by')) {
            $validated['recorded_by'] = $request->user()?->id ?? $nutritionRecord->recorded_by;
        }

        $nutritionRecord->update($validated);

        return response()->json(['message' => 'Nutrition record updated.']);
    }

    public function reports(): JsonResponse
    {
        $rows = DB::table('reports_log')
            ->orderByDesc('date_generated')
            ->limit(200)
            ->get()
            ->map(function ($row) {
                $params = json_decode($row->parameters ?? '{}', true) ?: [];

                return [
                    'id' => 'GEN-'.$row->id,
                    'title' => $params['title'] ?? ($row->report_type.' Report'),
                    'type' => $row->report_type,
                    'period' => $params['period'] ?? 'N/A',
                    'generated_at' => $row->date_generated,
                    'status' => 'Ready',
                ];
            })
            ->values();

        $attendanceRows = collect();
        if ($this->hasTable('attendance_reports')) {
            $attendanceRows = AttendanceReport::query()
                ->latest()
                ->limit(200)
                ->get()
                ->map(function (AttendanceReport $row) {
                    $summary = data_get($row->meta, 'summary', []);

                    return [
                        'id' => 'ATT-'.$row->id,
                        'title' => 'Attendance '.ucfirst($row->report_type).' Report',
                        'type' => 'Attendance',
                        'period' => (($row->period_start ?? $row->report_date)?->format('Y-m-d') ?? 'N/A').' to '.(($row->period_end ?? $row->report_date)?->format('Y-m-d') ?? 'N/A'),
                        'generated_at' => optional($row->created_at)->timezone('Asia/Manila')->format('Y-m-d H:i:s'),
                        'file_name' => $row->file_name,
                        'download_url' => asset('storage/'.$row->file_path),
                        'summary' => [
                            'present' => $summary['present'] ?? 0,
                            'absent' => $summary['absent'] ?? 0,
                            'late' => $summary['late'] ?? 0,
                            'excused' => $summary['excused'] ?? 0,
                        ],
                        'status' => 'Ready',
                    ];
                });
        }

        return response()->json(['data' => $rows->concat($attendanceRows)->sortByDesc('generated_at')->values()]);
    }

    public function generateReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'report_type' => ['required', 'string', 'max:100'],
            'title' => ['required', 'string', 'max:255'],
            'period' => ['required', 'string', 'max:50'],
        ]);

        $id = DB::table('reports_log')->insertGetId([
            'report_type' => $validated['report_type'],
            'generated_by' => $request->user()->id,
            'date_generated' => now(),
            'parameters' => json_encode([
                'title' => $validated['title'],
                'period' => $validated['period'],
            ], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Report generated.',
            'id' => $id,
        ], 201);
    }

    public function users(Request $request): JsonResponse
    {
        $query = User::query()->latest();

        if ($request->filled('role') && $request->role !== 'All Roles') {
            $query->whereRaw('LOWER(role) = ?', [$this->normalizeUserRole($request->role)]);
        }

        if ($request->filled('status') && $request->status !== 'All Status') {
            $query->whereRaw('LOWER(status) = ?', [$this->normalizeUserStatus($request->status)]);
        }

        if ($request->filled('query')) {
            $needle = $this->searchNeedle($request->input('query'));
            $query->where(function ($builder) use ($needle) {
                $builder
                    ->whereRaw('LOWER(name) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$needle])
                    ->when($this->hasColumn('users', 'username'), function ($userQuery) use ($needle) {
                        $userQuery->orWhereRaw('LOWER(username) LIKE ?', [$needle]);
                    });
            });
        }

        $users = $query->limit(250)->get()->map(function (User $user) {
            return [
                'id' => $user->id,
                'code' => 'USR-'.str_pad((string) $user->id, 3, '0', STR_PAD_LEFT),
                'name' => $user->name,
                'email' => $this->displayUserEmail($user),
                'username' => $this->hasColumn('users', 'username') ? $user->username : null,
                'role' => $this->normalizeUserRole($user->role),
                'display_role' => $this->displayUserRole($user->role),
                'status' => $this->normalizeUserStatus($user->status),
                'display_status' => $this->displayUserStatus($user->status),
                'profile_photo_url' => $this->resolveUserProfilePhotoUrl($user->profile_photo_path),
            ];
        })->values();

        return response()->json([
            'data' => $users,
            'current_user_id' => $request->user()?->id,
            'auth_user' => $this->authenticatedUserPayload($request->user()),
        ]);
    }

    public function storeUser(Request $request): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json(['message' => 'Access denied. Admin only.'], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email_or_username' => ['required', 'string', 'max:255'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $identifier = Str::of($validated['email_or_username'])->trim()->lower()->toString();
        $isEmail = filter_var($identifier, FILTER_VALIDATE_EMAIL) !== false;

        if (! $isEmail && ! $this->hasColumn('users', 'username')) {
            throw ValidationException::withMessages([
                'email_or_username' => 'Enter a valid email address for this staff account.',
            ]);
        }

        if (! $isEmail && ! preg_match('/^[a-z0-9._-]{3,50}$/', $identifier)) {
            throw ValidationException::withMessages([
                'email_or_username' => 'Username must be 3 to 50 characters and may only use letters, numbers, dots, underscores, or hyphens.',
            ]);
        }

        $duplicate = User::query()
            ->whereRaw('LOWER(email) = ?', [$identifier])
            ->when(! $isEmail, function ($query) use ($identifier) {
                $query->orWhereRaw('LOWER(email) = ?', [$identifier.'@local.invalid']);
            })
            ->when($this->hasColumn('users', 'username'), function ($query) use ($identifier) {
                $query->orWhereRaw('LOWER(username) = ?', [$identifier]);
            })
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages([
                'email_or_username' => 'This email or username is already registered.',
            ]);
        }

        $payload = [
            'name' => $validated['name'],
            'email' => $isEmail ? $identifier : $identifier.'@local.invalid',
            'role' => 'Staff',
            'status' => 'Active',
            'password' => Hash::make($validated['password']),
        ];

        if ($this->hasColumn('users', 'username')) {
            $payload['username'] = $isEmail ? null : $identifier;
        }

        if ($this->hasColumn('users', 'created_by')) {
            $payload['created_by'] = $request->user()?->id;
        }

        $user = User::create($payload);

        return response()->json([
            'message' => 'Staff account created successfully.',
            'id' => $user->id,
            'user' => $this->authenticatedUserPayload($user),
        ], 201);
    }

    public function updateUserStatus(Request $request, User $user): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json(['message' => 'Access denied. Admin only.'], 403);
        }

        $validated = $request->validate([
            'status' => ['required', Rule::in(['Active', 'Inactive', 'Blocked', 'active', 'inactive', 'blocked'])],
        ]);

        $status = $this->displayUserStatus($validated['status']);

        if ($request->user()?->is($user) && $this->normalizeUserStatus($status) !== 'active') {
            return response()->json(['message' => 'You cannot deactivate or block your own account.'], 422);
        }

        $user->update([
            'status' => $status,
        ]);

        return response()->json(['message' => 'User status updated.']);
    }

    public function destroyUser(Request $request, User $user): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json(['message' => 'Access denied. Admin only.'], 403);
        }

        if ($request->user()?->is($user)) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User account deleted permanently.']);
    }

    public function updateProfilePhoto(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'profile_photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:2048'],
        ]);

        $user = $request->user();
        if (! $user) {
            throw ValidationException::withMessages([
                'profile_photo' => ['You must be signed in to update your profile photo.'],
            ]);
        }

        $oldPath = $user->profile_photo_path;
        $newPath = $validated['profile_photo']->store('users/profile-photos', 'public');

        $user->update([
            'profile_photo_path' => $newPath,
        ]);

        if ($oldPath && $oldPath !== $newPath && Storage::disk('public')->exists($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        return response()->json([
            'message' => 'Profile photo updated.',
            'user' => $this->authenticatedUserPayload($user->fresh()),
        ]);
    }

    public function switchAccount(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'password' => ['required', 'string'],
        ]);

        $targetUser = User::findOrFail($validated['user_id']);

        if ($this->hasColumn('users', 'status') && $this->normalizeUserStatus($targetUser->status) !== 'active') {
            return response()->json(['message' => 'Cannot switch to an inactive user account.'], 422);
        }

        if (! in_array($this->normalizeUserRole($targetUser->role), ['admin', 'staff'], true)) {
            return response()->json(['message' => 'Access denied. Authorized personnel only.'], 403);
        }

        if (! Hash::check($validated['password'], $targetUser->password)) {
            return response()->json(['message' => 'Incorrect password for the selected account.'], 422);
        }

        Auth::login($targetUser);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Account switched successfully.',
            'user' => $this->authenticatedUserPayload($targetUser),
        ]);
    }

    public function lookups(): JsonResponse
    {
        $this->ensureDefaultAttendanceDependencies();

        $puroks = Purok::orderBy('purok_name')->get(['id', 'purok_name']);
        $beneficiaries = Beneficiary::with('purok')
            ->orderBy('first_name')
            ->get(['id', 'beneficiary_code', 'first_name', 'last_name', 'guardian_name', 'purok_id', 'status']);
        $scheduleColumns = ['id', 'title', 'schedule_date', 'start_time', 'end_time', 'location', 'status'];
        if ($this->hasColumn('feeding_schedules', 'session_type')) {
            $scheduleColumns[] = 'session_type';
        }

        $scheduleQuery = FeedingSchedule::query()->orderByDesc('schedule_date')->limit(200);
        $withAssignedCount = $this->hasTable('feeding_schedule_beneficiary');
        if ($withAssignedCount) {
            $scheduleQuery->withCount('beneficiaries');
        }
        $schedules = $scheduleQuery->get($scheduleColumns);

        return response()->json([
            'puroks' => $puroks,
            'beneficiaries' => $beneficiaries->map(fn (Beneficiary $b) => [
                'id' => $b->id,
                'code' => $b->beneficiary_code,
                'name' => trim($b->first_name.' '.$b->last_name),
                'guardian' => $b->guardian_name,
                'purok' => $b->purok?->purok_name,
                'status' => $b->status,
            ])->values(),
            'schedules' => $schedules->map(fn (FeedingSchedule $s) => [
                'id' => $s->id,
                'label' => $s->title.' ('.$s->schedule_date.')',
                'status' => $s->status,
                'session_type' => $this->hasColumn('feeding_schedules', 'session_type') ? $s->session_type : 'Regular',
                'schedule_date' => $s->schedule_date,
                'start_time' => $s->start_time,
                'end_time' => $s->end_time,
                'location' => $s->location,
                'assigned_count' => $withAssignedCount ? ($s->beneficiaries_count ?? 0) : 0,
            ])->values(),
            'manila_now' => $this->manilaNow()->format('Y-m-d H:i:s'),
        ]);
    }
}

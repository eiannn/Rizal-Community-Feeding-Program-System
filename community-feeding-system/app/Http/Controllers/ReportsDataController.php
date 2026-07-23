<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Beneficiary;
use App\Models\FeedingSchedule;
use App\Models\NutritionRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ReportsDataController extends Controller
{
    private function hasColumn(string $table, string $column): bool
    {
        return Schema::hasTable($table) && Schema::hasColumn($table, $column);
    }

    private function hasTable(string $table): bool
    {
        return Schema::hasTable($table);
    }

    private function manilaNow(): Carbon
    {
        return now('Asia/Manila');
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

    private function beneficiaryName(?Beneficiary $beneficiary): string
    {
        if (! $beneficiary) {
            return '-';
        }

        return trim(collect([$beneficiary->first_name, $beneficiary->middle_name, $beneficiary->last_name])->filter()->implode(' '));
    }

    private function beneficiaryAge(?Beneficiary $beneficiary): ?int
    {
        if (! $beneficiary) {
            return null;
        }

        if ($this->hasColumn('beneficiaries', 'age') && $beneficiary->age !== null) {
            return (int) $beneficiary->age;
        }

        $birthDate = $beneficiary->birth_date;
        if ($this->hasColumn('beneficiaries', 'date_of_birth') && $beneficiary->date_of_birth) {
            $birthDate = $beneficiary->date_of_birth;
        }

        return $birthDate ? (int) Carbon::parse($birthDate)->diffInYears($this->manilaNow()) : null;
    }

    private function calculateBmi(mixed $heightCm, mixed $weightKg): float
    {
        $heightMeters = ((float) $heightCm) / 100;
        if ($heightMeters <= 0) {
            return 0.0;
        }

        return round(((float) $weightKg) / ($heightMeters * $heightMeters), 1);
    }

    private function nutritionStatus(mixed $heightCm, mixed $weightKg, ?string $storedStatus = null): string
    {
        $known = ['Normal', 'Underweight', 'Overweight', 'Severely Underweight'];
        if ($storedStatus && in_array($storedStatus, $known, true)) {
            return $storedStatus;
        }

        $bmi = $this->calculateBmi($heightCm, $weightKg);
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

    private function formatDate(mixed $value): ?string
    {
        return $value ? Carbon::parse($value)->toDateString() : null;
    }

    private function formatTime(mixed $value): ?string
    {
        return $value ? Carbon::parse((string) $value)->format('H:i:s') : null;
    }

    private function scheduleTimeLabel(?FeedingSchedule $schedule): string
    {
        if (! $schedule) {
            return '-';
        }

        $start = $schedule->start_time ? Carbon::parse($schedule->start_time)->format('h:i A') : null;
        $end = $schedule->end_time ? Carbon::parse($schedule->end_time)->format('h:i A') : null;

        return trim(collect([$start, $end])->filter()->implode(' - ')) ?: '-';
    }

    private function scheduleDaysLabel(?FeedingSchedule $schedule): string
    {
        if (! $schedule) {
            return '-';
        }

        if ($this->hasColumn('feeding_schedules', 'schedule_days') && $schedule->schedule_days) {
            return $schedule->schedule_days;
        }

        return $schedule->schedule_date ? Carbon::parse($schedule->schedule_date)->toDateString() : '-';
    }

    private function statusCounts($rows): array
    {
        return [
            'present' => $rows->where('attendance_status', 'Present')->count(),
            'late' => $rows->where('attendance_status', 'Late')->count(),
            'absent' => $rows->where('attendance_status', 'Absent')->count(),
            'excused' => $rows->where('attendance_status', 'Excused')->count(),
            'total' => $rows->count(),
        ];
    }

    private function attendanceQuery(Request $request)
    {
        $query = Attendance::with(['beneficiary.purok', 'feedingSchedule', 'recorder'])
            ->orderByDesc('attendance_date')
            ->orderByDesc('id');

        if ($request->filled('date_from')) {
            $query->whereDate('attendance_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('attendance_date', '<=', $request->date_to);
        }
        if ($request->filled('attendance_date')) {
            $query->whereDate('attendance_date', $request->attendance_date);
        }
        if ($request->filled('status') && $request->status !== 'All Status') {
            $query->where('attendance_status', $request->status);
        }
        if ($request->filled('feeding_schedule_id') && $request->feeding_schedule_id !== 'All Schedules') {
            $query->where('feeding_schedule_id', $request->feeding_schedule_id);
        }
        if ($request->filled('query')) {
            $query->whereHas('beneficiary', function ($builder) use ($request) {
                $this->whereBeneficiaryNameContains($builder, $request->input('query'));
            });
        }

        return $query;
    }

    private function attendanceRecordRow(Attendance $attendance): array
    {
        return [
            'id' => $attendance->id,
            'beneficiary_id' => $attendance->beneficiary_id,
            'full_name' => $this->beneficiaryName($attendance->beneficiary),
            'date' => $this->formatDate($attendance->attendance_date),
            'time_in' => $attendance->attendance_time ?: optional($attendance->recorded_at)->timezone('Asia/Manila')->format('H:i:s'),
            'feeding_schedule' => $attendance->feedingSchedule?->title ?: '-',
            'feeding_schedule_id' => $attendance->feeding_schedule_id,
            'attendance_status' => $attendance->attendance_status,
            'remarks' => $attendance->remarks,
            'recorded_by' => $attendance->recorder?->name ?: '-',
        ];
    }

    public function overview(): JsonResponse
    {
        $attendanceRows = Attendance::query()->get(['attendance_status']);
        $attendanceCounts = $this->statusCounts($attendanceRows);

        $latestNutritionRows = NutritionRecord::with('beneficiary')
            ->orderByDesc('date_recorded')
            ->orderByDesc('id')
            ->get()
            ->unique('beneficiary_id')
            ->values();

        $nutritionCounts = [
            'total_checked' => $latestNutritionRows->count(),
            'normal' => 0,
            'underweight' => 0,
            'overweight' => 0,
            'severely_underweight' => 0,
        ];

        foreach ($latestNutritionRows as $record) {
            $status = $this->nutritionStatus($record->height_cm, $record->weight_kg, $record->nutrition_status);
            if ($status === 'Normal') {
                $nutritionCounts['normal']++;
            } elseif ($status === 'Underweight') {
                $nutritionCounts['underweight']++;
            } elseif ($status === 'Overweight') {
                $nutritionCounts['overweight']++;
            } elseif ($status === 'Severely Underweight') {
                $nutritionCounts['severely_underweight']++;
            }
        }

        $morningCount = FeedingSchedule::query()
            ->whereNotNull('start_time')
            ->whereTime('start_time', '<', '12:00')
            ->count();
        $afternoonCount = FeedingSchedule::query()
            ->whereNotNull('start_time')
            ->whereTime('start_time', '>=', '12:00')
            ->count();

        return response()->json([
            'attendance' => [
                'total_present' => $attendanceCounts['present'],
                'total_late' => $attendanceCounts['late'],
                'total_absent' => $attendanceCounts['absent'],
                'total_excused' => $attendanceCounts['excused'],
                'total_records' => $attendanceCounts['total'],
            ],
            'beneficiaries' => [
                'total' => Beneficiary::count(),
                'active' => Beneficiary::where('status', 'Active')->count(),
                'inactive' => Beneficiary::where('status', '!=', 'Active')->count(),
            ],
            'nutrition' => $nutritionCounts,
            'schedules' => [
                'total' => FeedingSchedule::count(),
                'morning' => $morningCount,
                'afternoon' => $afternoonCount,
                'active' => FeedingSchedule::whereIn('status', ['Active', 'Scheduled', 'Ongoing'])->count(),
            ],
        ]);
    }

    public function attendanceSummary(Request $request): JsonResponse
    {
        $rows = $this->attendanceQuery($request)->limit(5000)->get();
        $summaryRows = $rows
            ->groupBy('beneficiary_id')
            ->map(function ($group) use ($request) {
                $beneficiary = $group->first()->beneficiary;
                $counts = $this->statusCounts($group);

                return [
                    'beneficiary_id' => $beneficiary?->id,
                    'full_name' => $this->beneficiaryName($beneficiary),
                    'total_present' => $counts['present'],
                    'total_late' => $counts['late'],
                    'total_absent' => $counts['absent'],
                    'total_excused' => $counts['excused'],
                    'total_records' => $counts['total'],
                    'date_range' => ($request->date_from ?: 'Start').' to '.($request->date_to ?: 'Today'),
                    'feeding_schedules' => $group->pluck('feedingSchedule.title')->filter()->unique()->values()->implode(', '),
                ];
            })
            ->sortBy(fn ($row) => Str::lower($row['full_name']))
            ->values();

        $counts = $this->statusCounts($rows);

        return response()->json([
            'summary' => [
                'total_present' => $counts['present'],
                'total_late' => $counts['late'],
                'total_absent' => $counts['absent'],
                'total_excused' => $counts['excused'],
                'total_records' => $counts['total'],
            ],
            'data' => $summaryRows,
        ]);
    }

    public function studentAttendance(Beneficiary $beneficiary, Request $request): JsonResponse
    {
        $query = $this->attendanceQuery($request)->where('beneficiary_id', $beneficiary->id);
        $rows = $query->limit(1000)->get();
        $counts = $this->statusCounts($rows);

        return response()->json([
            'beneficiary' => [
                'id' => $beneficiary->id,
                'full_name' => $this->beneficiaryName($beneficiary),
                'feeding_schedule' => $rows->pluck('feedingSchedule.title')->filter()->unique()->values()->implode(', ') ?: '-',
                'total_present' => $counts['present'],
                'total_late' => $counts['late'],
                'total_absent' => $counts['absent'],
                'total_excused' => $counts['excused'],
                'total_records' => $counts['total'],
            ],
            'data' => $rows->map(fn (Attendance $row) => $this->attendanceRecordRow($row))->values(),
        ]);
    }

    public function beneficiariesMasterlist(Request $request): JsonResponse
    {
        $query = Beneficiary::with(['purok', 'latestNutritionRecord', 'feedingSchedules']);

        if ($request->filled('query')) {
            $this->whereBeneficiaryNameContains($query, $request->input('query'));
        }
        if ($request->filled('status') && $request->status !== 'All Status') {
            $query->where('status', $request->status);
        }
        if ($request->filled('purok') && $request->purok !== 'All Purok') {
            $query->whereHas('purok', fn ($builder) => $builder->where('purok_name', $request->purok));
        }
        if ($request->filled('grade_level') && $request->grade_level !== 'All Grade Levels' && $this->hasColumn('beneficiaries', 'grade_level')) {
            $query->where('grade_level', $request->grade_level);
        }
        if ($request->filled('registered_date') && $this->hasColumn('beneficiaries', 'created_at')) {
            $query->whereDate('created_at', $request->registered_date);
        }

        $rows = $query->orderBy('first_name')->limit(1000)->get()->map(function (Beneficiary $beneficiary) {
            $latestNutrition = $beneficiary->latestNutritionRecord;

            return [
                'id' => $beneficiary->id,
                'full_name' => $this->beneficiaryName($beneficiary),
                'age' => $this->beneficiaryAge($beneficiary) ?? '-',
                'sex' => $beneficiary->sex,
                'grade_level' => $this->hasColumn('beneficiaries', 'grade_level') ? ($beneficiary->grade_level ?: '-') : '-',
                'school_name' => $this->hasColumn('beneficiaries', 'school_name') ? ($beneficiary->school_name ?: '-') : '-',
                'feeding_schedule' => $beneficiary->feedingSchedules->pluck('title')->filter()->values()->implode(', ') ?: '-',
                'purok' => $beneficiary->purok?->purok_name ?: '-',
                'contact_number' => $this->hasColumn('beneficiaries', 'contact_number') ? ($beneficiary->contact_number ?: $beneficiary->guardian_contact) : $beneficiary->guardian_contact,
                'registered_date' => $this->hasColumn('beneficiaries', 'created_at') ? $this->formatDate($beneficiary->created_at) : null,
                'status' => $beneficiary->status,
                'height' => $latestNutrition?->height_cm,
                'weight' => $latestNutrition?->weight_kg,
            ];
        })->values();

        return response()->json([
            'summary' => [
                'total_beneficiaries' => Beneficiary::count(),
                'active_beneficiaries' => Beneficiary::where('status', 'Active')->count(),
                'inactive_beneficiaries' => Beneficiary::where('status', '!=', 'Active')->count(),
            ],
            'data' => $rows,
        ]);
    }

    public function beneficiaryRecord(Beneficiary $beneficiary): JsonResponse
    {
        $beneficiary->load(['purok', 'feedingSchedules', 'nutritionRecords.recorder']);
        $birthDate = $this->hasColumn('beneficiaries', 'date_of_birth') && $beneficiary->date_of_birth
            ? $beneficiary->date_of_birth
            : $beneficiary->birth_date;

        return response()->json([
            'record' => [
                'id' => $beneficiary->id,
                'profile_photo' => $beneficiary->profile_photo,
                'first_name' => $beneficiary->first_name,
                'middle_name' => $beneficiary->middle_name,
                'last_name' => $beneficiary->last_name,
                'complete_name' => $this->beneficiaryName($beneficiary),
                'age' => $this->beneficiaryAge($beneficiary),
                'sex' => $beneficiary->sex,
                'date_of_birth' => $this->formatDate($birthDate),
                'height' => $this->hasColumn('beneficiaries', 'height') ? $beneficiary->height : $beneficiary->latestNutritionRecord?->height_cm,
                'weight' => $this->hasColumn('beneficiaries', 'weight') ? $beneficiary->weight : $beneficiary->latestNutritionRecord?->weight_kg,
                'contact_number' => $this->hasColumn('beneficiaries', 'contact_number') ? $beneficiary->contact_number : null,
                'address' => $beneficiary->address,
                'purok' => $beneficiary->purok?->purok_name,
                'purok_id' => $beneficiary->purok_id,
                'school_name' => $this->hasColumn('beneficiaries', 'school_name') ? $beneficiary->school_name : null,
                'school_level' => $this->hasColumn('beneficiaries', 'school_level') ? $beneficiary->school_level : null,
                'grade_level' => $this->hasColumn('beneficiaries', 'grade_level') ? $beneficiary->grade_level : null,
                'school_year' => $this->hasColumn('beneficiaries', 'school_year') ? $beneficiary->school_year : null,
                'father_name' => $this->hasColumn('beneficiaries', 'father_name') ? $beneficiary->father_name : null,
                'mother_name' => $this->hasColumn('beneficiaries', 'mother_name') ? $beneficiary->mother_name : null,
                'guardian_name' => $beneficiary->guardian_name,
                'relationship_to_guardian' => $this->hasColumn('beneficiaries', 'relationship_to_guardian') ? $beneficiary->relationship_to_guardian : null,
                'parent_guardian_contact_number' => $this->hasColumn('beneficiaries', 'parent_guardian_contact_number') ? $beneficiary->parent_guardian_contact_number : $beneficiary->guardian_contact,
                'emergency_contact_number' => $this->hasColumn('beneficiaries', 'emergency_contact_number') ? $beneficiary->emergency_contact_number : null,
                'feeding_schedule_id' => $this->hasColumn('beneficiaries', 'feeding_schedule_id') ? $beneficiary->feeding_schedule_id : null,
                'feeding_schedule' => $beneficiary->feedingSchedules->pluck('title')->filter()->values()->implode(', ') ?: '-',
                'schedule_date_or_days' => $beneficiary->feedingSchedules->map(fn ($schedule) => $this->scheduleDaysLabel($schedule))->filter()->values()->implode(', ') ?: '-',
                'schedule_time' => $beneficiary->feedingSchedules->map(fn ($schedule) => $this->scheduleTimeLabel($schedule))->filter()->values()->implode(', ') ?: '-',
                'status' => $beneficiary->status,
            ],
            'nutrition_records' => $beneficiary->nutritionRecords
                ->sortByDesc('date_recorded')
                ->map(fn (NutritionRecord $record) => [
                    'id' => $record->id,
                    'date_recorded' => $this->formatDate($record->date_recorded),
                    'height' => (float) $record->height_cm,
                    'weight' => (float) $record->weight_kg,
                    'bmi' => $this->hasColumn('nutrition_records', 'bmi') && $record->bmi !== null ? (float) $record->bmi : $this->calculateBmi($record->height_cm, $record->weight_kg),
                    'nutrition_status' => $this->nutritionStatus($record->height_cm, $record->weight_kg, $record->nutrition_status),
                    'remarks' => $record->remarks,
                    'recorded_by' => $record->recorder?->name ?: '-',
                ])
                ->values(),
        ]);
    }

    public function nutritionSummary(Request $request): JsonResponse
    {
        $query = NutritionRecord::with(['beneficiary.purok', 'recorder'])->orderByDesc('date_recorded')->orderByDesc('id');

        if ($request->filled('date_from')) {
            $query->whereDate('date_recorded', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date_recorded', '<=', $request->date_to);
        }
        if ($request->filled('recorded_date')) {
            $query->whereDate('date_recorded', $request->recorded_date);
        }
        if ($request->filled('query')) {
            $query->whereHas('beneficiary', function ($builder) use ($request) {
                $this->whereBeneficiaryNameContains($builder, $request->input('query'));
            });
        }

        $rows = $query->limit(2000)->get()
            ->map(function (NutritionRecord $record) {
                $bmi = $this->hasColumn('nutrition_records', 'bmi') && $record->bmi !== null
                    ? (float) $record->bmi
                    : $this->calculateBmi($record->height_cm, $record->weight_kg);

                return [
                    'id' => $record->id,
                    'beneficiary_id' => $record->beneficiary_id,
                    'full_name' => $this->beneficiaryName($record->beneficiary),
                    'age' => $this->beneficiaryAge($record->beneficiary) ?? '-',
                    'sex' => $record->beneficiary?->sex ?: '-',
                    'height' => (float) $record->height_cm,
                    'weight' => (float) $record->weight_kg,
                    'bmi' => $bmi,
                    'nutrition_status' => $this->nutritionStatus($record->height_cm, $record->weight_kg, $record->nutrition_status),
                    'date_recorded' => $this->formatDate($record->date_recorded),
                    'remarks' => $record->remarks,
                    'recorded_by' => $record->recorder?->name ?: '-',
                ];
            });

        if ($request->filled('nutrition_status') && $request->nutrition_status !== 'All Status') {
            $rows = $rows->filter(fn (array $row) => $row['nutrition_status'] === $request->nutrition_status)->values();
        }

        return response()->json([
            'summary' => [
                'total_checked' => $rows->pluck('beneficiary_id')->unique()->count(),
                'normal' => $rows->where('nutrition_status', 'Normal')->count(),
                'underweight' => $rows->where('nutrition_status', 'Underweight')->count(),
                'overweight' => $rows->where('nutrition_status', 'Overweight')->count(),
                'severely_underweight' => $rows->where('nutrition_status', 'Severely Underweight')->count(),
            ],
            'data' => $rows->values(),
        ]);
    }

    public function nutritionHistory(Beneficiary $beneficiary, Request $request): JsonResponse
    {
        $query = NutritionRecord::with('recorder')
            ->where('beneficiary_id', $beneficiary->id)
            ->orderByDesc('date_recorded')
            ->orderByDesc('id');

        if ($request->filled('date_from')) {
            $query->whereDate('date_recorded', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date_recorded', '<=', $request->date_to);
        }
        if ($request->filled('recorded_date')) {
            $query->whereDate('date_recorded', $request->recorded_date);
        }

        $rows = $query->limit(1000)->get()->map(fn (NutritionRecord $record) => [
            'id' => $record->id,
            'full_name' => $this->beneficiaryName($beneficiary),
            'date_recorded' => $this->formatDate($record->date_recorded),
            'height' => (float) $record->height_cm,
            'weight' => (float) $record->weight_kg,
            'bmi' => $this->hasColumn('nutrition_records', 'bmi') && $record->bmi !== null ? (float) $record->bmi : $this->calculateBmi($record->height_cm, $record->weight_kg),
            'nutrition_status' => $this->nutritionStatus($record->height_cm, $record->weight_kg, $record->nutrition_status),
            'remarks' => $record->remarks,
            'recorded_by' => $record->recorder?->name ?: '-',
        ])->values();

        return response()->json([
            'beneficiary' => [
                'id' => $beneficiary->id,
                'full_name' => $this->beneficiaryName($beneficiary),
            ],
            'data' => $rows,
        ]);
    }

    public function scheduleSummary(Request $request): JsonResponse
    {
        $query = FeedingSchedule::withCount('beneficiaries');

        if ($request->filled('date_from')) {
            $query->whereDate('schedule_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('schedule_date', '<=', $request->date_to);
        }
        if ($request->filled('schedule_date')) {
            $query->whereDate('schedule_date', $request->schedule_date);
        }
        if ($request->filled('schedule_query')) {
            $needle = $this->searchNeedle($request->schedule_query);
            $query->where(function ($builder) use ($needle) {
                $builder->whereRaw('LOWER(title) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(session_type) LIKE ?', [$needle]);
            });
        }
        if ($request->filled('beneficiary_query')) {
            $query->whereHas('beneficiaries', function ($builder) use ($request) {
                $this->whereBeneficiaryNameContains($builder, $request->input('beneficiary_query'));
            });
        }
        if ($request->filled('status') && $request->status !== 'All Status') {
            $query->where('status', $request->status);
        }
        if ($request->filled('schedule_time') && $request->schedule_time !== 'All Times') {
            if ($request->schedule_time === 'Morning') {
                $query->whereTime('start_time', '<', '12:00');
            } elseif ($request->schedule_time === 'Afternoon') {
                $query->whereTime('start_time', '>=', '12:00');
            }
        }

        $rows = $query->orderByDesc('schedule_date')->limit(1000)->get()->map(fn (FeedingSchedule $schedule) => [
            'id' => $schedule->id,
            'schedule_name' => $schedule->title,
            'feeding_schedule' => $schedule->session_type ?: $schedule->title,
            'schedule_date' => $this->formatDate($schedule->schedule_date),
            'date_or_days' => $this->scheduleDaysLabel($schedule),
            'time' => $this->scheduleTimeLabel($schedule),
            'assigned_beneficiaries_count' => $this->hasTable('feeding_schedule_beneficiary') ? $schedule->beneficiaries_count : Beneficiary::where('feeding_schedule_id', $schedule->id)->count(),
            'status' => $schedule->status,
            'remarks' => $this->hasColumn('feeding_schedules', 'remarks') ? ($schedule->remarks ?: $schedule->description) : $schedule->description,
        ])->values();

        return response()->json([
            'summary' => [
                'total_schedules' => FeedingSchedule::count(),
                'morning' => FeedingSchedule::whereNotNull('start_time')->whereTime('start_time', '<', '12:00')->count(),
                'afternoon' => FeedingSchedule::whereNotNull('start_time')->whereTime('start_time', '>=', '12:00')->count(),
                'active' => FeedingSchedule::whereIn('status', ['Active', 'Scheduled', 'Ongoing'])->count(),
            ],
            'data' => $rows,
        ]);
    }

    public function scheduleRecord(FeedingSchedule $feedingSchedule, Request $request): JsonResponse
    {
        $selectedScheduleDate = $request->filled('schedule_date') ? $request->schedule_date : null;
        $feedingScheduleDate = $this->formatDate($feedingSchedule->schedule_date);

        $query = $this->hasTable('feeding_schedule_beneficiary')
            ? $feedingSchedule->beneficiaries()->with('purok')
            : Beneficiary::query()->with('purok')->where('feeding_schedule_id', $feedingSchedule->id);

        if ($request->filled('query')) {
            $this->whereBeneficiaryNameContains($query, $request->input('query'));
        }
        if ($request->filled('purok') && $request->purok !== 'All Purok') {
            $query->whereHas('purok', fn ($builder) => $builder->where('purok_name', $request->purok));
        }
        if ($request->filled('grade_level') && $request->grade_level !== 'All Grade Levels' && $this->hasColumn('beneficiaries', 'grade_level')) {
            $query->where('grade_level', $request->grade_level);
        }

        $rows = $selectedScheduleDate && $selectedScheduleDate !== $feedingScheduleDate
            ? collect()
            : $query->orderBy('first_name')->limit(1000)->get()->map(fn (Beneficiary $beneficiary) => [
            'id' => $beneficiary->id,
            'full_name' => $this->beneficiaryName($beneficiary),
            'age' => $this->beneficiaryAge($beneficiary) ?? '-',
            'sex' => $beneficiary->sex,
            'grade_level' => $this->hasColumn('beneficiaries', 'grade_level') ? ($beneficiary->grade_level ?: '-') : '-',
            'school_name' => $this->hasColumn('beneficiaries', 'school_name') ? ($beneficiary->school_name ?: '-') : '-',
            'purok' => $beneficiary->purok?->purok_name ?: '-',
            'contact_number' => $this->hasColumn('beneficiaries', 'contact_number') ? ($beneficiary->contact_number ?: $beneficiary->guardian_contact) : $beneficiary->guardian_contact,
            'schedule_date' => $feedingScheduleDate,
            'status' => $beneficiary->status,
        ])->values();

        return response()->json([
            'schedule' => [
                'id' => $feedingSchedule->id,
                'schedule_name' => $feedingSchedule->title,
                'feeding_schedule' => $feedingSchedule->session_type ?: $feedingSchedule->title,
                'schedule_date' => $feedingScheduleDate,
                'date_or_days' => $this->scheduleDaysLabel($feedingSchedule),
                'time' => $this->scheduleTimeLabel($feedingSchedule),
                'status' => $feedingSchedule->status,
            ],
            'data' => $rows,
        ]);
    }
}

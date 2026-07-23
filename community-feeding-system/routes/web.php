<?php

use App\Http\Controllers\BeneficiaryController;
use App\Http\Controllers\AppDataController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportsDataController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

$authUserPayload = function ($user = null): array {
    $user ??= auth()->user();

    if (! $user) {
        return [];
    }

    $role = strtolower(trim((string) ($user->role ?? 'staff')));
    $status = strtolower(trim((string) ($user->status ?? 'active')));
    $email = $user->email;
    if (($user->username ?? null) && $email && str_ends_with($email, '@local.invalid')) {
        $email = null;
    }

    return [
        'id' => $user->id,
        'name' => $user->name,
        'email' => $email,
        'username' => $user->username ?? null,
        'role' => $role,
        'display_role' => ucfirst($role),
        'status' => $status,
        'profile_photo_url' => $user->profile_photo_path ? Storage::disk('public')->url($user->profile_photo_path) : null,
    ];
};

$renderReactPage = function (string $page, string $title, array $props = []) use ($authUserPayload) {
    return view('pages.react-page', [
        'page' => $page,
        'title' => $title,
        'props' => array_replace_recursive([
            'authUser' => $authUserPayload(),
            'flash' => [
                'signed_in_success' => session('signed_in_success'),
                'success' => session('success'),
                'status' => session('status'),
            ],
        ], $props),
    ]);
};

$dashboardRouteFor = function ($user): string {
    return strtolower(trim((string) ($user?->role ?? 'staff'))) === 'admin'
        ? 'admin.dashboard'
        : 'staff.dashboard';
};

Route::get('/', function () {
    return view('welcome');
})->name('home');

Route::middleware(['auth', 'role:admin,staff'])->group(function () use ($renderReactPage, $dashboardRouteFor) {
    Route::get('/dashboard', function (Request $request) use ($dashboardRouteFor) {
        return redirect()->route($dashboardRouteFor($request->user()));
    })->name('dashboard');

    Route::get('/admin/dashboard', function () use ($renderReactPage) {
        return $renderReactPage('dashboard', 'Admin Dashboard', ['dashboardRole' => 'admin']);
    })->middleware('role:admin')->name('admin.dashboard');

    Route::get('/staff/dashboard', function () use ($renderReactPage) {
        return $renderReactPage('dashboard', 'Staff Dashboard', ['dashboardRole' => 'staff']);
    })->middleware('role:staff')->name('staff.dashboard');

    Route::get('/beneficiaries', function () use ($renderReactPage) {
        return $renderReactPage('beneficiaries', 'Beneficiaries');
    })->name('beneficiaries.index');

    Route::get('/schedules', function () use ($renderReactPage) {
        return $renderReactPage('schedules', 'Feeding Schedules');
    })->name('schedules.index');

    Route::get('/attendance', function () use ($renderReactPage) {
        return $renderReactPage('attendance', 'Attendance');
    })->name('attendance.index');
    Route::get('/attendance/print', [AppDataController::class, 'attendancePrint'])->name('attendance.print');

    Route::get('/nutrition', function () use ($renderReactPage) {
        return $renderReactPage('nutrition', 'Nutrition');
    })->name('nutrition.index');

    Route::get('/reports', function () use ($renderReactPage) {
        return $renderReactPage('reports', 'Reports');
    })->name('reports.index');

    Route::prefix('app-data')->group(function () {
        Route::get('/auth/me', [AppDataController::class, 'currentUser']);
        Route::get('/dashboard', [AppDataController::class, 'dashboard']);
        Route::get('/lookups', [AppDataController::class, 'lookups']);

        Route::prefix('psgc')->group(function () {
            Route::get('/provinces', [AppDataController::class, 'psgcProvinces']);
            Route::get('/cities-municipalities', [AppDataController::class, 'psgcCitiesMunicipalities']);
            Route::get('/barangays', [AppDataController::class, 'psgcBarangays']);
            Route::get('/provinces/{provinceCode}/cities-municipalities', [AppDataController::class, 'psgcCitiesMunicipalitiesByProvince']);
            Route::get('/cities-municipalities/{cityOrMunicipalityCode}/barangays', [AppDataController::class, 'psgcBarangaysByCityMunicipality']);
        });

        Route::get('/beneficiaries', [AppDataController::class, 'beneficiaries']);
        Route::post('/beneficiaries', [AppDataController::class, 'storeBeneficiary']);
        Route::patch('/beneficiaries/{beneficiary}', [AppDataController::class, 'updateBeneficiary']);
        Route::patch('/beneficiaries/{beneficiary}/status', [AppDataController::class, 'updateBeneficiaryStatus']);
        Route::delete('/beneficiaries/{beneficiary}', [AppDataController::class, 'deleteBeneficiary']);

        Route::get('/schedules', [AppDataController::class, 'schedules']);
        Route::post('/schedules', [AppDataController::class, 'storeSchedule']);
        Route::patch('/schedules/{feedingSchedule}/status', [AppDataController::class, 'updateScheduleStatus']);
        Route::get('/schedules/{feedingSchedule}/beneficiaries', [AppDataController::class, 'scheduleBeneficiaries']);
        Route::put('/schedules/{feedingSchedule}/beneficiaries', [AppDataController::class, 'updateScheduleBeneficiaries']);

        Route::get('/attendances', [AppDataController::class, 'attendances']);
        Route::get('/attendances/schedule/{feedingSchedule}', [AppDataController::class, 'attendanceBySchedule']);
        Route::get('/attendances/reports', [AppDataController::class, 'attendanceReports']);
        Route::post('/attendances/reports/generate', [AppDataController::class, 'generateAttendanceReportFile']);
        Route::get('/attendances/report-files', [AppDataController::class, 'attendanceReportFiles']);
        Route::get('/attendances/history/{beneficiary}', [AppDataController::class, 'attendanceHistory']);
        Route::post('/attendances', [AppDataController::class, 'storeAttendance']);
        Route::post('/attendances/bulk', [AppDataController::class, 'storeBulkAttendance']);
        Route::patch('/attendances/{attendance}', [AppDataController::class, 'updateAttendance']);
        Route::delete('/attendances/{attendance}', [AppDataController::class, 'destroyAttendance']);

        Route::get('/nutrition-records', [AppDataController::class, 'nutritionRecords']);
        Route::post('/nutrition-records', [AppDataController::class, 'storeNutritionRecord']);
        Route::patch('/nutrition-records/{nutritionRecord}', [AppDataController::class, 'updateNutritionRecord']);

        Route::get('/reports', [AppDataController::class, 'reports']);
        Route::post('/reports', [AppDataController::class, 'generateReport']);
        Route::get('/reports/overview', [ReportsDataController::class, 'overview']);
        Route::get('/reports/attendance-summary', [ReportsDataController::class, 'attendanceSummary']);
        Route::get('/reports/attendance-summary/{beneficiary}', [ReportsDataController::class, 'studentAttendance']);
        Route::get('/reports/beneficiaries-masterlist', [ReportsDataController::class, 'beneficiariesMasterlist']);
        Route::get('/reports/beneficiaries-masterlist/{beneficiary}', [ReportsDataController::class, 'beneficiaryRecord']);
        Route::get('/reports/nutrition-summary', [ReportsDataController::class, 'nutritionSummary']);
        Route::get('/reports/nutrition-summary/{beneficiary}', [ReportsDataController::class, 'nutritionHistory']);
        Route::get('/reports/schedule-summary', [ReportsDataController::class, 'scheduleSummary']);
        Route::get('/reports/schedule-summary/{feedingSchedule}', [ReportsDataController::class, 'scheduleRecord']);

        Route::post('/users/profile-photo', [AppDataController::class, 'updateProfilePhoto']);
        Route::patch('/profile', [ProfileController::class, 'updateApi']);
        Route::put('/password', [PasswordController::class, 'updateApi']);
    });

    Route::get('/api/auth/me', [AppDataController::class, 'currentUser']);

    Route::get('/beneficiaries/create', [BeneficiaryController::class, 'create'])->name('beneficiaries.create');
    Route::post('/beneficiaries', [BeneficiaryController::class, 'store'])->name('beneficiaries.store');
    Route::get('/beneficiaries/{beneficiary}', [BeneficiaryController::class, 'show'])->name('beneficiaries.show');
    Route::get('/beneficiaries/{beneficiary}/edit', [BeneficiaryController::class, 'edit'])->name('beneficiaries.edit');
    Route::put('/beneficiaries/{beneficiary}', [BeneficiaryController::class, 'update'])->name('beneficiaries.update');
    Route::delete('/beneficiaries/{beneficiary}', [BeneficiaryController::class, 'destroy'])->name('beneficiaries.destroy');

    Route::get('/profile', function () use ($renderReactPage) {
        return $renderReactPage('profile', 'Profile');
    })->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::middleware(['auth', 'role:admin'])->group(function () use ($renderReactPage) {
    Route::get('/users', function () use ($renderReactPage) {
        return $renderReactPage('users', 'User Management');
    })->name('users.index');

    Route::get('/admin/user-management', function () use ($renderReactPage) {
        return $renderReactPage('users', 'User Management');
    })->name('admin.users.index');

    Route::get('/admin/staff/create', function () use ($renderReactPage) {
        return $renderReactPage('users', 'Create Staff Account', ['openCreateStaff' => true]);
    })->name('admin.staff.create');

    Route::prefix('app-data')->group(function () {
        Route::get('/users', [AppDataController::class, 'users']);
        Route::post('/users', [AppDataController::class, 'storeUser']);
        Route::delete('/users/{user}', [AppDataController::class, 'destroyUser']);
        Route::post('/users/switch-account', [AppDataController::class, 'switchAccount']);
        Route::patch('/users/{user}/status', [AppDataController::class, 'updateUserStatus']);
    });

    Route::post('/api/admin/staff', [AppDataController::class, 'storeUser'])->name('api.admin.staff.store');
});

require __DIR__.'/auth.php';

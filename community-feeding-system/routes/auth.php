<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::redirect('register', '/?auth=login')
        ->name('register');

    Route::post('register', fn () => redirect()
        ->route('home', ['auth' => 'login'])
        ->with('status', 'Public registration is disabled. Please ask an administrator to create your account.'))
        ->middleware('throttle:5,1');

    Route::get('login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');

    Route::post('login', [AuthenticatedSessionController::class, 'store'])
        ->middleware('throttle:5,1');

    Route::post('api/auth/login', [AuthenticatedSessionController::class, 'storeApi'])
        ->middleware('throttle:5,1')
        ->name('api.auth.login');

    Route::redirect('forgot-password', '/?auth=login')
        ->name('password.request');

    Route::post('forgot-password', fn () => redirect()
        ->route('home', ['auth' => 'login'])
        ->with('status', 'Password reset is disabled for this system. Please contact the administrator.'))
        ->middleware('throttle:5,1')
        ->name('password.email');

    Route::redirect('reset-password/{token}', '/?auth=login')
        ->name('password.reset');

    Route::post('reset-password', fn () => redirect()
        ->route('home', ['auth' => 'login'])
        ->with('status', 'Password reset is disabled for this system. Please contact the administrator.'))
        ->middleware('throttle:5,1')
        ->name('password.store');
});

Route::middleware('auth')->group(function () {
    Route::get('verify-email', EmailVerificationPromptController::class)
        ->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::put('password', [PasswordController::class, 'update'])->name('password.update');

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');

    Route::post('api/auth/logout', [AuthenticatedSessionController::class, 'destroyApi'])
        ->name('api.auth.logout');
});

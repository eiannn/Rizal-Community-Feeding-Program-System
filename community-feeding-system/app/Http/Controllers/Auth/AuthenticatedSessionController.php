<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\View\View;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): View
    {
        return view('auth.login');
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        return redirect()
            ->intended($this->dashboardUrl())
            ->with('signed_in_success', 'Signed in successfully!');
    }

    /**
     * Handle a JSON session login request.
     */
    public function storeApi(LoginRequest $request): JsonResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        return response()->json([
            'message' => 'Signed in successfully!',
            'redirect_to' => $this->dashboardUrl(),
            'user' => $this->authenticatedUserPayload(Auth::user()),
        ]);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }

    /**
     * Destroy an authenticated JSON session.
     */
    public function destroyApi(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logout successful.',
            'redirect_to' => route('home', absolute: false),
        ]);
    }

    private function dashboardUrl(): string
    {
        $role = Str::of((string) (Auth::user()?->role ?? ''))->trim()->lower()->toString();
        $dashboardRoute = $role === 'admin' ? 'admin.dashboard' : 'staff.dashboard';

        return route($dashboardRoute, absolute: false);
    }

    private function authenticatedUserPayload($user): array
    {
        if (! $user) {
            return [];
        }

        $role = Str::of((string) ($user->role ?? 'staff'))->trim()->lower()->toString();
        $status = Str::of((string) ($user->status ?? 'active'))->trim()->lower()->toString();
        $email = $user->email;

        if (($user->username ?? null) && $email && Str::endsWith($email, '@local.invalid')) {
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
            'display_status' => ucfirst($status),
            'profile_photo_url' => $user->profile_photo_path ? Storage::disk('public')->url($user->profile_photo_path) : null,
        ];
    }
}

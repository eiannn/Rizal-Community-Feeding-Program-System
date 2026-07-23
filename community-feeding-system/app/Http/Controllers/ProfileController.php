<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request)
    {
        return view('profile.edit', [
            'user' => $request->user(),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        if (! $request->user()?->isAdmin()) {
            abort(403, 'Access denied. Admin only.');
        }

        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit')->with('status', 'profile-updated');
    }

    /**
     * Update the user's profile information from React/JSON.
     */
    public function updateApi(ProfileUpdateRequest $request): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json(['message' => 'Access denied. Admin only.'], 403);
        }

        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return response()->json([
            'message' => 'Profile information updated.',
            'user' => [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
                'email' => $request->user()->email,
                'username' => $request->user()->username,
                'role' => strtolower($request->user()->role ?? 'admin'),
                'display_role' => ucfirst(strtolower($request->user()->role ?? 'admin')),
                'status' => strtolower($request->user()->status ?? 'active'),
                'profile_photo_url' => $request->user()->profile_photo_path
                    ? \Illuminate\Support\Facades\Storage::disk('public')->url($request->user()->profile_photo_path)
                    : null,
            ],
        ]);
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        if (! $request->user()?->isAdmin()) {
            abort(403, 'Access denied. Admin only.');
        }

        $request->validateWithBag('userDeletion', [
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}

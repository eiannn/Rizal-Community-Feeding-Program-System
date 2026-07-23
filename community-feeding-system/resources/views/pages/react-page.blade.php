<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    @php
        $authUser = auth()->user();
        $authEmail = $authUser?->email;
        if (($authUser?->username ?? null) && $authEmail && str_ends_with($authEmail, '@local.invalid')) {
            $authEmail = '';
        }
    @endphp
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="auth-user-name" content="{{ $authUser?->name ?? 'System User' }}">
    <meta name="auth-user-email" content="{{ $authEmail ?? '' }}">
    <meta name="auth-user-username" content="{{ $authUser?->username ?? '' }}">
    <meta name="auth-user-role" content="{{ strtolower($authUser?->role ?? 'staff') }}">
    <meta name="auth-user-status" content="{{ strtolower($authUser?->status ?? 'active') }}">
    <meta name="auth-user-photo" content="{{ $authUser?->profile_photo_path ? \Illuminate\Support\Facades\Storage::disk('public')->url($authUser->profile_photo_path) : '' }}">
    <title>{{ $title ? $title.' | Community Feeding Program Monitoring System in Barangay Rizal Bansalan' : 'Community Feeding Program Monitoring System in Barangay Rizal Bansalan' }}</title>
    <link rel="icon" type="image/png" href="{{ asset('images/system-logo.png') }}">
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body class="bg-slate-50">
    <div
        id="app"
        data-page="{{ $page }}"
        data-props='@json($props ?? [])'
    ></div>
</body>
</html>


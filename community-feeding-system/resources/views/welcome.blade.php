<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Community Feeding Program Monitoring System in Barangay Rizal Bansalan</title>
    <link rel="icon" type="image/png" href="{{ asset('images/system-logo.png') }}">
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body class="bg-slate-950">
    @php
        $props = [
            'authenticated' => auth()->check(),
            'csrfToken' => csrf_token(),
            'status' => session('status'),
            'errors' => $errors->toArray(),
            'old' => [
                'auth' => old('auth'),
                'name' => old('name'),
                'email' => old('email'),
                'email_or_username' => old('email_or_username', old('email')),
                'role' => old('role', 'staff'),
                'remember' => old('remember'),
            ],
            'shouldOpenAuth' => request()->has('auth') || $errors->any() || session('status'),
            'routes' => [
                'home' => route('home', absolute: false),
                'dashboard' => route('dashboard', absolute: false),
                'login' => route('login', absolute: false),
                'apiLogin' => route('api.auth.login', absolute: false),
            ],
            'imageUrls' => [
                'bg1' => asset('images/bg1.jpg'),
                'bg2' => asset('images/bg2.jpg'),
                'bg3' => asset('images/bg3.jpg'),
            ],
            'logoUrl' => asset('images/system-logo.png'),
        ];
    @endphp
    <div id="app" data-page="welcome" data-props='@json($props)'></div>
</body>
</html>


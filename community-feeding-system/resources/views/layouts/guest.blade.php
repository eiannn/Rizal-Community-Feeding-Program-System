<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Community Feeding Program Monitoring System in Barangay Rizal Bansalan</title>
    <link rel="icon" type="image/png" href="{{ asset('images/system-logo.png') }}">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-slate-950 text-slate-100">
    <div class="min-h-screen flex items-center justify-center px-4 py-10">
        <div class="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900/90 p-7 shadow-2xl">
            <div class="mb-7 flex justify-center">
                <img src="{{ asset('images/system-logo.png') }}" alt="Community Feeding Program Monitoring System in Barangay Rizal Bansalan logo" class="h-16 w-auto max-w-[180px] object-contain" />
            </div>

            {{ $slot }}
        </div>
    </div>
</body>
</html>


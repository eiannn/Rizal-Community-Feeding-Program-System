<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Community Feeding Program Monitoring System in Barangay Rizal Bansalan</title>
    <link rel="icon" type="image/png" href="{{ asset('images/system-logo.png') }}">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="bg-slate-50 text-slate-800">
    <div class="min-h-screen flex">
        @include('layouts.navigation')

        <div class="flex-1 lg:ml-72">
            <header class="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200">
                <div class="px-6 lg:px-10 py-5 flex items-center justify-between">
                    <div>
                        <p class="text-sm font-semibold text-green-700 uppercase tracking-[0.18em]">
                            Community Feeding Program Monitoring System in Barangay Rizal Bansalan
                        </p>
                        <h1 class="text-2xl font-black text-slate-900">
                            {{ $header ?? 'Dashboard' }}
                        </h1>
                    </div>

                    <div class="flex items-center gap-4">
                        <div class="hidden md:flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                            <div class="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">
                                {{ strtoupper(substr(Auth::user()->name ?? 'U', 0, 1)) }}
                            </div>
                            <div>
                                <p class="text-sm font-semibold text-slate-800">{{ Auth::user()->name ?? 'User' }}</p>
                                <p class="text-xs text-slate-500">System User</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main class="px-6 lg:px-10 py-8">
                {{ $slot }}
            </main>
        </div>
    </div>
</body>
</html>


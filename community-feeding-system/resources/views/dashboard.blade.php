<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Dashboard | Community Feeding Program Monitoring System in Barangay Rizal Bansalan</title>
    <link rel="icon" type="image/png" href="{{ asset('images/system-logo.png') }}">
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body class="bg-slate-50">
    <div id="app" data-page="dashboardLegacy"></div>
</body>
</html>


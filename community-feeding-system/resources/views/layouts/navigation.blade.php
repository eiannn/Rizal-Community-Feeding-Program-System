<aside class="hidden lg:flex fixed top-0 left-0 h-screen w-72 bg-white border-r border-slate-200 flex-col">
    <div class="px-6 py-6 border-b border-slate-200">
        <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-green-700 flex items-center justify-center shadow-lg shadow-green-900/20">
                <span class="text-xl font-black text-white">CF</span>
            </div>
            <div>
                <h2 class="text-lg font-bold text-slate-900 leading-tight">Barangay Community Feeding Program</h2>
                <p class="text-sm text-slate-500">Monitoring System</p>
            </div>
        </div>
    </div>

    <div class="flex-1 px-4 py-6 overflow-y-auto">
        <p class="px-3 mb-3 text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">Main Menu</p>

        <nav class="space-y-2">
            <a href="{{ route('dashboard') }}"
               class="flex items-center gap-3 px-4 py-3 rounded-2xl bg-green-700 text-white shadow-sm">
                <span class="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-sm">🏠</span>
                <span class="font-medium">Dashboard</span>
            </a>

            <a href="{{ route('beneficiaries.index') }}"
               class="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-700 hover:bg-green-50 transition">
                <span class="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center text-sm">👦</span>
                <span class="font-medium">Beneficiaries</span>
            </a>

            <a href="#"
               class="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-700 hover:bg-green-50 transition">
                <span class="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center text-sm">📅</span>
                <span class="font-medium">Feeding Schedules</span>
            </a>

            <a href="#"
               class="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-700 hover:bg-green-50 transition">
                <span class="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center text-sm">✅</span>
                <span class="font-medium">Attendance</span>
            </a>

            <a href="#"
               class="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-700 hover:bg-green-50 transition">
                <span class="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center text-sm">📈</span>
                <span class="font-medium">Nutrition</span>
            </a>

            <a href="#"
               class="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-700 hover:bg-green-50 transition">
                <span class="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center text-sm">📄</span>
                <span class="font-medium">Reports</span>
            </a>

            <a href="#"
               class="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-700 hover:bg-green-50 transition">
                <span class="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center text-sm">👤</span>
                <span class="font-medium">Users</span>
            </a>
        </nav>
    </div>

    <div class="p-4 border-t border-slate-200">
        <form method="POST" action="{{ route('logout') }}">
            @csrf
            <button type="submit"
                    class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-green-700 hover:bg-green-800 text-white transition font-semibold shadow-sm">
                Logout
            </button>
        </form>
    </div>
</aside>

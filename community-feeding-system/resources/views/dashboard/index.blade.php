<x-app-layout>
    <x-slot name="header">
        Dashboard
    </x-slot>

    <div class="space-y-8">
        <section class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div class="xl:col-span-2 rounded-[28px] bg-gradient-to-br from-green-700 via-green-800 to-emerald-900 text-white p-8 shadow-xl overflow-hidden relative">
                <div class="absolute -top-12 right-0 w-64 h-64 bg-lime-300/10 blur-3xl rounded-full"></div>
                <div class="absolute bottom-0 left-12 w-56 h-56 bg-white/10 blur-3xl rounded-full"></div>

                <div class="relative z-10 max-w-2xl">
                    <p class="text-sm font-semibold text-lime-200 uppercase tracking-[0.16em] mb-3">
                        Dashboard Overview
                    </p>
                    <h2 class="text-3xl lg:text-4xl font-black leading-tight mb-4">
                        Manage your feeding program with clarity and confidence.
                    </h2>
                    <p class="text-white/80 leading-relaxed mb-8">
                        Monitor beneficiaries, feeding schedules, attendance, nutrition progress, and reports in one clean and centralized barangay platform.
                    </p>

                    <div class="flex flex-wrap gap-4">
                        <a href="{{ route('beneficiaries.index') }}"
                           class="px-6 py-3 rounded-2xl bg-white text-green-800 font-bold hover:bg-slate-100 transition shadow-lg">
                            Manage Beneficiaries
                        </a>

                        <a href="#"
                           class="px-6 py-3 rounded-2xl border border-white/20 bg-white/10 text-white font-semibold hover:bg-white/15 transition">
                            View Reports
                        </a>
                    </div>
                </div>
            </div>

            <div class="rounded-[28px] bg-white border border-slate-200 p-6 shadow-sm">
                <p class="text-sm font-semibold text-slate-400 uppercase tracking-[0.14em] mb-5">Program Status</p>

                <div class="space-y-4">
                    <div class="rounded-2xl bg-green-50 border border-green-100 p-4">
                        <p class="text-sm text-slate-500">Current Status</p>
                        <h3 class="text-xl font-bold text-slate-900 mt-1">Active</h3>
                    </div>

                    <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                        <p class="text-sm text-slate-500">Sessions Today</p>
                        <h3 class="text-xl font-bold text-slate-900 mt-1">0</h3>
                    </div>

                    <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                        <p class="text-sm text-slate-500">Pending Reports</p>
                        <h3 class="text-xl font-bold text-slate-900 mt-1">0</h3>
                    </div>
                </div>
            </div>
        </section>

        <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div class="rounded-[24px] bg-white border border-slate-200 p-6 shadow-sm">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center text-xl">ðŸ‘¦</div>
                    <span class="text-xs font-semibold text-slate-400">Total</span>
                </div>
                <p class="text-sm text-slate-500">Beneficiaries</p>
                <h3 class="text-3xl font-black text-slate-900 mt-2">0</h3>
            </div>

            <div class="rounded-[24px] bg-white border border-slate-200 p-6 shadow-sm">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 rounded-2xl bg-lime-50 text-lime-700 flex items-center justify-center text-xl">ðŸ“…</div>
                    <span class="text-xs font-semibold text-slate-400">Total</span>
                </div>
                <p class="text-sm text-slate-500">Schedules</p>
                <h3 class="text-3xl font-black text-slate-900 mt-2">0</h3>
            </div>

            <div class="rounded-[24px] bg-white border border-slate-200 p-6 shadow-sm">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-xl">âœ…</div>
                    <span class="text-xs font-semibold text-slate-400">Today</span>
                </div>
                <p class="text-sm text-slate-500">Attendance</p>
                <h3 class="text-3xl font-black text-slate-900 mt-2">0</h3>
            </div>

            <div class="rounded-[24px] bg-white border border-slate-200 p-6 shadow-sm">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl">ðŸ“ˆ</div>
                    <span class="text-xs font-semibold text-slate-400">Total</span>
                </div>
                <p class="text-sm text-slate-500">Nutrition Records</p>
                <h3 class="text-3xl font-black text-slate-900 mt-2">0</h3>
            </div>
        </section>

        <section class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div class="xl:col-span-2 rounded-[28px] bg-white border border-slate-200 p-6 shadow-sm">
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <p class="text-sm font-semibold text-slate-400 uppercase tracking-[0.14em]">Analytics</p>
                        <h3 class="text-xl font-bold text-slate-900 mt-1">Program Overview</h3>
                    </div>

                    <button class="px-4 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-semibold border border-green-100">
                        Monthly
                    </button>
                </div>

                <div class="h-80 rounded-[24px] bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                    Chart preview area
                </div>
            </div>

            <div class="rounded-[28px] bg-white border border-slate-200 p-6 shadow-sm">
                <div class="mb-5">
                    <p class="text-sm font-semibold text-slate-400 uppercase tracking-[0.14em]">Quick Actions</p>
                    <h3 class="text-xl font-bold text-slate-900 mt-1">System Shortcuts</h3>
                </div>

                <div class="space-y-3">
                    <a href="{{ route('beneficiaries.index') }}"
                       class="block w-full rounded-2xl bg-green-700 text-white px-5 py-4 font-semibold hover:bg-green-800 transition">
                        Manage Beneficiaries
                    </a>

                    <a href="#"
                       class="block w-full rounded-2xl bg-green-50 text-green-700 px-5 py-4 font-semibold hover:bg-green-100 transition border border-green-100">
                        Feeding Schedules
                    </a>

                    <a href="#"
                       class="block w-full rounded-2xl bg-slate-50 text-slate-700 px-5 py-4 font-semibold hover:bg-slate-100 transition border border-slate-200">
                        Attendance
                    </a>

                    <a href="#"
                       class="block w-full rounded-2xl bg-slate-50 text-slate-700 px-5 py-4 font-semibold hover:bg-slate-100 transition border border-slate-200">
                        Nutrition
                    </a>

                    <a href="#"
                       class="block w-full rounded-2xl bg-slate-50 text-slate-700 px-5 py-4 font-semibold hover:bg-slate-100 transition border border-slate-200">
                        Reports
                    </a>
                </div>
            </div>
        </section>
    </div>
</x-app-layout>

<x-app-layout>
    <x-slot name="header">
        Add Beneficiary
    </x-slot>

    <div class="space-y-8">
        <section class="rounded-[28px] bg-gradient-to-br from-green-700 via-green-800 to-emerald-900 text-white p-8 shadow-xl overflow-hidden relative">
            <div class="absolute -top-10 right-0 w-64 h-64 bg-lime-300/10 blur-3xl rounded-full"></div>
            <div class="absolute bottom-0 left-10 w-56 h-56 bg-white/10 blur-3xl rounded-full"></div>

            <div class="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div class="max-w-2xl">
                    <p class="text-sm font-semibold text-lime-200 uppercase tracking-[0.16em] mb-3">
                        Beneficiary Registration
                    </p>
                    <h2 class="text-3xl lg:text-4xl font-black leading-tight mb-3">
                        Add a new beneficiary record.
                    </h2>
                    <p class="text-white/80 leading-relaxed">
                        Enter the beneficiary’s personal details, guardian information, address, and assigned purok to register them in the system.
                    </p>
                </div>

                <div>
                    <a href="{{ route('beneficiaries.index') }}"
                       class="inline-flex items-center px-6 py-3 rounded-2xl bg-white text-green-800 font-bold hover:bg-slate-100 transition shadow-lg">
                        Back to Beneficiaries
                    </a>
                </div>
            </div>
        </section>

        <section class="rounded-[28px] bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-200">
                <p class="text-sm font-semibold text-slate-400 uppercase tracking-[0.14em]">Beneficiary Form</p>
                <h3 class="text-xl font-bold text-slate-900 mt-1">Registration Details</h3>
            </div>

            <div class="p-6 lg:p-8">
                <form action="{{ route('beneficiaries.store') }}" method="POST" class="space-y-8">
                    @csrf
                    @include('beneficiaries.form')

                    <div class="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3 sm:justify-end">
                        <a href="{{ route('beneficiaries.index') }}"
                           class="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition">
                            Cancel
                        </a>

                        <button type="submit"
                                class="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-green-700 text-white font-semibold hover:bg-green-800 transition shadow-sm">
                            Save Beneficiary
                        </button>
                    </div>
                </form>
            </div>
        </section>
    </div>
</x-app-layout>
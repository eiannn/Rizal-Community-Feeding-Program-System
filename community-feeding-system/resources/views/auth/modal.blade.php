<div
    x-show="openAuth"
    x-transition
    x-cloak
    @keydown.escape.window="openAuth = false"
    class="fixed inset-0 z-50 flex items-center justify-center px-4"
>
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="openAuth = false"></div>

    <div
        class="relative w-full max-w-md overflow-hidden rounded-[30px] border border-white/15 bg-slate-900/90 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
        @click.outside="openAuth = false"
        role="dialog"
        aria-modal="true"
        aria-label="Authentication modal"
    >
        <div class="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-lime-300/15 blur-3xl"></div>
        <div class="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-emerald-500/15 blur-3xl"></div>

        <div class="relative border-b border-white/10 p-6 pb-4">
            <div class="mb-5 flex items-start justify-between gap-4">
                <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300/80">Secure Portal</p>
                    <h3 class="mt-2 text-2xl font-bold text-white">Account Access</h3>
                    <p class="mt-1 text-sm text-white/65">Sign in or create your account to continue.</p>
                </div>
                <button
                    @click="openAuth = false"
                    class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
                    aria-label="Close authentication modal"
                >
                    &times;
                </button>
            </div>

            <template x-if="tab !== 'forgot'">
                <div class="flex rounded-2xl border border-white/10 bg-black/20 p-1.5 shadow-inner shadow-black/30">
                    <button
                        @click="tab = 'login'"
                        :class="tab === 'login' ? 'bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-lg shadow-emerald-900/35' : 'text-white/70 hover:text-white'"
                        class="w-1/2 rounded-xl py-2.5 text-sm font-semibold transition"
                    >
                        Login
                    </button>

                    <button
                        @click="tab = 'register'"
                        :class="tab === 'register' ? 'bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-lg shadow-emerald-900/35' : 'text-white/70 hover:text-white'"
                        class="w-1/2 rounded-xl py-2.5 text-sm font-semibold transition"
                    >
                        Sign Up
                    </button>
                </div>
            </template>
        </div>

        <div x-show="tab === 'login'" x-transition class="relative p-6 pt-5">
            @include('auth.login')
        </div>

        <div x-show="tab === 'register'" x-transition class="relative p-6 pt-5">
            @include('auth.register')
        </div>

        <div x-show="tab === 'forgot'" x-transition class="relative p-6 pt-5">
            @include('auth.forgot-password')
        </div>
    </div>
</div>

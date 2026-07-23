<x-guest-layout>
    <div class="mb-6 text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300/80">Authorized Access</p>
        <h4 class="mt-2 text-2xl font-bold text-white">Authorized Personnel Login</h4>
    </div>

    @if (session('status'))
        <div class="mb-4 rounded-lg border border-emerald-300/25 bg-emerald-500/20 px-4 py-3 text-sm text-emerald-100">
            {{ session('status') }}
        </div>
    @endif

    <form
        method="POST"
        action="{{ route('login') }}"
        class="space-y-4"
        autocomplete="off"
        data-login-reset-form
        x-data="{ showPassword: false, role: @js(old('role', 'staff')) }"
    >
        @csrf
        <input type="hidden" name="auth" value="login">
        <input type="hidden" name="role" x-model="role">

        <div>
            <label class="mb-2 block text-sm font-medium text-white/85">Email or Username</label>
            <input
                type="text"
                name="email_or_username"
                value=""
                required
                autocomplete="off"
                autocorrect="off"
                autocapitalize="none"
                spellcheck="false"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                class="w-full rounded-lg border border-white/15 bg-slate-800/70 px-4 py-3 text-white placeholder-white/35 outline-none transition focus:border-lime-300 focus:ring-2 focus:ring-lime-400/30"
                placeholder="name@example.com"
            >
            @error('email_or_username')
                <p class="mt-2 text-sm text-red-300">{{ $message }}</p>
            @enderror
            @error('email')
                <p class="mt-2 text-sm text-red-300">{{ $message }}</p>
            @enderror
        </div>

        <div>
            <label class="mb-2 block text-sm font-medium text-white/85">Password</label>
            <div class="relative">
                <input
                    :type="showPassword ? 'text' : 'password'"
                    name="password"
                    required
                    autocomplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    class="w-full rounded-lg border border-white/15 bg-slate-800/70 px-4 py-3 pr-12 text-white placeholder-white/35 outline-none transition focus:border-lime-300 focus:ring-2 focus:ring-lime-400/30"
                    placeholder="Enter your password"
                >
                <button type="button" @click="showPassword = !showPassword" class="absolute inset-y-0 right-3 text-sm font-semibold text-lime-300">
                    <span x-text="showPassword ? 'Hide' : 'Show'"></span>
                </button>
            </div>
            @error('password')
                <p class="mt-2 text-sm text-red-300">{{ $message }}</p>
            @enderror
        </div>

        <div>
            <label class="mb-2 block text-sm font-medium text-white/85">Select Role</label>
            <div class="grid grid-cols-2 gap-2 rounded-lg border border-white/15 bg-slate-800/70 p-1">
                <button
                    type="button"
                    @click="role = 'admin'"
                    :class="role === 'admin' ? 'bg-emerald-500 text-white' : 'text-white/75 hover:bg-white/10'"
                    class="rounded-md px-4 py-3 text-sm font-bold transition"
                >
                    Admin
                </button>
                <button
                    type="button"
                    @click="role = 'staff'"
                    :class="role === 'staff' ? 'bg-emerald-500 text-white' : 'text-white/75 hover:bg-white/10'"
                    class="rounded-md px-4 py-3 text-sm font-bold transition"
                >
                    Staff
                </button>
            </div>
            @error('role')
                <p class="mt-2 text-sm text-red-300">{{ $message }}</p>
            @enderror
        </div>

        <label class="inline-flex items-center gap-3 text-sm text-white/75">
            <input type="checkbox" name="remember" class="rounded border-white/25 bg-slate-800 text-green-600">
            <span>Remember me on this device</span>
        </label>

        <button
            type="submit"
            class="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-green-500 py-3.5 font-semibold text-white shadow-xl shadow-emerald-900/35 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-lime-300/40"
        >
            Login
        </button>

        <p class="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-xs text-white/60">
            Access is restricted to authorized personnel only.
        </p>
    </form>

    <script>
        (() => {
            const clearLoginFields = () => {
                document.querySelectorAll('[data-login-reset-form]').forEach((form) => {
                    ['email_or_username', 'password'].forEach((name) => {
                        const input = form.elements.namedItem(name);
                        if (input) input.value = '';
                    });
                });
            };

            [0, 50, 250, 750].forEach((delay) => window.setTimeout(clearLoginFields, delay));
        })();
    </script>
</x-guest-layout>

<div class="mb-6">
    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300/80">New Account</p>
    <h4 class="mt-2 text-2xl font-bold text-white">Create your account</h4>
    <p class="mt-1 text-sm text-white/65">Register to access the management dashboard.</p>
</div>

<form method="POST" action="{{ route('register') }}" class="space-y-4">
    @csrf
    <input type="hidden" name="auth" value="register">

    <div>
        <label class="mb-2 block text-sm font-medium text-white/85">Full Name</label>
        <input
            type="text"
            name="name"
            value="{{ old('name') }}"
            required
            autocomplete="name"
            class="w-full rounded-2xl border border-white/15 bg-slate-800/70 px-4 py-3 text-white placeholder-white/35 outline-none transition focus:border-lime-300 focus:ring-2 focus:ring-lime-400/30"
            placeholder="Enter your full name"
        >
        @error('name')
            <p class="mt-2 text-sm text-red-300">{{ $message }}</p>
        @enderror
    </div>

    <div>
        <label class="mb-2 block text-sm font-medium text-white/85">Email Address</label>
        <input
            type="email"
            name="email"
            value="{{ old('email') }}"
            required
            autocomplete="username"
            class="w-full rounded-2xl border border-white/15 bg-slate-800/70 px-4 py-3 text-white placeholder-white/35 outline-none transition focus:border-lime-300 focus:ring-2 focus:ring-lime-400/30"
            placeholder="name@example.com"
        >
        @error('email')
            <p class="mt-2 text-sm text-red-300">{{ $message }}</p>
        @enderror
    </div>

    <div>
        <label class="mb-2 block text-sm font-medium text-white/85">Password</label>
        <input
            type="password"
            name="password"
            required
            autocomplete="new-password"
            class="w-full rounded-2xl border border-white/15 bg-slate-800/70 px-4 py-3 text-white placeholder-white/35 outline-none transition focus:border-lime-300 focus:ring-2 focus:ring-lime-400/30"
            placeholder="Create a strong password"
        >
        @error('password')
            <p class="mt-2 text-sm text-red-300">{{ $message }}</p>
        @enderror
    </div>

    <div>
        <label class="mb-2 block text-sm font-medium text-white/85">Confirm Password</label>
        <input
            type="password"
            name="password_confirmation"
            required
            autocomplete="new-password"
            class="w-full rounded-2xl border border-white/15 bg-slate-800/70 px-4 py-3 text-white placeholder-white/35 outline-none transition focus:border-lime-300 focus:ring-2 focus:ring-lime-400/30"
            placeholder="Confirm your password"
        >
    </div>

    <button
        type="submit"
        class="w-full rounded-2xl bg-gradient-to-r from-lime-400 to-emerald-400 py-3.5 font-semibold text-slate-900 shadow-xl shadow-lime-900/25 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-lime-200/60"
    >
        Create Account
    </button>
</form>

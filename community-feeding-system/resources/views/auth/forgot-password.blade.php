<div class="mb-6">
    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300/80">Account Recovery</p>
    <h4 class="mt-2 text-2xl font-bold text-white">Forgot your password?</h4>
    <p class="mt-1 text-sm text-white/65">Enter your email and we will send you a reset link.</p>
</div>

@if (session('status'))
    <div class="mb-4 rounded-xl border border-emerald-300/25 bg-emerald-500/20 px-4 py-3 text-sm text-emerald-100">
        {{ session('status') }}
    </div>
@endif

<form method="POST" action="{{ route('password.email') }}" class="space-y-4">
    @csrf
    <input type="hidden" name="auth" value="forgot">

    <div>
        <label class="mb-2 block text-sm font-medium text-white/85">Email Address</label>
        <input
            type="email"
            name="email"
            value="{{ old('email') }}"
            required
            autofocus
            autocomplete="username"
            class="w-full rounded-2xl border border-white/15 bg-slate-800/70 px-4 py-3 text-white placeholder-white/35 outline-none transition focus:border-lime-300 focus:ring-2 focus:ring-lime-400/30"
            placeholder="name@example.com"
        >
        @error('email')
            <p class="mt-2 text-sm text-red-300">{{ $message }}</p>
        @enderror
    </div>

    <button
        type="submit"
        class="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 py-3.5 font-semibold text-white shadow-xl shadow-emerald-900/35 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-lime-300/40"
    >
        Send Reset Link
    </button>

    <button
        type="button"
        @click="tab = 'login'"
        class="w-full rounded-2xl border border-white/20 bg-white/5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
    >
        Back to Login
    </button>
</form>

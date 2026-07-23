<x-guest-layout>
    <div class="mb-6">
        <h2 class="text-3xl font-bold text-slate-800">Reset Password</h2>
        <p class="text-sm text-slate-500 mt-1">
            Enter your email and choose a new password.
        </p>
    </div>

    <form method="POST" action="{{ route('password.store') }}" class="space-y-5">
        @csrf

        <input type="hidden" name="token" value="{{ $request->route('token') }}">

        <div>
            <x-input-label for="email" :value="__('Email Address')" class="text-slate-700 font-medium" />
            <x-text-input id="email"
                          class="block mt-2 w-full rounded-xl border-slate-300"
                          type="email"
                          name="email"
                          :value="old('email', $request->email)"
                          required
                          autofocus
                          autocomplete="username" />
            <x-input-error :messages="$errors->get('email')" class="mt-2" />
        </div>

        <div>
            <x-input-label for="password" :value="__('New Password')" class="text-slate-700 font-medium" />
            <x-text-input id="password"
                          class="block mt-2 w-full rounded-xl border-slate-300"
                          type="password"
                          name="password"
                          required
                          autocomplete="new-password" />
            <x-input-error :messages="$errors->get('password')" class="mt-2" />
        </div>

        <div>
            <x-input-label for="password_confirmation" :value="__('Confirm Password')" class="text-slate-700 font-medium" />
            <x-text-input id="password_confirmation"
                          class="block mt-2 w-full rounded-xl border-slate-300"
                          type="password"
                          name="password_confirmation"
                          required
                          autocomplete="new-password" />
        </div>

        <div class="pt-2">
            <button type="submit"
                    class="w-full inline-flex justify-center items-center px-4 py-3 bg-lime-500 border border-transparent rounded-xl font-semibold text-sm text-slate-900 hover:bg-lime-400 transition">
                Reset Password
            </button>
        </div>
    </form>
</x-guest-layout>
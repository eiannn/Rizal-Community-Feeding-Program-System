<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        $allowedRoles = collect($roles)
            ->map(fn (string $role) => $this->normalizeRole($role))
            ->filter()
            ->values()
            ->all();

        if (! $user) {
            return redirect()->route('login');
        }

        $actualRole = $this->normalizeRole((string) ($user->role ?? ''));

        if (! in_array($actualRole, $allowedRoles, true)) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => count($allowedRoles) === 1 && $allowedRoles[0] === 'admin'
                        ? 'Access denied. Admin only.'
                        : 'Access denied. Authorized personnel only.',
                ], 403);
            }

            abort(403, count($allowedRoles) === 1 && $allowedRoles[0] === 'admin'
                ? 'Access denied. Admin only.'
                : 'Access denied. Authorized personnel only.');
        }

        return $next($request);
    }

    private function normalizeRole(string $role): string
    {
        return Str::of($role)->trim()->lower()->toString();
    }
}

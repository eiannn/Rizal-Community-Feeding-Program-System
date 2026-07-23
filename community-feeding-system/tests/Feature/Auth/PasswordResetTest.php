<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_password_link_screen_is_disabled(): void
    {
        $response = $this->get('/forgot-password');

        $response->assertRedirect('/?auth=login');
    }

    public function test_reset_password_link_cannot_be_requested(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $response = $this->post('/forgot-password', ['email' => $user->email]);

        $response->assertRedirect(route('home', ['auth' => 'login'], absolute: false));
        Notification::assertNotSentTo($user, ResetPassword::class);
    }

    public function test_reset_password_screen_is_disabled(): void
    {
        $response = $this->get('/reset-password/example-token');

        $response->assertRedirect('/?auth=login');
    }

    public function test_password_cannot_be_reset_with_token(): void
    {
        $user = User::factory()->create();

        $response = $this->post('/reset-password', [
            'token' => 'example-token',
            'email' => $user->email,
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
        ]);

        $response->assertRedirect(route('home', ['auth' => 'login'], absolute: false));
    }
}

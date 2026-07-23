<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered(): void
    {
        $response = $this->get('/login');

        $response->assertStatus(200);
    }

    public function test_users_can_authenticate_using_the_login_screen(): void
    {
        $user = User::factory()->create();

        $response = $this->post('/login', [
            'email_or_username' => $user->email,
            'password' => 'password',
            'role' => 'staff',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('staff.dashboard', absolute: false));
    }

    public function test_admin_users_are_redirected_to_admin_dashboard(): void
    {
        $user = User::factory()->create([
            'role' => 'Admin',
        ]);

        $response = $this->post('/login', [
            'email_or_username' => $user->email,
            'password' => 'password',
            'role' => 'admin',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('admin.dashboard', absolute: false));
    }

    public function test_users_can_authenticate_using_the_json_login_endpoint(): void
    {
        $user = User::factory()->create([
            'role' => 'Staff',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email_or_username' => $user->email,
            'password' => 'password',
            'role' => 'staff',
        ]);

        $this->assertAuthenticated();
        $response
            ->assertOk()
            ->assertJsonPath('redirect_to', route('staff.dashboard', absolute: false))
            ->assertJsonPath('user.role', 'staff');
    }

    public function test_login_rejects_role_mismatch_after_password_is_verified(): void
    {
        $user = User::factory()->create([
            'role' => 'Staff',
        ]);

        $response = $this->post('/login', [
            'email_or_username' => $user->email,
            'password' => 'password',
            'role' => 'admin',
        ]);

        $this->assertGuest();
        $response->assertSessionHasErrors('role');
    }

    public function test_users_can_not_authenticate_with_invalid_password(): void
    {
        $user = User::factory()->create();

        $this->post('/login', [
            'email_or_username' => $user->email,
            'password' => 'wrong-password',
            'role' => 'staff',
        ]);

        $this->assertGuest();
    }

    public function test_staff_users_cannot_access_admin_user_management(): void
    {
        $user = User::factory()->create([
            'role' => 'Staff',
        ]);

        $response = $this->actingAs($user)->get('/users');

        $response->assertForbidden();
    }

    public function test_users_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $this->assertGuest();
        $response->assertRedirect('/');
    }

    public function test_users_can_logout_using_the_json_endpoint(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/auth/logout');

        $this->assertGuest();
        $response
            ->assertOk()
            ->assertJsonPath('redirect_to', route('home', absolute: false));
    }
}

<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_can_be_updated(): void
    {
        $user = User::factory()->create([
            'role' => 'Admin',
        ]);

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->put('/password', [
                'current_password' => 'password',
                'password' => 'NewStrong123!',
                'password_confirmation' => 'NewStrong123!',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $this->assertTrue(Hash::check('NewStrong123!', $user->refresh()->password));
    }

    public function test_correct_password_must_be_provided_to_update_password(): void
    {
        $user = User::factory()->create([
            'role' => 'Admin',
        ]);

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->put('/password', [
                'current_password' => 'wrong-password',
                'password' => 'NewStrong123!',
                'password_confirmation' => 'NewStrong123!',
            ]);

        $response
            ->assertSessionHasErrorsIn('updatePassword', 'current_password')
            ->assertRedirect('/profile');
    }

    public function test_staff_user_cannot_update_password(): void
    {
        $user = User::factory()->create([
            'role' => 'Staff',
        ]);

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->put('/password', [
                'current_password' => 'password',
                'password' => 'NewStrong123!',
                'password_confirmation' => 'NewStrong123!',
            ]);

        $response->assertForbidden();
        $this->assertTrue(Hash::check('password', $user->refresh()->password));
    }
}

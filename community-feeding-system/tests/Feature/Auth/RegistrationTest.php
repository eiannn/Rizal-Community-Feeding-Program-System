<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_registration_screen_is_disabled(): void
    {
        $response = $this->get('/register');

        $response->assertRedirect('/?auth=login');
    }

    public function test_public_registration_post_is_disabled(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@gmail.com',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
        ]);

        $this->assertGuest();
        $response->assertRedirect(route('home', ['auth' => 'login'], absolute: false));
    }
}

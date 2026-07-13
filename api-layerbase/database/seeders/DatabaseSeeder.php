<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->seedAdmin();

        // Catálogo base de categorías (idempotente, seguro también en prod).
        $this->call(CategorySeeder::class);

        // Datos de ejemplo solo fuera de producción.
        if (! app()->isProduction()) {
            User::factory()->create([
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);
        }
    }

    /**
     * Crea/actualiza el admin inicial a partir de variables de entorno.
     * Sin credenciales hardcodeadas: si faltan ADMIN_EMAIL/ADMIN_PASSWORD,
     * simplemente no se crea (idempotente, seguro de re-ejecutar).
     */
    private function seedAdmin(): void
    {
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');

        if (! $email || ! $password) {
            return;
        }

        User::updateOrCreate(
            ['email' => mb_strtolower((string) $email)],
            [
                'name' => env('ADMIN_NAME', 'Admin'),
                'password' => Hash::make((string) $password),
                'role' => UserRole::Admin,
                'email_verified_at' => now(),
            ],
        );
    }
}

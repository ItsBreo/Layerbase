<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('email')->unique();
            // Nullable: los usuarios que entran por OAuth no fijan contraseña propia.
            $table->string('password')->nullable();

            // Rol global en la plataforma. Se indexa porque se filtra por él
            // (paneles de autor/admin). Ver documents/ComponentHub_Modelo_Datos.md.
            $table->enum('role', ['user', 'author', 'admin'])->default('user')->index();

            // Perfil público.
            $table->string('avatar_url', 500)->nullable();
            $table->text('bio')->nullable();
            $table->string('website')->nullable();
            $table->string('github_username', 100)->nullable();
            $table->string('twitter_username', 100)->nullable();

            // Identificadores OAuth (Socialite). Indexados para el lookup de login.
            $table->string('github_oauth_id', 100)->nullable()->index();
            $table->string('google_oauth_id', 100)->nullable()->index();

            // Stripe Connect Express (autores que cobran).
            $table->string('stripe_account_id', 100)->nullable();
            $table->boolean('stripe_onboarded')->default(false);

            // Moderación: un usuario baneado no puede autenticarse.
            $table->boolean('banned')->default(false);
            $table->text('ban_reason')->nullable();

            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
            // Soft delete: preservamos historial financiero/auditoría.
            $table->softDeletes();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};

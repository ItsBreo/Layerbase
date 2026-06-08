#!/bin/sh
set -e

cd /var/www/html

# Instala dependencias si el volumen aún no tiene vendor/.
if [ ! -d vendor ] || [ ! -f vendor/autoload.php ]; then
    echo "[entrypoint] Instalando dependencias de Composer..."
    composer install --no-interaction --prefer-dist --optimize-autoloader
fi

# Crea el .env a partir del ejemplo si no existe.
if [ ! -f .env ] && [ -f .env.example ]; then
    echo "[entrypoint] Creando .env desde .env.example..."
    cp .env.example .env
fi

# Genera APP_KEY si falta.
if ! grep -q "^APP_KEY=base64:" .env 2>/dev/null; then
    echo "[entrypoint] Generando APP_KEY..."
    php artisan key:generate --force
fi

# Permisos de storage y cache.
mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rw storage bootstrap/cache

# Migraciones (idempotente).
echo "[entrypoint] Ejecutando migraciones..."
php artisan migrate --force || true

exec "$@"

#!/bin/sh
# -----------------------------------------------------------------------------
# Arranque del contenedor de producción.
#
# Diferencia deliberada con `docker/php/entrypoint.sh` (desarrollo): aquí NADA
# se arregla solo. El de desarrollo instala dependencias, copia el .env y hace
# `migrate --force || true` — ese `|| true` deja arrancar un contenedor con la
# base a medio migrar, que es exactamente el fallo que no se puede permitir en
# producción. Aquí cada paso que falla detiene el arranque.
# -----------------------------------------------------------------------------
set -eu

cd /var/www/html

PORT="${PORT:-8080}"
NGINX_MAX_BODY="${NGINX_MAX_BODY:-12M}"
export PORT NGINX_MAX_BODY

# --- Comprobaciones que fallan pronto y en voz alta -------------------------
faltan=''
for var in APP_KEY DB_HOST DB_DATABASE DB_USERNAME; do
    eval "valor=\${$var:-}"
    [ -z "$valor" ] && faltan="$faltan $var"
done

if [ -n "$faltan" ]; then
    echo "[entrypoint] ERROR: faltan variables de entorno obligatorias:$faltan" >&2
    echo "[entrypoint] El contenedor no arranca sin ellas." >&2
    exit 1
fi

if [ "${APP_DEBUG:-false}" = "true" ]; then
    echo "[entrypoint] AVISO: APP_DEBUG=true en producción expone trazas y variables de entorno." >&2
fi

# --- Nginx: el puerto solo se conoce en ejecución ---------------------------
# Lista explícita de variables: si se dejara vacía, envsubst se comería las
# `$uri`, `$query_string` y demás variables propias de Nginx.
envsubst '${PORT} ${NGINX_MAX_BODY}' \
    < /etc/nginx/templates/default.conf.template \
    > /etc/nginx/http.d/default.conf

echo "[entrypoint] Nginx escuchará en el puerto ${PORT}."

# --- Cachés de Laravel ------------------------------------------------------
# Se generan aquí y no al construir la imagen: `config:cache` congela los
# valores del entorno, y en App Runner el entorno llega en ejecución. Cachearlo
# en build dejaría dentro los valores del build, que están vacíos.
php artisan config:cache
php artisan route:cache
php artisan view:cache

# --- Migraciones ------------------------------------------------------------
# Apagadas por defecto: App Runner puede levantar varias instancias a la vez y
# competirían por migrar. La vía recomendada es un job aparte (ver
# `docker/production/README.md`), que se ejecuta una sola vez y no compite con
# nadie. Con RUN_MIGRATIONS=true se ejecutan aquí, y si fallan el contenedor NO
# arranca.
#
# Sin `--isolated` a propósito: ese flag pide un bloqueo atómico a la caché, y
# la caché es la base de datos (CACHE_STORE=database). En un despliegue nuevo la
# tabla `cache_locks` todavía no existe —la crea la propia migración que se
# intenta ejecutar—, así que `--isolated` fallaría justo en el primer arranque,
# que es cuando más falta hace. Si se usa esta vía, hazlo con max-instances=1.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    echo "[entrypoint] Ejecutando migraciones..."
    php artisan migrate --force
fi

echo "[entrypoint] Listo. Cediendo el control a supervisord."
exec "$@"

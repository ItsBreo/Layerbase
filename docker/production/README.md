# Imagen de producción

Un solo contenedor con Nginx + PHP-FPM, pensado para App Runner. **No sustituye a
`docker/php/Dockerfile`**: aquel es el de desarrollo y sigue siendo el que usa
`docker-compose.yml`.

## Diferencias con el de desarrollo

| | Desarrollo | Producción |
| --- | --- | --- |
| Topología | PHP-FPM y Nginx en contenedores separados | Uno solo, con Supervisor |
| Código | volumen montado | copiado dentro de la imagen |
| Dependencias | `composer install` en cada arranque | en la construcción, sin `--dev` |
| Puerto | Nginx fijo en el 80 | `$PORT`, que inyecta App Runner |
| Migraciones | `migrate --force \|\| true` | apagadas por defecto (ver abajo) |
| Fallos de arranque | se ignoran y sigue | detienen el contenedor |

## Construir y probar en local

```sh
docker build -f docker/production/Dockerfile -t layerbase-api:prod .

docker run --rm --network layerbase_layerbase -p 8099:9090 \
  -e PORT=9090 \
  -e APP_KEY="base64:…" \
  -e APP_ENV=production -e APP_DEBUG=false \
  -e DB_CONNECTION=pgsql -e DB_HOST=db -e DB_PORT=5432 \
  -e DB_DATABASE=layerbase -e DB_USERNAME=layerbase -e DB_PASSWORD=… \
  -e CACHE_STORE=database -e SESSION_DRIVER=database \
  layerbase-api:prod

curl -i http://localhost:8099/up      # 200
```

## Variables

Obligatorias, y sin ellas el contenedor **no arranca**: `APP_KEY`, `DB_HOST`,
`DB_DATABASE`, `DB_USERNAME`.

Propias de esta imagen:

| Variable | Por defecto | Para qué |
| --- | --- | --- |
| `PORT` | `8080` | Puerto de Nginx. Lo inyecta App Runner |
| `NGINX_MAX_BODY` | `12M` | `client_max_body_size`. Por encima de los 8M de PHP |
| `RUN_MIGRATIONS` | `false` | Migrar al arrancar. Ver el aviso |

## Migraciones

Apagadas a propósito. App Runner puede levantar varias instancias a la vez y
competirían por migrar la misma base de datos. La vía recomendada es ejecutarlas
una sola vez, aparte:

```sh
cd api-layerbase
# Con las variables de la RDS exportadas o en un .env temporal:
php artisan migrate --force
```

App Runner no tiene el concepto de "job", así que se lanzan desde tu máquina
contra la base de datos, que es accesible. Detalle completo en
[DESPLIEGUE.md](DESPLIEGUE.md).

Con `RUN_MIGRATIONS=true` se ejecutan en el arranque y, si fallan, el contenedor
no llega a servir. Solo con el servicio limitado a UNA instancia.

**Requisito de la base de datos:** desde la búsqueda por texto completo, las
migraciones ejecutan `CREATE EXTENSION unaccent` y `pg_trgm`. Un proveedor que no
lo permita hace fallar el despliegue en la primera migración.

## El admin inicial

`ADMIN_EMAIL` y `ADMIN_PASSWORD` alimentan `DatabaseSeeder`. Sin ellas, migras y
te quedas sin ninguna cuenta de administrador:

```sh
php artisan db:seed --force
```

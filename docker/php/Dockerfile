FROM php:8.3-fpm

# Argumentos para alinear el usuario del contenedor con el del host (evita
# problemas de permisos en los volúmenes montados, sobre todo en Linux).
ARG UID=1000
ARG GID=1000

# Dependencias del sistema y extensiones de PHP que necesita Laravel 13.
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libzip-dev \
        libicu-dev \
        libpng-dev \
        libjpeg-dev \
        libfreetype6-dev \
        libonig-dev \
        libpq-dev \
        sqlite3 \
        libsqlite3-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo \
        pdo_pgsql \
        pgsql \
        pdo_sqlite \
        pdo_mysql \
        mbstring \
        bcmath \
        intl \
        zip \
        gd \
        exif \
        pcntl \
        opcache \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Composer (copiado desde la imagen oficial).
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Ajusta el usuario www-data al UID/GID del host.
RUN usermod -u "${UID}" www-data && groupmod -g "${GID}" www-data

WORKDIR /var/www/html

COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

ENTRYPOINT ["entrypoint"]
CMD ["php-fpm"]

# Despliegue de preproducción en AWS

Objetivo: que Layerbase esté en una URL y se pueda entrar, con datos de prueba.

| Pieza | Servicio | Capa gratuita (cuenta nueva, 12 meses) |
| --- | --- | --- |
| Backend | **App Runner** | No tiene. ~5-8 $/mes con 0,5 vCPU / 1 GB |
| Base de datos | **RDS PostgreSQL** | 750 h/mes de `db.t4g.micro` + 20 GB |
| Archivos | **S3** (dos buckets) | 5 GB |
| Frontend | **S3 + CloudFront** | CloudFront: 1 TB/mes, y esta es **perpetua** |
| Imagen | **ECR** | 500 MB privados |

**Aviso de coste:** la capa gratuita de AWS dura **12 meses**, no siempre. App
Runner no baja a cero cuando no hay tráfico: factura aunque no entre nadie. Para
una beta cerrada es asumible, pero conviene tenerlo apuntado.

**Fuera de alcance mientras sea beta cerrada:** dominio propio, correo
transaccional (el email se verifica al entrar), texto legal redactado y Stripe.

---

## 0. Antes de nada

```sh
brew install awscli
aws configure          # clave, secreto, región (eu-west-1), formato json
aws sts get-caller-identity
```

Conviene **no usar la cuenta raíz**: crea un usuario IAM con acceso programático
y permisos de administrador para el despliegue.

---

## 1. Los dos buckets de S3

Son **dos**, no uno con dos carpetas. El privado guarda los archivos de
componente y se sirve solo por URL firmada; el público guarda los avatares y
necesita URL permanente. Compartir bucket haría que el dominio público sirviera
también el código fuente de los componentes de pago, saltándose la policy.

```sh
REGION=eu-west-1
SUFIJO=$(openssl rand -hex 4)      # los nombres de bucket son globales

aws s3api create-bucket --bucket "layerbase-files-${SUFIJO}" \
  --region "$REGION" --create-bucket-configuration LocationConstraint="$REGION"

aws s3api create-bucket --bucket "layerbase-avatars-${SUFIJO}" \
  --region "$REGION" --create-bucket-configuration LocationConstraint="$REGION"
```

El de archivos se queda con el bloqueo de acceso público que AWS pone por
defecto: **no se toca**. El de avatares tiene que ser legible:

```sh
aws s3api put-public-access-block --bucket "layerbase-avatars-${SUFIJO}" \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

aws s3api put-bucket-policy --bucket "layerbase-avatars-${SUFIJO}" --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "LecturaPublicaDeAvatares",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::layerbase-avatars-'"${SUFIJO}"'/*"
  }]
}'
```

Y CORS en el privado, porque el navegador descarga desde ahí con URL firmada:

```sh
aws s3api put-bucket-cors --bucket "layerbase-files-${SUFIJO}" --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}'
```

Después, un usuario IAM solo para la aplicación, con permiso sobre esos dos
buckets y nada más. De ahí salen `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`.

---

## 2. La base de datos

```sh
aws rds create-db-instance \
  --db-instance-identifier layerbase \
  --db-instance-class db.t4g.micro \
  --engine postgres --engine-version 16 \
  --allocated-storage 20 \
  --master-username layerbase \
  --master-user-password '<contraseña larga y aleatoria>' \
  --db-name layerbase \
  --publicly-accessible \
  --backup-retention-period 7 \
  --region "$REGION"
```

**Por qué `--publicly-accessible`:** App Runner solo llega a una RDS privada a
través de un conector de VPC, y en cuanto se le pone uno, TODA su salida va por
la VPC — incluidas las llamadas a GitHub y Google del login OAuth. Eso obliga a
un NAT Gateway, que son unos 32 $/mes y se lleva por delante la premisa de que
esto salga gratis.

La exposición es **la misma que ya habíamos aceptado con Neon**: un endpoint
público de PostgreSQL con TLS y contraseña. No es un empeoramiento del plan
anterior. Lo que sí hay que hacer es contraseña larga y aleatoria, y restringir
el grupo de seguridad al puerto 5432.

### Requisito duro

Las migraciones ejecutan `CREATE EXTENSION unaccent` y `pg_trgm`. RDS PostgreSQL
los trae. Se confirma en cuanto la instancia esté lista:

```sh
psql "postgres://layerbase:<pass>@<endpoint>:5432/layerbase" \
  -c 'CREATE EXTENSION IF NOT EXISTS unaccent; CREATE EXTENSION IF NOT EXISTS pg_trgm;'
```

---

## 3. Construir y subir la imagen

```sh
CUENTA=$(aws sts get-caller-identity --query Account --output text)
REPO="${CUENTA}.dkr.ecr.${REGION}.amazonaws.com/layerbase-api"

aws ecr create-repository --repository-name layerbase-api --region "$REGION"
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "${CUENTA}.dkr.ecr.${REGION}.amazonaws.com"

IMAGEN="${REPO}:$(git rev-parse --short HEAD)"

# --platform es obligatorio desde un Mac con Apple Silicon: App Runner es amd64
# y una imagen arm64 arranca y muere sin un error que lo explique.
docker build --platform linux/amd64 -f docker/production/Dockerfile -t "$IMAGEN" .
docker push "$IMAGEN"
```

---

## 4. Migrar y sembrar

App Runner no tiene el concepto de "job", así que las migraciones se lanzan
desde tu máquina contra la RDS — que se puede porque es accesible. Una sola vez,
antes de que el servicio sirva nada.

```sh
cd api-layerbase
# Con un .env temporal apuntando a la RDS, o exportando las variables:
php artisan migrate --force
php artisan db:seed --force        # crea el admin a partir de ADMIN_EMAIL/ADMIN_PASSWORD
```

**Sin el seed no hay ninguna cuenta de administrador**, y aprobar es lo único
que publica: la plataforma se queda sin forma de sacar un componente adelante.

> No pongas `RUN_MIGRATIONS=true` en App Runner. Cada instancia nueva que
> levante volvería a migrar, y pueden solaparse.

---

## 5. Desplegar el backend

Los secretos van a Secrets Manager, no en claro en la configuración del
servicio. `APP_KEY` se genera una vez y **no se cambia nunca**: cambiarla
invalida todo lo cifrado con ella.

```sh
php artisan key:generate --show      # anota el valor

for s in APP_KEY DB_PASSWORD AWS_SECRET_ACCESS_KEY; do
  aws secretsmanager create-secret --name "layerbase/$s" --region "$REGION"
done
```

Luego se crea el servicio de App Runner apuntando a la imagen de ECR, con:

- **Puerto:** `8080` (el `ENV PORT` de la imagen; App Runner lo inyecta igual).
- **Health check:** HTTP, ruta `/up`.
- **CPU/memoria:** 0,5 vCPU / 1 GB sobra para la beta.
- **Variables de entorno:**

```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://<pendiente>
FRONTEND_URL=https://<pendiente>
CORS_ALLOWED_ORIGINS=https://<pendiente>
DB_CONNECTION=pgsql
DB_HOST=<endpoint de RDS>
DB_PORT=5432
DB_DATABASE=layerbase
DB_USERNAME=layerbase
CACHE_STORE=database
SESSION_DRIVER=database
QUEUE_CONNECTION=database
COMPONENTS_FILES_DISK=s3
PROFILE_AVATAR_DISK=s3_public
AWS_DEFAULT_REGION=eu-west-1
AWS_BUCKET=layerbase-files-<sufijo>
AWS_PUBLIC_BUCKET=layerbase-avatars-<sufijo>
AWS_PUBLIC_URL=https://layerbase-avatars-<sufijo>.s3.eu-west-1.amazonaws.com
AWS_ACCESS_KEY_ID=<del usuario IAM de la app>
MAIL_MAILER=log
```

`APP_URL`, `FRONTEND_URL` y `CORS_ALLOWED_ORIGINS` son un huevo y la gallina: no
se conocen hasta tener las dos URLs. Se despliega con un valor cualquiera, se
anota la URL que devuelve App Runner, se despliega el frontend y **se vuelve
aquí** a corregirlas.

> `AWS_ENDPOINT` se deja **vacío**. Solo hace falta con almacenamiento
> compatible que no sea AWS (R2, MinIO); si se rellena por error, el SDK intenta
> hablar con un endpoint que no existe.

Comprobación:

```sh
curl -i https://<id>.<region>.awsapprunner.com/up      # 200
curl -s https://<id>.<region>.awsapprunner.com/api/components | head -c 200
```

---

## 6. Desplegar el frontend

```sh
cd frontend-layerbase
VITE_API_URL=https://<id>.<region>.awsapprunner.com npm run build

aws s3api create-bucket --bucket "layerbase-web-${SUFIJO}" \
  --region "$REGION" --create-bucket-configuration LocationConstraint="$REGION"

aws s3 sync dist/ "s3://layerbase-web-${SUFIJO}/" --delete
```

`VITE_API_URL` es de **build**: Vite la incrusta al compilar. Cambiarla obliga a
reconstruir y volver a sincronizar.

Delante va una distribución de CloudFront con el bucket como origen y **OAC**
(el bucket se queda privado; solo CloudFront lo lee).

### La regla que hace funcionar las rutas internas

En la distribución, dos *custom error responses*:

| Código del origen | Respuesta | Página |
| --- | --- | --- |
| 403 | **200** | `/index.html` |
| 404 | **200** | `/index.html` |

Sin esto, entrar directo a `/components/mi-componente` o recargar da error: en
el bucket solo existe `index.html`. `public/_redirects` **no sirve aquí** — ese
formato lo entienden Cloudflare Pages y Netlify, no CloudFront.

---

## 7. Cerrar el círculo

1. Volver al paso 5 y poner `APP_URL`, `FRONTEND_URL` y `CORS_ALLOWED_ORIGINS`
   con el dominio real de CloudFront.
2. En GitHub y Google, añadir las URLs de callback de OAuth:
   `https://<backend>/api/auth/github/callback` y `.../google/callback`.

### Repaso final

- [ ] `/up` responde 200
- [ ] El listado de componentes carga en el navegador
- [ ] Registro y login funcionan
- [ ] Login con GitHub y con Google funcionan
- [ ] Se puede subir un componente y **descargarlo** (prueba que S3 va)
- [ ] Se puede subir un avatar y **se ve** (prueba el bucket público)
- [ ] Un archivo de 3 MB sube sin error (prueba el límite de PHP)
- [ ] Entrar directo a `/components/<slug>` y recargar no da 404
- [ ] El admin del paso 4 puede entrar en `/admin` y aprobar
- [ ] `APP_DEBUG=false`: una ruta inexistente no enseña traza

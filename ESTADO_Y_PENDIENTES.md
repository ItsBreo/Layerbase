# Layerbase — estado, vulnerabilidades y pendientes

> Auditoría del 2026-08-16, sobre `feature/panel-admin-moderacion` (commit `99d593b`).
> Suite: 66 tests en verde. Se revisó código real, no documentación.
>
> Orden de trabajo acordado: **funcional primero, estética después**. El módulo de
> suscripciones va **al final** de todo.

---

## 0. Ya resuelto

| # | Hallazgo | Commit |
| --- | --- | --- |
| 1.1 | Apropiación de cuenta vía OAuth + registro sin verificar | bloque 1 |
| 1.2 | OAuth sin validación de `state` (CSRF) | bloque 1 |
| 1.3 | El disco `public` desactivaba la protección de descargas | bloque 1 |
| — | Fuga del email de los autores en el listado público | `99d593b` |
| — | Los errores de OAuth redirigían a `/login?error=` y nadie leía el parámetro | bloque 1 |
| 2.1 | El contador de descargas nunca subía | bloque 2 |
| 2.3 | Los ficheros no se borraban nunca (no había vía de limpieza) | bloque 2 |
| 2.2 + 3.2 | `stats_public` era configuración muerta: no había perfil público | bloque 3 |
| 3.1 | Páginas legales: estructura y rutas (texto pendiente de redactar) | bloque 4 |
| — | Verificación de email (no existía; era requisito de 1.1) | bloque 1 |
| 1.4 | Un admin podía aprobar su propio componente | bloque 6 |
| — | Sin CI: nada ejecutaba la suite automáticamente | bloque 6 |
| — | 3 errores + 2 avisos de ESLint | bloque 6 |

**Las vulnerabilidades están todas cerradas.** El resto sigue abierto.

### Cómo quedó 1.4

La regla es **"nadie revisa su propio trabajo mientras haya otra persona que
pueda hacerlo"**, y se ajusta sola: con un único administrador puede aprobar
los suyos (prohibirlo dejaría la plataforma sin forma de publicar nada), y en
cuanto entra un segundo admin activo deja de poder. Un admin suspendido no
cuenta como revisor disponible: no puede entrar, así que bloquearía la cola sin
resolverla. Vive en `ComponentPolicy::moderate` + `User::hasOtherActiveAdmins`.

---

## 1. Vulnerabilidades

### 1.1 CRÍTICA — Apropiación de cuenta vía OAuth + registro sin verificar

**Dónde:** `app/Http/Controllers/Api/Auth/SocialAuthController.php` → `upsertUser()`, y
`RegisterController` (no envía verificación).

`upsertUser()` vincula la identidad social a una cuenta local **buscando por email**, sin
comprobar que ese email esté verificado en ninguno de los dos lados:

```php
$user = User::where($oauthColumn, $providerId)->first()
    ?? User::where('email', mb_strtolower((string) $socialUser->getEmail()))->first();
```

En paralelo, `User` **no implementa `MustVerifyEmail`** y el registro no envía nada: hoy
cualquiera se registra con el email de otro. Comprobado en la BD real: las tres cuentas de
verdad tienen `email_verified_at = NULL`.

**Cadena de ataque:** el atacante registra una cuenta con `victima@gmail.com` y una
contraseña que él elige. Cuando la víctima entra por "Iniciar sesión con Google", la
búsqueda por email encuentra **la cuenta del atacante** y le engancha la identidad de
Google de la víctima. A partir de ahí la víctima está usando una cuenta cuya contraseña
conoce el atacante, y este entra cuando quiera.

**Arreglo:** no vincular nunca por email a una cuenta local con contraseña y sin verificar.
Vincular solo si el email está verificado en ambos lados; si no, o se crea cuenta aparte o
se exige confirmar la propiedad del email. Y añadir verificación de email al registro.

### 1.2 ALTA — OAuth sin validación de `state` (CSRF de inicio de sesión)

**Dónde:** `SocialAuthController::redirect()` y `callback()`, ambos con `->stateless()`.

El comentario dice que el `state` "lo valida el propio proveedor vía el flujo OAuth". **Eso
no es así**: `state` es justamente la protección CSRF del lado del cliente; el proveedor lo
devuelve tal cual, no lo verifica por ti. Sin él, un atacante puede hacer que la víctima
complete un flujo OAuth con el código de autorización del ATACANTE, dejando a la víctima
con sesión iniciada en la cuenta del atacante — y todo lo que suba o pague desde ahí va a
parar a esa cuenta.

**Arreglo:** `state` firmado propio (la API no tiene sesión, así que no vale el de
Socialite): generarlo en `redirect()`, guardarlo en cache con TTL corto y validarlo en
`callback()`.

### 1.3 MEDIA (latente) — El disco `public` desactiva toda la protección de descargas

**Dónde:** `config/components.php` y `app/Models/ComponentFile.php::temporaryUrl()`.

Hoy **no es explotable**: el disco es `local` con `serve => true`, y la URL sale firmada y
con caducidad. Verificado contra el entorno real.

El problema es que `config/components.php` recomienda por escrito el disco `public` como
alternativa de desarrollo. Con `public`, `temporaryUrl()` lanza excepción, cae al `catch` y
**devuelve una URL pública, permanente y sin firmar** (`/storage/...`) que nginx sirve
directamente. En un componente **de pago** eso significa que el código fuente — que ES el
producto — queda accesible sin pasar por la policy, para siempre y para cualquiera.

**Arreglo:** que el `catch` no degrade en silencio. Para el `source` (tipo protegido) debe
fallar de forma ruidosa en vez de devolver una URL permanente, y la config debe dejar de
sugerir `public`.

### 1.4 BAJA — Un admin puede aprobar y publicar su propio componente

**Dónde:** `app/Policies/ComponentPolicy.php::before()`, que concede todo a los admin.

Con un único admin (hoy) es razonable. Cuando entren moderadores, deja de serlo: quien
publica no debería poder ser quien revisa. Requiere tocar `before()`, así que no se cambió
por iniciativa propia.

### 1.5 Lo que SÍ está bien (revisado, sin hallazgos)

- **Reset de contraseña**: respuesta idéntica exista o no el email (no permite enumerar
  cuentas) y revoca todos los tokens al cambiarla.
- **Mass assignment**: `role`, `banned`, `ban_reason`, `status`, `published_at`, `user_id`
  y los `stripe_*` están fuera de `$fillable` y solo se asignan desde código de confianza.
- **Rate limiting**: `auth` a 6/min por (email + IP), `api` a 60/min.
- **CORS**: orígenes por entorno, nunca `*` con credenciales.
- **Búsquedas**: se escapan `%` y `_` antes del `LIKE`.
- **Subidas**: límite real de 5 MB, nombre en disco aleatorio, MIME por contenido para zip
  e imagen.

---

## 2. Bugs funcionales

### 2.1 El contador de descargas nunca sube

`ComponentFileController::download()` tiene un `TODO` en lugar del incremento. `downloads`
se muestra en las tarjetas, en la ficha y en el resumen de autor, y **siempre vale lo que
dejó el seeder**. Es una métrica visible que miente.

### 2.2 `stats_public` no lo puede ver nadie

Existe la columna, el conmutador en el dashboard y la lógica en `UserResource` para enseñar
el resumen a terceros… pero **no hay página ni endpoint de perfil público**. No existe
`GET /users/{id}` ni ruta `/users/:id` en el frontend. Hoy el ajuste no hace absolutamente
nada: es configuración muerta.

### 2.3 Los ficheros no se borran al eliminar un componente

`ComponentController::destroy()` hace soft delete del componente, pero los ficheros siguen
en disco y en `component_files`. Con S3/R2 eso es dinero cada mes por objetos que ya no
referencia nadie.

### 2.4 `hasPurchases()` devuelve siempre `false`

Está encapsulado a propósito hasta que exista `purchases`, pero significa que **hoy un
componente con compras se borraría** en vez de despublicarse. Inofensivo mientras no haya
pagos; peligroso en cuanto los haya. Va atado al módulo de compras.

---

## 3. Páginas que faltan

### 3.1 Legales — bloquean el lanzamiento

Los cuatro enlaces del footer apuntan a `#`: **aviso legal, privacidad, facturación y
cookies**. Un marketplace que va a cobrar y que opera con datos personales en la UE no
puede salir sin ellas.

### 3.2 Perfil público de autor

No existe. Es lo que da sentido a `stats_public` (2.2) y lo que convierte a un autor en algo
más que un nombre bajo una tarjeta. Necesita endpoint público + ruta `/users/:slug`.

### 3.3 Recursos

Documentación, "cómo subir un componente" y buenas prácticas: los tres a `#`. Menos
urgentes que las legales, pero son los que enseñan a publicar.

### 3.4 Panel de admin — secciones que faltan

- **Métricas / resumen**: usuarios por rol, componentes por estado, descargas totales.
- **Catálogo**: CRUD de categorías y limpieza de tags huérfanos. Hoy las categorías solo se
  tocan por seeder, y los tags los crean los autores sin ningún control.

---

## 4. Módulos sin empezar

| Módulo | Estado | Nota |
| --- | --- | --- |
| **Verificación de email** | No existe | Es parte del arreglo de 1.1, no un extra |
| **Compras / Stripe** | `stripe/stripe-php` instalado, **cero usos** | Sin esto los componentes de pago no se pueden comprar |
| **Reviews** | Sin tabla ni modelo | `rating_avg` y `rating_count` existen y nadie los escribe |
| **Búsqueda Meilisearch** | Scout instalado, **cero usos** | Los filtros son SQL puro |
| **Notificaciones** | Sin tabla | 3 `TODO` esperándola en la moderación |
| **`component_views`** | Sin tabla | Sin analítica de visitas |
| **Observers** | Ninguno | Los contadores desnormalizados no los mantiene nadie |
| **Suscripciones** | Sin empezar | **Aplazado al final por decisión propia** |

---

## 5. Deuda técnica

- **Media Library instalada y sin usar.** `ComponentFileService` va con `Storage::disk()`
  directo. O se adopta o se quita de `composer.json`.
- **El placeholder de degradado usa color crudo** (`src/studio/placeholder.ts`): deriva un
  HSL del hash del slug, fuera de la paleta de marca. *(Estético — aplazado.)*
- **Sin captura automática de portada.** Sin imagen, la rejilla cae al placeholder; hace
  falta el job con Chromium headless.
- **3 errores de ESLint preexistentes** en `src/auth/` (`ui.tsx`, `AuthContext.tsx`,
  `Register.tsx`, `ResetPassword.tsx`): reglas del React Compiler.
- **Bundle de 1,4 MB** sin code splitting.
- **`.gitignore` esconde toda la documentación del proyecto:** `CLAUDE.md` (línea 2) y
  `/documents` (línea 3). Nada de lo que vive ahí se comparte con el equipo ni existe fuera
  de tu máquina — incluidos el modelo de datos, la hoja de ruta y el design system. Por eso
  este fichero está en la **raíz** y no en `documents/`. Merece una decisión consciente: si
  se ignoró `/documents` por el peso de los `.docx` y `.html`, se puede ignorar por
  extensión y dejar el Markdown dentro.
- **Sin CI.** Nada ejecuta la suite automáticamente.

---

## 6. Lo que queda, repartido por sesiones

Ordenado de menos a más trabajo. Cada sesión es una unidad cerrada: se puede
parar al final de cualquiera sin dejar nada a medias.

---

### Sesión A — Métricas del panel + `component_views`

*Media sesión. La más barata de las que quedan.*

- Portada de `/admin` con usuarios por rol, componentes por estado, descargas
  totales y altas recientes.
- Tabla `component_views` (agregada por día vía upsert) y registro de visitas en
  la ficha pública.

**Por qué juntas:** las métricas sin visitas se quedan a medias, y `component_views`
sin dónde enseñarse no sirve de nada.

**Reutiliza:** el patrón `counts` ya escrito dos veces —
`Admin\ModerationController::counts` y `Admin\UserController::counts` — y los
componentes `StatCard`/`AdminNav` de `src/pages/AdminUsers.tsx`.

---

### Sesión B — Code splitting + catálogo del panel

*Media sesión.*

- Bundle: 1,4 MB en una pieza. Las rutas de `App.tsx` son candidatas directas a
  `lazy()`; Monaco y Sandpack son los pesos gordos y ya van en rutas separadas.
- CRUD de categorías y limpieza de tags huérfanos. Borrar una categoría con
  componentes vivos tiene que estar bloqueado (la FK es `restrictOnDelete`, así
  que hay que dar un error legible en vez de un 500).

---

### Sesión C — Reviews + Observers

*Una sesión. La primera que toca modelo de datos de verdad.*

- Tabla `reviews`, modelo, policy (solo quien tiene el componente puede
  reseñarlo) y endpoints.
- **Observer que mantenga `rating_avg` y `rating_count`.**

**Por qué juntas:** un observer sin nada que escribir no sirve, y las reviews sin
observer dejan los contadores desactualizados. Y hoy `rating_avg` se muestra en
tarjetas y ficha sin que nadie lo escriba nunca — exactamente el mismo problema
que tenía `downloads` antes del bloque 2.

**Ojo:** el Observer que salga de aquí lo va a necesitar también el módulo de
compras, así que conviene dejarlo genérico.

---

### Sesión D — Recursos (documentación)

*Una sesión, sobre todo de escritura.*

Documentación, "cómo subir un componente" y buenas prácticas: los tres enlaces
del footer siguen a `#`. A diferencia de las legales, **este contenido sí se
puede escribir desde el propio código**: el flujo real de publicación, los
formatos aceptados, el límite de 5 MB, cómo funciona el preview de Sandpack.

---

### Sesión E — Notificaciones

*Una sesión.*

Tabla `notifications` y emails. Desbloquea los tres `TODO` que esperan en
`ComponentStateController`: hoy **nadie avisa al autor de que le han aprobado o
rechazado un componente**, ni a los admin de que hay algo en la cola.

El correo ya funciona (driver `log` en dev, mismo camino que la verificación de
email del bloque 1).

---

### Sesión F — Búsqueda con Meilisearch

*Una sesión, con infraestructura.*

Scout está en `composer.json` con cero usos y los filtros de
`ComponentController::index` son SQL puro. **Meilisearch no está en
`docker-compose.yml`**, así que hay que levantarlo primero.

---

### Sesión G+ — Compras / Stripe

*Varias sesiones. El módulo grande.*

Checkout, webhooks, tabla `purchases`, y Connect Express para pagar a los
autores. Arrastra consigo:

- **2.4** (`hasPurchases()` devuelve siempre `false`, así que hoy un componente
  comprado se borraría en vez de despublicarse).
- `userCanAccessSource()`, que tiene el mismo `TODO` esperando la tabla.
- Decidir la **comisión**: la hoja de ruta dice 10% / 5% y el modelo de datos
  dice 15%. Sigue sin resolverse.

---

### Sin fecha

- **Captura automática de portada** (job con Chromium headless): hoy, sin imagen,
  la rejilla cae al placeholder.
- **Media Library**: instalada y sin usar. O se adopta o se quita de
  `composer.json`.
- **Placeholder de degradado** fuera de la paleta de marca. *(Estético.)*
- **Suscripciones** — al final de todo, por decisión propia.

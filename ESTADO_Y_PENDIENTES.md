# Layerbase — estado, vulnerabilidades y pendientes

> Auditoría inicial del 2026-08-16 sobre `feature/panel-admin-moderacion` (commit
> `99d593b`), con 66 tests. **Vivo: última actualización 2026-08-22, 183 tests en
> verde.** Se revisa código real, no documentación.
>
> Orden de trabajo acordado: **funcional primero, estética después**. El módulo de
> suscripciones va **al final** de todo, y la pantalla de preferencias justo antes.
>
> **Proveedor de despliegue: AWS** (decidido el 2026-08-22, cuenta nueva con capa
> gratuita de 12 meses). Sustituye al plan anterior de Cloud Run + Cloudflare.
>
> Cómo leerlo: la sección **0** es lo cerrado, la **6** es lo que queda repartido
> por sesiones. Las secciones 1-5 son el detalle del hallazgo original y se dejan
> aunque estén resueltas, porque explican **por qué** algo se hizo como se hizo.

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
| — | Las tablas de los README se pintaban como texto con barras (faltaba `remark-gfm`) | bloque 7 |
| 3.3 | Recursos del footer: las tres páginas, escritas | bloque 7 |
| — | Sin CI: nada ejecutaba la suite automáticamente | bloque 6 |
| — | 3 errores + 2 avisos de ESLint | bloque 6 |
| — | La URL firmada apuntaba al host interno de Docker: descargas y preview rotos en el navegador | bloque 7 |
| — | El formulario de edición nunca cargaba el código ni el README guardados | bloque 7 |
| 3.4 (mitad) | Métricas del panel de admin | sesión A |
| — | `component_views`: sin analítica de visitas | sesión A |
| 3.4 | Catálogo del panel: CRUD de categorías y limpieza de etiquetas | sesión B |
| — | `components_count` de categorías y etiquetas valía 0: nadie lo escribía | sesión B |
| — | Reviews: no existían (tabla, endpoints, moderación y UI) | sesión C |
| — | `rating_avg` y `rating_count` no los escribía nadie | sesión C |
| — | Correo real en desarrollo (Mailpit) | sesión D |
| — | Notificaciones in-app: los 3 `TODO` de moderación, cerrados | sesión E |
| 2.5 | Multi-archivo: el ZIP admitía un solo fichero y sin comprimir | sesión F |
| 4.x | Búsqueda: `LIKE '%…%'` sustituido por texto completo de PostgreSQL | sesión G |
| — | La suite corría en SQLite y no en el motor real | sesión G |
| — | Las búsquedas por nombre distinguían mayúsculas en producción (`LIKE` vs `ILIKE`) | sesión G |
| — | 19 avisos de `composer audit`, uno **crítico** (`jmespath`, inyección de código) | sesión I.1 |
| — | 6 vulnerabilidades de npm, 3 altas, en `react-router` (open redirect y DoS) | sesión I.1 |
| — | **`upload_max_filesize` valía 2M**: las subidas de 2-5 MB fallaban con un error que no lo explicaba | sesión I.2 |
| — | No había imagen desplegable: PHP-FPM y Nginx separados, código por volumen, `migrate \|\| true` | sesión I.2 |
| — | El avatar recortaba la URL SIEMPRE: en almacenamiento remoto perdía el dominio | sesión I.3 |
| — | `oauthRedirectUrl()` tenía `/api` a fuego, y es una navegación del navegador, no axios | sesión I.4 |
| — | Sin fallback de SPA: recargar una ruta interna daría 404 desplegado | sesión I.4 |

**Las vulnerabilidades están todas cerradas.** El resto sigue abierto.

### Cambio deliberado en 1.1: el email se verifica al entrar

*2026-08-19.* Sin dominio propio no hay forma de mandar correo a direcciones
ajenas, y como publicar exige email verificado, la plataforma quedaba
inutilizable en preproducción. Decisión: **el email se da por verificado al
registrarse y al iniciar sesión**.

Eso **anula** una de las dos mitades del arreglo de 1.1. `email_verified_at` ya
no demuestra que el correo sea de quien lo registró — solo dice que la cuenta se
ha usado. Así que la otra mitad tuvo que endurecerse para compensar:

- **OAuth ya NO vincula identidades por email, en ningún caso.** Antes lo hacía
  si la cuenta local estaba verificada; con verificación automática esa condición
  no protegía nada. Ahora la única vía es el identificador de proveedor, que lo
  emite Google/GitHub y no se puede falsificar.
- **Coste asumido:** quien se registró con contraseña no puede entrar después con
  Google usando ese mismo correo. Hace falta vincular cuentas desde el perfil,
  que no existe. El mensaje de error ya no lo promete.
- La maquinaria de verificación por enlace **sigue montada y con tests**.
  Reactivarla es quitar dos llamadas a `User::markEmailAsVerifiedOnSignIn()`.

Frontera en `tests/Feature/Auth/EmailVerificationTest.php` y
`tests/Feature/Auth/OAuthSecurityTest.php`.

### Cómo quedó 1.4

La regla es **"nadie revisa su propio trabajo mientras haya otra persona que
pueda hacerlo"**, y se ajusta sola: con un único administrador puede aprobar
los suyos (prohibirlo dejaría la plataforma sin forma de publicar nada), y en
cuanto entra un segundo admin activo deja de poder. Un admin suspendido no
cuenta como revisor disponible: no puede entrar, así que bloquearía la cola sin
resolverla. Vive en `ComponentPolicy::moderate` + `User::hasOtherActiveAdmins`.

---

## 1. Vulnerabilidades

*Todas cerradas. Se conserva el diagnóstico completo porque es lo que justifica
reglas que de otro modo parecen arbitrarias — y porque **1.1 se revisó el
2026-08-19** al automatizar la verificación de email: ver el apartado al final de
la sección 0 antes de tocar nada del flujo de OAuth.*

### 1.1 CRÍTICA — Apropiación de cuenta vía OAuth + registro sin verificar — ✅ cerrada (arreglo revisado el 2026-08-19)

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

### 1.2 ALTA — OAuth sin validación de `state` (CSRF de inicio de sesión) — ✅ cerrada

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

### 1.3 MEDIA (latente) — El disco `public` desactiva toda la protección de descargas — ✅ cerrada

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

### 1.4 BAJA — Un admin puede aprobar y publicar su propio componente — ✅ cerrada

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
- **Búsquedas**: la del marketplace va por `websearch_to_tsquery`, que trata la entrada
  como texto y no como sintaxis (no revienta ni se puede inyectar operadores). Las que
  siguen con `ILIKE` (usuarios, etiquetas) escapan `%` y `_` antes.
- **Subidas**: límite real de 5 MB, nombre en disco aleatorio, MIME por contenido para zip
  e imagen.

---

## 2. Bugs funcionales

*Todos resueltos salvo **2.4**, que va atado al módulo de compras. Se conserva el
diagnóstico original de cada uno: es lo que explica por qué la solución es la que
es.*

### 2.1 El contador de descargas nunca sube — ✅ bloque 2

`ComponentFileController::download()` tiene un `TODO` en lugar del incremento. `downloads`
se muestra en las tarjetas, en la ficha y en el resumen de autor, y **siempre vale lo que
dejó el seeder**. Es una métrica visible que miente.

### 2.2 `stats_public` no lo puede ver nadie — ✅ bloque 3

Existe la columna, el conmutador en el dashboard y la lógica en `UserResource` para enseñar
el resumen a terceros… pero **no hay página ni endpoint de perfil público**. No existe
`GET /users/{id}` ni ruta `/users/:id` en el frontend. Hoy el ajuste no hace absolutamente
nada: es configuración muerta.

### 2.3 Los ficheros no se borran al eliminar un componente — ✅ bloque 2

`ComponentController::destroy()` hace soft delete del componente, pero los ficheros siguen
en disco y en `component_files`. Con S3/R2 eso es dinero cada mes por objetos que ya no
referencia nadie.

### 2.5 El ZIP del código solo admite UN archivo y sin comprimir — ✅ sesión F

**Dónde:** `src/studio/zip.ts` y `src/studio/ComponentForm.tsx`.

Descubierto al documentar el flujo de publicación. `zipTextFile()` genera un ZIP de **un
único archivo con método STORE** (sin compresión), y `unzipFirstTextFile()` **lanza
excepción con DEFLATE** — que es lo que produce cualquier herramienta normal de compresión.

Hoy no rompe nada porque el formulario **no deja subir un ZIP propio**: el código se escribe
en Monaco y se empaqueta solo. Pero la API sí acepta cualquier `application/zip`, así que un
ZIP subido por otra vía se descargaría bien y **reventaría el render en vivo**.

La limitación de fondo es de producto: **un componente real suele tener varios ficheros**
(componente, estilos, tipos, tests) y hoy solo cabe uno. Va a hacer falta una librería de
verdad y soporte multi-archivo en el editor. Documentado como limitación en
`/resources/docs` mientras tanto.

*Resuelto en la sesión F con **fflate**, no jszip: pesa bastante menos y hace
falta en las dos direcciones (leer y escribir).*

### 2.4 `hasPurchases()` devuelve siempre `false` — 🔴 abierto

Está encapsulado a propósito hasta que exista `purchases`, pero significa que **hoy un
componente con compras se borraría** en vez de despublicarse. Inofensivo mientras no haya
pagos; peligroso en cuanto los haya. Va atado al módulo de compras.

---

## 3. Páginas que faltan

*Todas hechas salvo el **texto** legal, que no depende del código. El detalle se
mantiene porque explica qué resolvía cada una.*

### 3.1 Legales — 🟡 estructura hecha, **texto pendiente** (bloquea el lanzamiento)

Los cuatro enlaces del footer apuntan a `#`: **aviso legal, privacidad, facturación y
cookies**. Un marketplace que va a cobrar y que opera con datos personales en la UE no
puede salir sin ellas.

### 3.2 Perfil público de autor — ✅ bloque 3

No existe. Es lo que da sentido a `stats_public` (2.2) y lo que convierte a un autor en algo
más que un nombre bajo una tarjeta. Necesita endpoint público + ruta `/users/:slug`.

### 3.3 Recursos del footer — ✅ sesión D

Documentación, "cómo subir un componente" y buenas prácticas: los tres siguen a `#`. Menos
urgentes que las legales, pero son los que enseñan a publicar — y hoy **los dos requisitos
que bloquean el envío a revisión** (código fuente subido y email verificado) no estaban
explicados en ninguna parte: el autor se los encontraba como un 422 al pulsar el botón.
*(El de email verificado ya no aplica en la práctica: ver el cambio de 1.1.)*

Detalle completo, con los formatos y límites ya verificados contra el código, en la
**Sesión D**.

### 3.4 Panel de admin — ✅ sesiones A y B

- **Métricas / resumen**: usuarios por rol, componentes por estado, descargas totales.
- **Catálogo**: CRUD de categorías y limpieza de tags huérfanos. Hoy las categorías solo se
  tocan por seeder, y los tags los crean los autores sin ningún control.

---

## 4. Módulos sin empezar

*Estado de la tabla al 2026-08-19. Las filas tachadas se dejan a propósito: la
nota explica por qué existía el hueco.*

| Módulo | Estado | Nota |
| --- | --- | --- |
| **Compras / Stripe** | 🔴 `stripe/stripe-php` instalado, **cero usos** | Sin esto los componentes de pago no se pueden comprar |
| **Suscripciones** | 🔴 Sin empezar | Plan Pro/Team de la plataforma. **Aplazado al final por decisión propia.** No confundir con vender un componente: eso es siempre pago único |
| ~~Verificación de email~~ | 🟡 Hecha, y luego **desactivada a propósito** | Se verifica al entrar; ver el cambio de 1.1 en la sección 0 |
| ~~Reviews~~ | ✅ sesión C | `rating_avg` y `rating_count` existían y no los escribía nadie |
| ~~Notificaciones~~ | ✅ sesión E | In-app, canal `database`. Cerró los 3 `TODO` de moderación |
| ~~`component_views`~~ | ✅ sesión A | Agregadas por día vía upsert |
| ~~Observers~~ | ✅ sesiones B y C | Recuentan, no acumulan deltas: un delta perdido no se recupera |
| ~~Búsqueda~~ | ✅ sesión G | PostgreSQL FTS. Meilisearch evaluado y descartado |

---

## 5. Deuda técnica

- **Media Library instalada y sin usar.** `ComponentFileService` va con `Storage::disk()`
  directo. O se adopta o se quita de `composer.json`.
- **El placeholder de degradado usa color crudo** (`src/studio/placeholder.ts`): deriva un
  HSL del hash del slug, fuera de la paleta de marca. *(Estético — aplazado.)*
- **Sin captura automática de portada.** Sin imagen, la rejilla cae al placeholder; hace
  falta el job con Chromium headless.
- ~~**3 errores de ESLint preexistentes**~~ en `src/auth/`: resueltos en el bloque 6.
  `npm run lint` sale limpio.
- **Bundle de 1,59 MB** (511 kB comprimido) sin code splitting. Monaco y Sandpack
  ya van en rutas aparte; lo gordo está en el chunk principal.
- **Monaco se descarga de un CDN de terceros en tiempo de ejecución.**
  `@monaco-editor/react` va sin configurar el loader, así que tira de
  `cdn.jsdelivr.net/npm/monaco-editor@0.55.1` — una versión distinta de la del
  lockfile, que no llega a usarse. Si jsDelivr cae o está bloqueado, el autor no
  puede escribir código. Es también la razón de que los 2 avisos de `dompurify`
  no se puedan cerrar con npm. Se arregla self-hosteando Monaco, y encaja con el
  code splitting de arriba.
- **`.gitignore` esconde toda la documentación del proyecto:** `CLAUDE.md` (línea 2) y
  `/documents` (línea 3). Nada de lo que vive ahí se comparte con el equipo ni existe fuera
  de tu máquina — incluidos el modelo de datos, la hoja de ruta y el design system. Por eso
  este fichero está en la **raíz** y no en `documents/`. Merece una decisión consciente: si
  se ignoró `/documents` por el peso de los `.docx` y `.html`, se puede ignorar por
  extensión y dejar el Markdown dentro.
- ~~**19 avisos de seguridad en dependencias**~~ (`composer audit`). Resueltos en
  la sesión I.1, junto con 6 de npm que nadie había mirado. `composer audit` sale
  limpio; `npm audit` deja 2 que no dependen de nosotros (ver Monaco, arriba).
- ~~**Sin CI.**~~ Resuelto: `.github/workflows/ci.yml` corre Pint + la suite (contra
  PostgreSQL) y ESLint + build del frontend.
- ~~**La suite corría en SQLite**~~ mientras producción va en PostgreSQL. Resuelto en la
  sesión G.

---

## 6. Lo que queda, repartido por sesiones

Cada sesión es una unidad cerrada: se puede parar al final de cualquiera sin
dejar nada a medias.

Las sesiones A-G están hechas y se ordenaron de menos a más trabajo. **El orden
de lo que queda ya no es ese, es el acordado el 2026-08-19:**

| Orden | Sesión | Estado |
| --- | --- | --- |
| 1 | **I.1 — Dependencias al día** | ✅ 2026-08-22 |
| 2 | **I.2 — Imagen de producción** | ✅ 2026-08-22 |
| 3 | **I.3 — Almacenamiento en S3** | ✅ 2026-08-22 (código; faltan los buckets) |
| 4 | **I.4 — El frontend apunta a la API** | ✅ 2026-08-22 |
| 5 | **I.5 — Desplegar** | 🔵 **siguiente — bloqueada en ti**, ver abajo |
| 6 | **J — Paso a producción** | 🔴 después |
| — | Vincular cuentas desde el perfil | 🔴 sin fecha, no bloquea |
| 7 | **K+ — Compras / Stripe** — solo pago único a precio fijo | ⏸ **últimas fases, por decisión propia** |
| 8 | **Pantalla de preferencias** | ⏸ **últimas fases, por decisión propia** |
| 9 | **Suscripciones** (plan Pro/Team de la plataforma, no venta de componentes) | ⏸ al final de todo |

**La beta cerrada termina al acabar I.5.** Todo lo que va después (dominio,
legales, Stripe) queda fuera por decisión propia.

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

### Sesión D — Recursos del footer (documentación)

*Una sesión, sobre todo de escritura.*

Los tres enlaces de la columna **Recursos** del footer siguen apuntando a `#`
(`src/components/Footer.tsx`, claves `footer.links.docs`, `.tutorials`,
`.bestPractices`). Son los que enseñan a publicar: sin ellos, un autor nuevo
tiene que deducir por ensayo y error qué formatos se aceptan y por qué le
rechazan un envío.

**Diferencia clave con las legales:** ahí no se podía escribir el contenido
porque son cláusulas que obligan legalmente y dependen de datos de empresa.
**Aquí sí se puede escribir todo**, porque sale del propio código. Los datos ya
están verificados y son estos:

| Dato | Valor real | Dónde vive |
| --- | --- | --- |
| Tamaño máximo de subida | **5 MB** por archivo | `UploadComponentFileRequest::MAX_KB` |
| Código fuente | **ZIP** (validado por contenido, no por extensión) | `UploadComponentFileRequest` |
| README | `.md`, `.markdown`, `.txt` + UTF-8 válido | idem |
| Imagen de portada | PNG, JPEG o WebP | idem |
| Stacks | React, Angular, Vanilla JS | `App\Enums\Stack` |
| Título / descripción | máx. 150 / 500 caracteres | `StoreComponentRequest` |
| Etiquetas | hasta 10, de 50 caracteres | idem |
| Precio | 0 = gratis; máx. 999.999,99 € | idem |
| Caducidad del enlace de descarga | 5 minutos (URL firmada) | `config/components.php` |

**Reutiliza:** el andamiaje de `src/legal/LegalPage.tsx` y `src/legal/pages.tsx`
sirve tal cual para estas páginas — mismo layout de secciones e i18n. La
diferencia es que aquí **ninguna sección nace `pending`**, porque el contenido sí
se escribe.

Contenido propuesto para cada una:

**1. Documentación** (`/resources/docs`) — referencia. Qué es un componente en
Layerbase, los tres stacks, la estructura del ZIP, el ciclo de estados completo
(`draft → pending_review → published | rejected`, y que desde `rejected` hay que
pasar por "Volver a borrador" antes de reenviar), y cómo funcionan las descargas
con URL firmada.

**2. Cómo subir un componente** (`/resources/publishing`) — tutorial paso a paso.
Los dos requisitos que hoy **bloquean el envío a revisión y no se explican en
ningún sitio**:
- hay que tener el **código fuente subido**, y
- hay que tener el **email verificado** (bloque 1).

Ambos devuelven 422 con mensaje, pero el autor se los encuentra de golpe al
pulsar el botón. Merece explicarse antes.

**3. Buenas prácticas** (`/resources/best-practices`) — cómo escribir un README
útil, por qué conviene subir imagen de portada, y **el detalle que más confunde**:
el render en vivo de la ficha solo aparece si el componente es **React, gratuito
(o comprado) y tiene código**. En uno de pago nunca hay preview en vivo, porque
el código ES el producto — así que ahí la portada depende de la imagen que suba
el autor. Ver `ComponentPolicy::previewSource` y `<Cover>` en `ComponentDetail`.

**Al terminar:** enganchar los tres enlaces del footer, que es lo que cierra el
hueco, e i18n ES/EN.

---

### Sesión E — Notificaciones

*Una sesión.*

Tabla `notifications` y emails. Desbloquea los tres `TODO` que esperan en
`ComponentStateController`: hoy **nadie avisa al autor de que le han aprobado o
rechazado un componente**, ni a los admin de que hay algo en la cola.

El correo ya funciona (driver `log` en dev, mismo camino que la verificación de
email del bloque 1).

---

### Sesión F — Multi-archivo ✅

*Hecha.* Un componente ya no es un solo fichero: el ZIP guarda un árbol, el
editor tiene pestañas y el sandbox monta todos los ficheros. Compatible con los
componentes ya subidos. Backend sin tocar — el ZIP le es opaco.

---

### Sesión G — Búsqueda ✅

*Hecha. Sin Meilisearch, y esa fue la decisión de la sesión.*

Meilisearch se evaluó y se descartó: es un servicio siempre encendido, con disco
persistente, que mantiene una **copia** de los datos. Esa copia hay que
sincronizarla y filtrarla por estado, con el riesgo de que un borrador o un
componente rechazado acabe saliendo en el buscador público. Y no encaja con el
despliegue previsto (Cloud Run levanta y apaga instancias con disco efímero), así
que habría significado o Meilisearch Cloud o una VM aparte que mantener.

En su lugar, búsqueda de texto completo de **PostgreSQL**, que ya estaba en el
stack:

- Columna generada `components.search_vector`, con el **título pesando más** que
  la descripción, sin acentos (`f_unaccent`) y lematizada en español. La mantiene
  PostgreSQL sola en cada INSERT/UPDATE: no hay nada que sincronizar.
- Índice **GIN**: el `LIKE '%término%'` anterior no podía usar índice porque el
  comodín inicial obliga a recorrer la tabla entera.
- **Plan B por trigramas** (`word_similarity`) cuando la búsqueda exacta no
  devuelve nada, que es lo que hace que "carusel" encuentre "Carousel". Umbral en
  `config/components.php`, medido contra el catálogo real.
- `websearch_to_tsquery` en vez de `plainto_tsquery`: entiende comillas para
  frase exacta, `-excluir` y `or`, y no falla con lo que sea que teclee alguien.
- Sigue siendo la misma query sobre la misma tabla, así que `published()`, los
  filtros, la paginación y las policies aplican sin tocar nada.
- `laravel/scout` y `meilisearch/meilisearch-php` **fuera del `composer.json`**.

- La respuesta del listado dice por qué vía vinieron los resultados
  (`search.fuzzy`), y Explore avisa con un "nada coincide con «carusel», esto es
  lo más parecido". Sin eso, quien busca con una errata recibe componentes que no
  contienen lo que escribió y no puede distinguir una corrección de un fallo.

Frontera en `tests/Feature/Component/SearchTest.php` (19 casos).

#### Lo que arrastró: la suite dejó de correr en SQLite

Los tests iban en SQLite `:memory:` y producción en PostgreSQL. Eso ya había
escondido un bug real (los NULL se ordenan al revés en un `ORDER BY DESC`, así
que los componentes sin visitas encabezaban "más vistos"), y con la búsqueda de
texto completo pasaba a ser insostenible: `to_tsvector` no existe en SQLite.

La suite corre ahora contra PostgreSQL — misma base de datos que producción,
`layerbase_testing`, creada por `docker/postgres/init/` en entornos nuevos. En CI
se levanta como servicio. Sigue tardando 4 s.

**Y el cambio cazó un bug el primer día:** en PostgreSQL `LIKE` distingue
mayúsculas y en SQLite no. Buscar "Jos" no encontraba a "josue" en el panel de
usuarios, y el autocompletado de etiquetas no encontraba nada escrito en
minúscula. Arreglado con `ILIKE` en `Admin\UserController`, `Admin\CatalogController`
y `TagController`. El test que existía pasaba porque el término casaba con el
**email**, nunca con el nombre.

---

### Sesión I — Despliegue de PREPRODUCCIÓN

*Auditada el 2026-08-19 sobre código real, dividida en cinco y ejecutada el
2026-08-22. **Proveedor: AWS**, decidido ese mismo día.*

Objetivo: que esto esté en una URL y se pueda entrar, con datos de prueba.
Runbook completo con los comandos en
[`docker/production/DESPLIEGUE.md`](docker/production/DESPLIEGUE.md).

Lo que **no** hace falta aquí: dominio propio, correo transaccional (la
verificación de email es automática desde el 2026-08-19), texto legal redactado
—mientras sea beta cerrada y no se cobre—, ni Stripe.

#### El cambio de proveedor

El plan original era Cloud Run + Cloudflare Pages + Neon + R2. Se cambió a AWS
al aparecer una cuenta nueva con capa gratuita de 12 meses. **Nada del código
hubo que rehacerlo**: la imagen escucha en `$PORT` y los discos `s3`/`s3_public`
*son* el driver de S3, del que R2 solo era el sustituto compatible.

Lo que sí cambia, y conviene tener apuntado:

- **App Runner no baja a cero** cuando no hay tráfico, y Cloud Run sí. Son unos
  5-8 $/mes aunque no entre nadie.
- **La capa gratuita de AWS dura 12 meses**, no siempre. Hay un escalón al año,
  sobre todo en RDS (~15-25 $/mes después).
- **RDS va con acceso público**, igual que iba a ir Neon. No es un empeoramiento:
  ponerla en privado obligaría a un conector de VPC, y entonces TODA la salida
  de App Runner iría por la VPC —incluidas las llamadas a GitHub y Google del
  login OAuth—, lo que exige un NAT Gateway de unos 32 $/mes.
- `public/_redirects` **no sirve en CloudFront**: allí la misma regla es una
  *custom error response*. El fichero se queda porque no estorba.

#### I.1 — Dependencias al día ✅

`composer audit` daba 19 avisos sobre 5 paquetes, y no "uno alto" como decía la
auditoría: **uno crítico** (`mtdowling/jmespath.php`, CVE-2026-54133, inyección
de código), 5 altos y 13 medios. Entra por el SDK de AWS, así que se activaba
justo al empezar I.3. Cerrado con un `composer update` de los cinco.

**El frontend no se había auditado nunca:** 6 vulnerabilidades, 3 altas, todas
en `react-router` ≤ 7.17.0 — open redirect en `<Link>`/`useNavigate`, XSS y DoS
por *route matching*. Resueltas subiendo a 7.18.2.

Quedan 2 avisos (1 bajo, 1 medio) en `dompurify`, que entra por `monaco-editor`.
**No se pueden cerrar con npm y forzarlo sería un placebo**, porque ese paquete
nunca llega al navegador: `@monaco-editor/react` va sin configurar el loader, y
por defecto **descarga Monaco de jsDelivr en tiempo de ejecución**
(`monaco-editor@0.55.1`, una versión distinta de la del lockfile). El editor de
código depende hoy de un CDN de terceros: si jsDelivr cae o está bloqueado, el
autor no puede escribir. Se cierra self-hosteando Monaco, que encaja con el code
splitting pendiente.

#### I.2 — Imagen de producción ✅

`docker/php/Dockerfile` no valía: PHP-FPM a secas esperando un Nginx en otro
contenedor, código por volumen, `composer install` en cada arranque y un
`migrate --force || true` que deja arrancar con la base a medio migrar.

Nueva imagen en `docker/production/`: multi-etapa sobre una base común, Nginx +
PHP-FPM + Supervisor en un solo contenedor, escuchando en `$PORT`, sin `.env` ni
tests ni Composer dentro, y **fallando en voz alta** — si falta `APP_KEY` o la
configuración de base de datos, no arranca (probado: sale con código 1).

**Dos cosas que salieron por el camino:**

- **`upload_max_filesize` valía 2M** (el valor compilado de PHP, sin `php.ini`),
  cuando `UploadComponentFileRequest::MAX_KB` valida 5 MB. Una subida de entre 2
  y 5 MB la cortaba PHP antes de llegar a Laravel: `$_FILES` llega vacío y el
  autor ve "el archivo es obligatorio" en vez de "pesa demasiado". Y el avatar,
  con su máximo de 2 MB, caía justo en el límite. Arreglado con
  `docker/php/php.ini`, que **comparten desarrollo y producción**.
- **El proyecto corre PHP 8.4, no 8.3.** El lock exige `>=8.4.1` desde antes de
  esta sesión (Symfony 8.1), el contenedor de desarrollo llevaba 8.4.22, pero el
  Dockerfile decía `php:8.3-fpm`, `composer.json` declaraba `^8.3` y **CI
  declaraba 8.3 y hacía `composer install` sin `--ignore-platform-reqs`: el job
  de backend no podía estar pasando.** Alineado todo en 8.4.

#### I.3 — Almacenamiento en S3 ✅ (código)

Dos discos, no uno: **`s3` privado** para los archivos de componente (URL
firmada temporal) y **`s3_public`** para los avatares (URL permanente).

Son **dos buckets distintos a propósito**. El avatar necesita URL permanente, y
eso obliga a exponer el bucket entero; si compartiera bucket con los archivos de
componente, ese dominio público serviría el código fuente de los de pago sin
pasar por la policy — la vulnerabilidad 1.3 por otra vía.

`ComponentFile` ya distinguía disco local de remoto. **`AvatarService` no:**
recortaba la URL a la ruta siempre, así que en S3 se comía el dominio del bucket
y el avatar acababa apuntando al dominio del FRONTEND. Arreglado con la misma
regla, y el borrado del avatar anterior ya no deduce la ruta partiendo la URL
—que se rompía en modo *path-style*— sino buscando el patrón `avatars/{id}/`.

En los discos remotos `throw` pasa a `true`: una subida fallida en silencio
dejaría una fila en `component_files` apuntando a un archivo inexistente.

Frontera en `tests/Feature/Profile/AvatarStorageTest.php` (4 casos).

#### I.4 — El frontend apunta a la API ✅

`VITE_API_URL` (variable de **build**: Vite la incrusta al compilar) con `/api`
relativo como valor por defecto, así el proxy de Vite en local sigue igual.

**La auditoría solo señalaba `src/lib/api.ts`, y había un segundo sitio:**
`oauthRedirectUrl()` en `src/Login/auth.ts` devolvía `/api/auth/...` a fuego. Ese
no pasa por axios — es un `window.location.assign`, una navegación completa del
navegador —, así que el `baseURL` no le afectaba y el login con GitHub y Google
habría roto desplegado. Ahora ambos salen de `API_BASE_URL`.

Añadidos `frontend-layerbase/.env.example` y el fallback de SPA.

#### I.5 — Desplegar 🔵 **bloqueada en ti**

Todo lo que depende del código está hecho. Lo que falta son altas que llevan
tarjeta o verificación por correo:

- [ ] `brew install awscli` y `aws configure` (no está instalado)
- [ ] Usuario IAM para el despliegue (no la cuenta raíz)
- [ ] Los dos buckets de S3 y un usuario IAM para la aplicación
- [ ] La instancia de RDS
- [ ] El repositorio de ECR y el servicio de App Runner
- [ ] El bucket del frontend y la distribución de CloudFront

Comandos exactos en
[`docker/production/DESPLIEGUE.md`](docker/production/DESPLIEGUE.md), con la
lista de comprobación final.

---

### Sesión J — Paso a PRODUCCIÓN

*Después de preproducción. Aquí es donde entra todo lo que se aplazó por no
tener dominio ni cobrar dinero.*

Preproducción demuestra que el despliegue funciona. Producción es lo que hace
falta para que entre gente que no eres tú y, llegado el caso, dinero.

- **Dominio propio** (~10 €/año). Desbloquea las dos cosas de abajo.
- **Correo transaccional real**: todos los proveedores exigen verificar un
  dominio con DNS para enviar a direcciones ajenas. Con eso montado, decidir si
  **se reactiva la verificación de email** quitando las dos llamadas a
  `User::markEmailAsVerifiedOnSignIn()` (ver el cambio de 1.1 en la sección 0).
- **Texto legal redactado.** Las cuatro páginas están montadas y el propio aviso
  dice "no debe publicarse en este estado". No depende del código.
- ~~**`composer audit`**~~: hecho en la sesión I.1.
- **El escalón de la capa gratuita de AWS a los 12 meses**, sobre todo RDS
  (~15-25 $/mes después). Decidir entonces si se sigue en AWS o se mueve.
- **Hosting del frontend**: S3 + CloudFront no tiene restricción de uso
  comercial, así que el problema que había con el plan Hobby de Vercel ya no
  aplica. La capa gratuita de 1 TB/mes de CloudFront es perpetua.
- **Copias de seguridad y monitorización.** Hoy no hay ninguna de las dos.
- Repasar `APP_DEBUG=false`, límites de subida y throttling con tráfico real.

---

### Vincular cuentas desde el perfil

Lo dejó pendiente el cambio de 1.1 del 2026-08-19: OAuth ya no vincula por email,
así que **quien se registró con contraseña no puede entrar después con Google**
usando ese mismo correo. Hoy recibe "ya hay una cuenta registrada con ese email"
y no tiene salida.

La salida limpia es una pantalla en el perfil que enganche Google/GitHub a la
cuenta ya iniciada: ahí la identidad está probada por la sesión, no por el
correo, así que es seguro. No bloquea el despliegue.

---

### Sesión K+ — Compras / Stripe — **últimas fases**

*Varias sesiones. El módulo grande.*

> **Aplazado a las últimas fases del proyecto por decisión propia (2026-08-19).**
> No se empieza hasta entonces, aunque quede hueco antes.

#### Alcance cerrado: precio fijo y pago único

**Un componente se vende SIEMPRE a precio fijo y de una sola vez. Nunca por
suscripción ni por tramos** (decisión propia, 2026-08-19).

Se anota aquí y no al empezar el módulo porque es lo que evita construir de más:
sin esta frase, "vender un componente" se abre a precios recurrentes, planes por
autor y prorrateos, y cada uno de ellos arrastra webhooks, estados intermedios y
casos de reembolso propios. Con el alcance cerrado, Stripe se reduce a un
Checkout de pago único.

Conviene distinguirlo de las **suscripciones Pro/Team** (tabla `subscriptions`
del modelo de datos): esas son un plan de la plataforma para el usuario, no una
forma de vender un componente, y siguen aparcadas al final de todo. Esta decisión
no las resucita ni las cancela.

El código actual ya encaja: `components.price` es un escalar y los filtros
(`free`, `paid`, `min_price`, `max_price`) tratan el precio como una cantidad
única. No hay nada que deshacer, solo que no ampliar.

#### Lo que trae

Checkout de pago único, webhooks, tabla `purchases`, y Connect Express para pagar
a los autores. Arrastra consigo:

- **2.4** (`hasPurchases()` devuelve siempre `false`, así que hoy un componente
  comprado se borraría en vez de despublicarse).
- `userCanAccessSource()`, que tiene el mismo `TODO` esperando la tabla.
- Decidir la **comisión**, que sigue abierta: la hoja de ruta dice 10% / 5% y el
  modelo de datos dice 15%. Con el pago único cerrado, la pregunta se reduce a
  qué se queda la plataforma de cada venta — porcentaje o cantidad fija.

---

### Pantalla de preferencias — **últimas fases**

> **Aplazada a las últimas fases del proyecto por decisión propia (2026-08-19)**,
> junto con Compras/Stripe.

Idioma y tema se guardan hoy en `localStorage` (`useI18n`, `useTheme`), así que no
acompañan al usuario entre dispositivos y **el backend no los conoce**. Eso último ya se
nota: los correos salen en inglés porque el servidor no sabe en qué idioma navega quien los
recibe, y no puede saberlo — un correo se envía en diferido, cuando ya no hay petición de la
que deducirlo.

Junta tres cosas que hoy están sueltas:

- Columna `locale` (y `theme`) en `users`, para que la preferencia viaje con la cuenta.
- Pantalla de preferencias donde cambiarlas.
- Correos y notificaciones en el idioma del usuario. Hoy las plantillas son las de Laravel
  por defecto, en inglés, con `APP_LOCALE=en` y sin carpeta `lang/`.

Aplazado a propósito hasta el final: no bloquea nada, pero conviene hacerlo **antes** de
escribir muchas plantillas de correo, o habrá que traducirlas todas después.

### Sin fecha

- **Captura automática de portada** (job con Chromium headless): hoy, sin imagen,
  la rejilla cae al placeholder.
- **Media Library**: instalada y sin usar. O se adopta o se quita de
  `composer.json`.
- **Placeholder de degradado** fuera de la paleta de marca. *(Estético.)*
- **Suscripciones** (plan Pro/Team de la plataforma) — al final de todo, por
  decisión propia. La venta de un componente es **siempre pago único a precio
  fijo**; ver el alcance cerrado en la sesión K+.

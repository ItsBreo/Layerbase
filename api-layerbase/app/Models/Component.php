<?php

namespace App\Models;

use App\Enums\ComponentFileType;
use App\Enums\ComponentStatus;
use App\Enums\Stack;
use App\Observers\ComponentObserver;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Componente de UI del marketplace. Núcleo del Módulo 3.
 *
 * Campos mass-assignable acotados a lo que el autor controla: se EXCLUYEN
 * `status`, `slug`, `downloads`, `rating_avg`, `rating_count`, `published_at`
 * y `user_id`. Estos los fija código de confianza (máquina de estados,
 * observers, controlador), nunca input directo. Evita, p.ej., que un autor se
 * autopublique metiendo `status=published` en el body.
 *
 * Ver documents/ComponentHub_Modelo_Datos.md (§3).
 */
#[Fillable(['category_id', 'title', 'description', 'stack', 'price'])]
#[ObservedBy(ComponentObserver::class)]
class Component extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'stack' => Stack::class,
            'status' => ComponentStatus::class,
            'price' => 'decimal:2',
            'rating_avg' => 'decimal:2',
            'downloads' => 'integer',
            'rating_count' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    /**
     * Estado por defecto a nivel de modelo: un componente nace como borrador
     * aunque la BD también lo garantice (así el objeto lo refleja sin refrescar).
     */
    protected $attributes = [
        'status' => ComponentStatus::Draft->value,
        // Reflejan el default de la BD ya en la instancia recién creada (si no,
        // se serializan como null hasta refrescar desde la base de datos).
        'downloads' => 0,
        'rating_count' => 0,
    ];

    /**
     * Slug único autogenerado desde el título en la creación. Si colisiona se
     * le añade un sufijo incremental. No se regenera al editar el título para
     * no romper enlaces/SEO de un componente ya conocido.
     */
    protected static function booted(): void
    {
        static::creating(function (Component $component): void {
            if (empty($component->slug) && ! empty($component->title)) {
                $component->slug = self::uniqueSlug($component->title);
            }
        });

        /*
         * Los archivos se borran solo en el borrado DEFINITIVO, nunca en el
         * soft delete: mientras el componente se pueda restaurar, sus archivos
         * tienen que seguir ahí o volvería vacío.
         *
         * Quien fuerza el borrado es el comando `components:purge-deleted`.
         * Sin ese par (evento + comando) no había ninguna vía de limpieza y los
         * objetos se acumulaban en el disco para siempre, que en S3/R2 es dinero
         * todos los meses por ficheros que ya no referencia nadie.
         *
         * `forceDeleting` (ANTES) y no `forceDeleted` (después): la FK de
         * component_files es cascadeOnDelete, así que en cuanto desaparece la
         * fila del componente la base de datos se lleva las de sus archivos.
         * Enganchado al evento posterior no quedaría ninguna fila que consultar
         * y los objetos del disco se quedarían huérfanos — que es justo lo que
         * se quiere evitar.
         */
        static::forceDeleting(function (Component $component): void {
            $component->purgeFiles();
        });
    }

    /**
     * Borra del disco (y de la tabla) todos los archivos del componente.
     *
     * Un fallo al borrar un objeto concreto no puede abortar la purga entera:
     * si el fichero ya no está en el disco, la fila igualmente sobra.
     */
    public function purgeFiles(): void
    {
        foreach ($this->files()->get() as $file) {
            try {
                Storage::disk($file->disk)->delete($file->path);
            } catch (\Throwable $e) {
                Log::warning('No se pudo borrar un archivo de componente', [
                    'component_id' => $this->id,
                    'file_id' => $file->id,
                    'error' => $e->getMessage(),
                ]);
            }

            $file->delete();
        }
    }

    private static function uniqueSlug(string $title): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $i = 2;

        // withTrashed: un slug de un componente soft-deleted sigue ocupado
        // (la columna es UNIQUE y no filtra por deleted_at).
        while (self::withTrashed()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    // --- Relaciones -------------------------------------------------------

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return HasMany<ComponentFile, $this> */
    public function files(): HasMany
    {
        return $this->hasMany(ComponentFile::class);
    }

    /** @return BelongsToMany<Tag, $this> */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    // --- Helpers de dominio ----------------------------------------------

    /** ¿Es gratuito? (precio 0). */
    public function isFree(): bool
    {
        return (float) $this->price === 0.0;
    }

    public function isPublished(): bool
    {
        return $this->status === ComponentStatus::Published;
    }

    /** ¿Es editable según su estado actual? Delegado en el enum. */
    public function isEditable(): bool
    {
        return $this->status->isEditable();
    }

    public function isOwnedBy(?User $user): bool
    {
        return $user !== null && $this->user_id === $user->id;
    }

    /*
     * Transiciones de estado. `status` y `published_at` están fuera de
     * $fillable a propósito (anti escalada por mass-assignment), así que se
     * asignan por propiedad directa desde este código de confianza — NUNCA vía
     * update([...]), que la protección de mass-assignment ignoraría en silencio.
     */

    /** draft → pending_review. */
    public function submitForReview(): void
    {
        $this->status = ComponentStatus::PendingReview;
        // El motivo del rechazo anterior deja de aplicar en cuanto el autor
        // reenvía: si no se limpia, la ficha seguiría mostrando una queja ya
        // corregida.
        $this->rejection_reason = null;
        $this->save();
    }

    /**
     * pending_review → published. Aprobación de un admin: es el ÚNICO camino
     * por el que un componente se hace visible en el marketplace.
     */
    public function approve(): void
    {
        $this->status = ComponentStatus::Published;
        $this->published_at = now();
        $this->rejection_reason = null;
        $this->save();
    }

    /**
     * pending_review → rejected. El motivo es obligatorio: un rechazo sin
     * explicación deja al autor sin nada que corregir.
     */
    public function reject(string $reason): void
    {
        $this->status = ComponentStatus::Rejected;
        $this->rejection_reason = $reason;
        $this->save();
    }

    /** published → unpublished (deja de estar visible; conserva historial). */
    public function unpublish(): void
    {
        $this->status = ComponentStatus::Unpublished;
        $this->published_at = null;
        $this->save();
    }

    /**
     * rejected|unpublished → draft. Cierra el ciclo de moderación: desde
     * `rejected` el enum solo permite volver a borrador, así que sin esto un
     * componente rechazado se queda atrapado (no se puede reenviar a revisión
     * directamente). El motivo del rechazo se conserva hasta el reenvío, que es
     * cuando deja de aplicar, para que el autor lo tenga delante mientras
     * corrige.
     */
    public function revertToDraft(): void
    {
        $this->status = ComponentStatus::Draft;
        $this->published_at = null;
        $this->save();
    }

    /**
     * ¿Tiene compras registradas? Determina si un DELETE debe despublicar en
     * vez de borrar (no se elimina algo que alguien ya pagó).
     *
     * El módulo de compras llega en una semana posterior; hasta que exista la
     * tabla `purchases` esto es siempre falso. Encapsulado aquí para que la
     * máquina de estados no dependa de esa tabla todavía. Ver [[roadmap]].
     */
    public function hasPurchases(): bool
    {
        return false;
    }

    /** @return HasMany<ComponentView, $this> */
    public function views(): HasMany
    {
        return $this->hasMany(ComponentView::class);
    }

    /**
     * Suma una visita al contador del día de hoy.
     *
     * Se resuelve con un único `INSERT ... ON CONFLICT DO UPDATE` en vez de
     * leer-modificar-guardar: dos visitas simultáneas al mismo componente no
     * se pisan, y no hace falta una consulta previa. El `upsert()` de Eloquent
     * no sirve aquí porque ASIGNA el valor en el conflicto, y lo que se necesita
     * es incrementarlo.
     *
     * `count` va entre comillas por ser también el nombre de una función SQL.
     * La sintaxis vale igual en PostgreSQL (el entorno real) y en SQLite (los
     * tests).
     */
    public function recordView(): void
    {
        DB::statement(
            'INSERT INTO component_views (component_id, viewed_on, "count") VALUES (?, ?, 1)
             ON CONFLICT (component_id, viewed_on)
             DO UPDATE SET "count" = component_views."count" + 1',
            [$this->id, now()->toDateString()],
        );
    }

    /** Archivo de un tipo concreto (o null si no se ha subido). */
    public function fileOfType(ComponentFileType $type): ?ComponentFile
    {
        return $this->files->firstWhere('type', $type);
    }

    /**
     * Imagen de portada del componente, si la hay: la que subió el autor tiene
     * prioridad sobre el thumbnail generado. Si devuelve null, el frontend
     * renderiza el componente en vivo (gratuitos) o cae al placeholder.
     */
    public function previewImageUrl(): ?string
    {
        return $this->fileOfType(ComponentFileType::Preview)?->temporaryUrl()
            ?? $this->thumbnail_url;
    }

    /**
     * ¿Puede `$user` acceder al código fuente? Solo el autor, quien lo haya
     * comprado, o cualquiera si el componente es gratuito.
     */
    public function userCanAccessSource(?User $user): bool
    {
        if ($this->isFree()) {
            return true;
        }

        if ($this->isOwnedBy($user)) {
            return true;
        }

        // TODO(compras): sustituir por comprobación real contra `purchases`
        // cuando exista el módulo. Hoy nadie más tiene acceso.
        return false;
    }

    // --- Scopes -----------------------------------------------------------

    /** Solo componentes visibles públicamente (publicados). */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', ComponentStatus::Published);
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}

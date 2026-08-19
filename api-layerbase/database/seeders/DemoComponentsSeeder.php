<?php

namespace Database\Seeders;

use App\Enums\ComponentStatus;
use App\Enums\Stack;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Component;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Datos de demo para poblar la rejilla pública del marketplace.
 *
 * NO se ejecuta en producción. Genera autores + un catálogo variado de
 * componentes PUBLICADOS (con published_at repartido en el tiempo, precios,
 * descargas, valoraciones y tags) para ver la vista tipo Pinterest con muchos
 * ejemplos. Idempotente por título (updateOrCreate).
 */
class DemoComponentsSeeder extends Seeder
{
    /** Fragmentos para componer nombres realistas de componentes de UI. */
    private const NOUNS = [
        'Button', 'Card', 'Modal', 'Dropdown', 'Navbar', 'Sidebar', 'Table', 'Form',
        'Tabs', 'Accordion', 'Tooltip', 'Toast', 'Avatar', 'Badge', 'Carousel',
        'Datepicker', 'Slider', 'Pagination', 'Breadcrumb', 'Spinner', 'Stepper',
        'Timeline', 'Kanban', 'Chart', 'Calendar', 'Chat', 'Command Palette',
        'File Upload', 'Rating', 'Progress Bar', 'Skeleton', 'Drawer', 'Popover',
    ];

    private const ADJECTIVES = [
        'Animated', 'Minimal', 'Glass', 'Neon', 'Gradient', 'Dark', 'Elastic',
        'Floating', 'Retro', 'Neumorphic', 'Compact', 'Pro', 'Smart', 'Fluid',
    ];

    private const TAG_POOL = [
        'dark-mode', 'animation', 'accessible', 'responsive', 'typescript',
        'tailwind', 'form', 'data', 'motion', 'gradient', 'minimal', 'a11y',
        'hooks', 'ssr', 'mobile', 'dashboard',
    ];

    public function run(): void
    {
        if (app()->isProduction()) {
            return;
        }

        $authors = $this->authors();
        $categories = Category::all();
        if ($categories->isEmpty()) {
            $this->call(CategorySeeder::class);
            $categories = Category::all();
        }
        $tags = $this->tags();
        $stacks = Stack::cases();

        // ~54 componentes: variedad suficiente para ver la rejilla llena.
        for ($i = 0; $i < 54; $i++) {
            $noun = self::NOUNS[array_rand(self::NOUNS)];
            $adjective = self::ADJECTIVES[array_rand(self::ADJECTIVES)];
            $stack = $stacks[array_rand($stacks)];
            $title = "{$adjective} {$noun} · ".Str::upper(Str::random(4));

            // 45% gratis; el resto con precio "bonito".
            $isFree = random_int(1, 100) <= 45;
            $price = $isFree ? 0 : [4.99, 7.5, 9.99, 12, 14.99, 19.99, 24][array_rand([4.99, 7.5, 9.99, 12, 14.99, 19.99, 24])];

            $publishedAt = now()->subDays(random_int(0, 60))->subHours(random_int(0, 23));

            $component = Component::updateOrCreate(
                ['slug' => Str::slug($title)],
                [
                    'user_id' => $authors->random()->id,
                    'category_id' => $categories->random()->id,
                    'title' => $title,
                    'description' => $this->description($noun),
                    'stack' => $stack,
                    'price' => $price,
                ],
            );

            // Campos gestionados (fuera de fillable): asignación directa.
            $component->status = ComponentStatus::Published;
            $component->published_at = $publishedAt;
            $component->downloads = random_int(0, 5000);
            /*
             * NO se inventa la valoración.
             *
             * Antes se generaban `rating_avg` y `rating_count` al azar, y el
             * resultado era incoherente en pantalla: la tarjeta enseñaba 4,2
             * estrellas y al abrir la ficha ponía "nadie ha valorado este
             * componente". Ahora esas dos columnas SOLO las escribe
             * ReviewObserver a partir de valoraciones reales.
             *
             * `downloads` sí se puede inventar: no hay ninguna vista que liste
             * las descargas una a una, así que el número no se contradice con
             * nada.
             */
            $component->save();

            // 1-4 tags aleatorios.
            $component->tags()->sync($tags->random(random_int(1, 4))->pluck('id'));
        }

        $this->command?->info('Demo: '.Component::where('status', ComponentStatus::Published)->count().' componentes publicados.');
    }

    /** Crea (o recupera) un puñado de autores de demo. */
    private function authors()
    {
        $names = ['Ada Lovelace', 'Grace Hopper', 'Linus Dev', 'María UI', 'Kenji Front', 'Sofia Stack'];

        return collect($names)->map(function (string $name, int $i) {
            return User::updateOrCreate(
                ['email' => 'demo'.($i + 1).'@layerbase.test'],
                [
                    'name' => $name,
                    'password' => Hash::make('password'),
                    'role' => UserRole::Author,
                    'email_verified_at' => now(),
                ],
            );
        });
    }

    /** Garantiza un pool de tags reutilizable. */
    private function tags()
    {
        return collect(self::TAG_POOL)->map(
            fn (string $name) => Tag::firstOrCreate(['slug' => Str::slug($name)], ['name' => $name]),
        );
    }

    private function description(string $noun): string
    {
        $uses = [
            "Un {$noun} accesible y personalizable, listo para producción.",
            "Componente {$noun} con animaciones fluidas y soporte de modo oscuro.",
            "{$noun} responsive con una API mínima y tipada.",
            "Elegante {$noun} pensado para dashboards modernos.",
            "{$noun} ligero, sin dependencias y fácil de integrar.",
        ];

        return $uses[array_rand($uses)];
    }
}

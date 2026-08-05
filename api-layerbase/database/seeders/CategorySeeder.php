<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Categorías base del marketplace. Idempotente: se identifica por slug, así que
 * re-ejecutar el seeder no duplica. Solo los admin crearán más desde su panel.
 */
class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Formularios', 'stack' => 'all', 'description' => 'Inputs, validación, selectores y formularios completos.'],
            ['name' => 'Navegación', 'stack' => 'all', 'description' => 'Menús, tabs, breadcrumbs y barras de navegación.'],
            ['name' => 'Tablas y datos', 'stack' => 'all', 'description' => 'Tablas, data grids y visualización de datos.'],
            ['name' => 'Modales y overlays', 'stack' => 'all', 'description' => 'Diálogos, drawers, tooltips y popovers.'],
            ['name' => 'Cards y layout', 'stack' => 'all', 'description' => 'Tarjetas, grids y estructuras de página.'],
            ['name' => 'Botones y acciones', 'stack' => 'all', 'description' => 'Botones, menús de acción y controles.'],
            ['name' => 'Feedback', 'stack' => 'all', 'description' => 'Alertas, toasts, loaders y estados vacíos.'],
            ['name' => 'Autenticación', 'stack' => 'all', 'description' => 'Login, registro y recuperación de contraseña.'],
        ];

        foreach ($categories as $category) {
            Category::updateOrCreate(
                ['slug' => Str::slug($category['name'])],
                $category,
            );
        }
    }
}

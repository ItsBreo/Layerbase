<?php

namespace Tests\Feature\Component;

use App\Enums\ComponentFileType;
use App\Models\ComponentFile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Cómo se resuelve la URL de un archivo según su tipo.
 *
 * Lo que se protege es el modelo de negocio. El `source` de un componente de
 * pago ES el producto y solo puede viajar por una URL firmada y temporal. El
 * fallback para discos sin URLs firmadas devuelve una URL pública y PERMANENTE:
 * servir el source por ahí equivaldría a repartirlo saltándose la policy, y sin
 * caducidad. Antes se caía a ese fallback en silencio.
 */
class ProtectedFileUrlTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Disco local SIN `serve => true`: no soporta URLs temporales firmadas,
        // que es justo la mala configuración que se quiere detectar.
        config()->set('filesystems.disks.sin_firma', [
            'driver' => 'local',
            'root' => storage_path('framework/testing/sin_firma'),
            'url' => '/storage-sin-firma',
            'throw' => false,
        ]);
    }

    public function test_a_protected_file_refuses_to_degrade_to_a_permanent_url(): void
    {
        $file = $this->fileOfType(ComponentFileType::Source);

        // Falla ruidosamente en vez de filtrar el código: una mala
        // configuración de disco tiene que verse, no repartir el producto.
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessageMatches('/no soporta URLs temporales firmadas/');

        $file->temporaryUrl();
    }

    public function test_public_files_still_fall_back_to_a_plain_url(): void
    {
        // readme y preview son públicos por definición: aquí la URL permanente
        // es la correcta y no debe romper nada.
        foreach ([ComponentFileType::Readme, ComponentFileType::Preview] as $type) {
            $url = $this->fileOfType($type)->temporaryUrl();

            $this->assertNotSame('', $url);
            $this->assertStringContainsString('ejemplo', $url);
        }
    }

    public function test_the_configured_disk_does_produce_a_signed_url_for_the_source(): void
    {
        // El disco `local` real sí las soporta (serve => true en filesystems),
        // así que la configuración por defecto del proyecto es válida.
        $file = $this->fileOfType(ComponentFileType::Source, disk: 'local');

        $this->assertStringContainsString('signature=', $file->temporaryUrl());
    }

    public function test_a_local_url_comes_back_relative_so_the_browser_can_reach_it(): void
    {
        $url = $this->fileOfType(ComponentFileType::Source, disk: 'local')->temporaryUrl();

        // En Docker, el SPA llega por el proxy de Vite y Laravel ve el host
        // INTERNO (`nginx`), con el que firmaba la URL. El navegador recibía
        // `http://nginx/storage/...`, un host que no puede resolver: la descarga
        // fallaba en silencio y el editor y la vista previa salían vacíos.
        $this->assertStringStartsWith('/', $url);
        $this->assertStringNotContainsString('://', $url);
        // La firma tiene que sobrevivir al recorte del host.
        $this->assertStringContainsString('signature=', $url);
        $this->assertStringContainsString('expires=', $url);
    }

    public function test_a_public_file_url_is_also_relative(): void
    {
        // Mismo motivo: el README se descarga desde el navegador para poder
        // editarlo, así que tampoco puede apuntar al host interno.
        $url = $this->fileOfType(ComponentFileType::Readme, disk: 'local')->temporaryUrl();

        $this->assertStringStartsWith('/', $url);
        $this->assertStringNotContainsString('://', $url);
    }

    /** Fila de archivo suelta: no hace falta componente para resolver la URL. */
    private function fileOfType(ComponentFileType $type, string $disk = 'sin_firma'): ComponentFile
    {
        $file = new ComponentFile([
            'type' => $type,
            'disk' => $disk,
            'path' => "components/1/{$type->value}/ejemplo.bin",
            'filename' => 'ejemplo.bin',
            'mime_type' => 'application/octet-stream',
            'size_bytes' => 10,
        ]);
        $file->component_id = 1;

        return $file;
    }
}

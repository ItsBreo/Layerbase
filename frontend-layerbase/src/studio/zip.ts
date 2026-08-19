/**
 * Empaquetado y lectura del código de un componente.
 *
 * Un componente son VARIOS ficheros (el componente, sus estilos, sus tipos),
 * así que el código viaja como un ZIP de verdad con `fflate`.
 *
 * Antes esto era un empaquetador escrito a mano que solo sabía meter UN fichero
 * y sin comprimir (método STORE), y el lector lanzaba excepción con cualquier
 * ZIP comprimido. Eso limitaba la plataforma a componentes de un solo archivo y,
 * peor, un ZIP subido por la API con cualquier herramienta normal rompía el
 * render en vivo.
 *
 * El backend no se entera de nada de esto: para él el ZIP es una caja opaca.
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type { Stack } from '@/studio/types'

/** Los ficheros de un componente: nombre → contenido. */
export type ComponentFiles = Record<string, string>

/** Extensión de código principal según el stack. */
const MAIN_EXTENSION: Record<Stack, string> = {
  react: 'jsx',
  angular: 'ts',
  vanilla: 'js',
}

/** Nombres que se consideran punto de entrada, en orden de preferencia. */
const ENTRY_CANDIDATES = ['App.jsx', 'App.js', 'App.tsx', 'App.ts', 'index.jsx', 'index.js']

/** Ficheros de partida de un componente nuevo. */
export function defaultFilesFor(stack: Stack): ComponentFiles {
  const name = `App.${MAIN_EXTENSION[stack]}`

  if (stack === 'react') {
    return {
      [name]: `export default function App() {\n  return <div style={{ padding: 24 }}>Tu componente aquí</div>\n}\n`,
    }
  }

  return { [name]: '// Tu componente aquí\n' }
}

/**
 * Cuál de los ficheros es el punto de entrada.
 *
 * Se busca un `App.*` y, si no lo hay, se toma el primero. Ese caso no es
 * teórico: los componentes subidos antes de esto tienen un único fichero
 * llamado `component.jsx`, y tienen que seguir funcionando.
 */
export function entryFileOf(files: ComponentFiles): string {
  const names = Object.keys(files)

  return ENTRY_CANDIDATES.find((candidate) => names.includes(candidate)) ?? names[0] ?? ''
}

/** Empaqueta los ficheros en un `File` .zip listo para subir como `source`. */
export function filesToSourceFile(files: ComponentFiles): File {
  const entries = Object.fromEntries(
    Object.entries(files).map(([name, content]) => [name, strToU8(content)]),
  )

  // level 6: compresión razonable sin penalizar el guardado. El límite de
  // subida son 5 MB y el código de un componente rara vez se acerca.
  const zipped = zipSync(entries, { level: 6 })

  return new File([zipped as BlobPart], 'source.zip', { type: 'application/zip' })
}

/**
 * Extrae los ficheros de texto de un ZIP.
 *
 * Se ignoran las entradas de directorio y cualquier fichero que no sea texto
 * decodificable: el editor no sabría qué hacer con un binario, y colarlo
 * rompería el sandbox.
 */
export function unzipFiles(buffer: ArrayBuffer): ComponentFiles {
  const raw = unzipSync(new Uint8Array(buffer))
  const files: ComponentFiles = {}

  for (const [name, bytes] of Object.entries(raw)) {
    // Las carpetas aparecen como entradas vacías terminadas en '/'.
    if (name.endsWith('/') || bytes.length === 0) continue

    try {
      files[name] = strFromU8(bytes)
    } catch {
      // Binario dentro del zip: se omite en vez de reventar la lectura entera.
    }
  }

  return files
}

/**
 * Traduce los ficheros al mapa que espera Sandpack.
 *
 * La plantilla `react` de Sandpack arranca importando `./App` desde su
 * `index.js`, así que SIEMPRE tiene que existir un `/App.js`. Cuando el punto
 * de entrada se llama de otra forma —`component.jsx` en los componentes
 * antiguos— no se renombra: se añade un `/App.js` que reexporta el original.
 * Renombrarlo rompería los imports relativos entre ficheros del propio autor.
 */
export function toSandpackFiles(files: ComponentFiles): Record<string, string> {
  const mounted: Record<string, string> = {}

  for (const [name, content] of Object.entries(files)) {
    mounted[`/${name}`] = content
  }

  const entry = entryFileOf(files)

  if (entry && !ENTRY_CANDIDATES.slice(0, 2).includes(entry)) {
    const withoutExtension = entry.replace(/\.[^.]+$/, '')
    mounted['/App.js'] = `export { default } from './${withoutExtension}'\n`
  }

  return mounted
}

/** Convierte el Markdown del README en un File .md listo para subir. */
export function readmeToFile(markdown: string): File {
  return new File([markdown], 'README.md', { type: 'text/markdown' })
}

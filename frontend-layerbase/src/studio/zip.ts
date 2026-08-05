/**
 * Empaquetador ZIP mínimo (método STORE, sin compresión) sin dependencias.
 *
 * El backend acepta el código fuente (`source`) solo como `application/zip`,
 * pero el editor Monaco produce texto plano. Esta utilidad envuelve ese texto
 * en un ZIP válido de un único archivo, que finfo detecta como application/zip.
 *
 * STORE es suficiente para el MVP: el objetivo no es comprimir, sino cumplir el
 * contrato de tipo. Si más adelante se necesitan varios archivos o compresión,
 * conviene migrar a una librería (p. ej. jszip).
 */

/** Tabla CRC32 precomputada (polinomio 0xEDB88320). */
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date = new Date()): { time: number; date: number } {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)
  const d = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, date: d }
}

/** Escribe un entero little-endian en `view` en la posición `offset`. */
function writeUint(view: DataView, offset: number, value: number, bytes: 2 | 4): void {
  if (bytes === 2) view.setUint16(offset, value & 0xffff, true)
  else view.setUint32(offset, value >>> 0, true)
}

/**
 * Crea un Blob ZIP (application/zip) con un único archivo `filename` cuyo
 * contenido es `content` (texto UTF-8).
 */
export function zipTextFile(filename: string, content: string): Blob {
  const encoder = new TextEncoder()
  const nameBytes = encoder.encode(filename)
  const dataBytes = encoder.encode(content)
  const crc = crc32(dataBytes)
  const { time, date } = dosDateTime()

  const LOCAL_HEADER = 30
  const CENTRAL_HEADER = 46
  const END_RECORD = 22

  const localHeaderSize = LOCAL_HEADER + nameBytes.length
  const centralSize = CENTRAL_HEADER + nameBytes.length
  const total = localHeaderSize + dataBytes.length + centralSize + END_RECORD

  const buffer = new ArrayBuffer(total)
  const view = new DataView(buffer)
  const out = new Uint8Array(buffer)
  let offset = 0

  // --- Local file header ---
  writeUint(view, offset, 0x04034b50, 4) // firma
  writeUint(view, offset + 4, 20, 2) // versión necesaria
  writeUint(view, offset + 6, 0, 2) // flags
  writeUint(view, offset + 8, 0, 2) // método: 0 = STORE
  writeUint(view, offset + 10, time, 2)
  writeUint(view, offset + 12, date, 2)
  writeUint(view, offset + 14, crc, 4)
  writeUint(view, offset + 18, dataBytes.length, 4) // tamaño comprimido
  writeUint(view, offset + 22, dataBytes.length, 4) // tamaño sin comprimir
  writeUint(view, offset + 26, nameBytes.length, 2)
  writeUint(view, offset + 28, 0, 2) // extra field length
  out.set(nameBytes, offset + LOCAL_HEADER)
  out.set(dataBytes, offset + localHeaderSize)
  offset += localHeaderSize + dataBytes.length

  // --- Central directory ---
  const centralStart = offset
  writeUint(view, offset, 0x02014b50, 4) // firma
  writeUint(view, offset + 4, 20, 2) // versión creadora
  writeUint(view, offset + 6, 20, 2) // versión necesaria
  writeUint(view, offset + 8, 0, 2) // flags
  writeUint(view, offset + 10, 0, 2) // método STORE
  writeUint(view, offset + 12, time, 2)
  writeUint(view, offset + 14, date, 2)
  writeUint(view, offset + 16, crc, 4)
  writeUint(view, offset + 20, dataBytes.length, 4)
  writeUint(view, offset + 24, dataBytes.length, 4)
  writeUint(view, offset + 28, nameBytes.length, 2)
  writeUint(view, offset + 30, 0, 2) // extra
  writeUint(view, offset + 32, 0, 2) // comentario
  writeUint(view, offset + 34, 0, 2) // disco
  writeUint(view, offset + 36, 0, 2) // atributos internos
  writeUint(view, offset + 38, 0, 4) // atributos externos
  writeUint(view, offset + 42, 0, 4) // offset del local header
  out.set(nameBytes, offset + CENTRAL_HEADER)
  offset += centralSize

  // --- End of central directory ---
  writeUint(view, offset, 0x06054b50, 4) // firma
  writeUint(view, offset + 4, 0, 2) // disco
  writeUint(view, offset + 6, 0, 2) // disco con central dir
  writeUint(view, offset + 8, 1, 2) // entradas en este disco
  writeUint(view, offset + 10, 1, 2) // entradas totales
  writeUint(view, offset + 12, centralSize, 4) // tamaño central dir
  writeUint(view, offset + 16, centralStart, 4) // offset central dir
  writeUint(view, offset + 20, 0, 2) // comentario

  return new Blob([buffer], { type: 'application/zip' })
}

/** Envuelve el código en un File .zip listo para subir como `source`. */
export function codeToSourceFile(code: string, stack: string): File {
  const ext = stack === 'angular' ? 'ts' : stack === 'vanilla' ? 'js' : 'jsx'
  const blob = zipTextFile(`component.${ext}`, code)
  return new File([blob], 'source.zip', { type: 'application/zip' })
}

/** Convierte el Markdown del README en un File .md listo para subir. */
export function readmeToFile(markdown: string): File {
  return new File([markdown], 'README.md', { type: 'text/markdown' })
}

/**
 * Extrae el texto del primer archivo de un ZIP con método STORE (el que produce
 * `zipTextFile`). Sirve para recuperar el código de un componente guardado y
 * previsualizarlo. No soporta DEFLATE: para zips comprimidos externos lanza.
 */
export function unzipFirstTextFile(buffer: ArrayBuffer): string {
  const view = new DataView(buffer)
  // Firma del local file header.
  if (buffer.byteLength < 30 || view.getUint32(0, true) !== 0x04034b50) {
    throw new Error('No es un ZIP válido.')
  }
  const method = view.getUint16(8, true)
  if (method !== 0) {
    throw new Error('Solo se admite ZIP sin compresión (STORE).')
  }
  const compressedSize = view.getUint32(18, true)
  const nameLength = view.getUint16(26, true)
  const extraLength = view.getUint16(28, true)
  const dataStart = 30 + nameLength + extraLength
  const bytes = new Uint8Array(buffer, dataStart, compressedSize)
  return new TextDecoder().decode(bytes)
}

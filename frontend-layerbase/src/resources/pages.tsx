/**
 * Las tres páginas de Recursos, con sus secciones en orden.
 *
 * Las claves coinciden con `resources.<doc>.sections.<clave>` (encabezado) y
 * `resources.<doc>.content.<clave>` (cuerpo en Markdown) de `messages.ts`.
 */
import { ResourcePage } from '@/resources/ResourcePage'

const DOCS = ['what', 'stacks', 'files', 'lifecycle', 'access']

const PUBLISHING = ['before', 'create', 'code', 'readme', 'cover', 'submit', 'rejected']

const BEST_PRACTICES = ['readme', 'cover', 'livePreview', 'naming', 'tags', 'pricing']

export function DocsPage() {
  return <ResourcePage doc="docs" sections={DOCS} />
}

export function PublishingPage() {
  return <ResourcePage doc="publishing" sections={PUBLISHING} />
}

export function BestPracticesPage() {
  return <ResourcePage doc="bestPractices" sections={BEST_PRACTICES} />
}

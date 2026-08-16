/**
 * Los cuatro documentos legales.
 *
 * Cada uno declara sus secciones; todas nacen `pending` porque el texto está
 * sin redactar. Al rellenar una sección en `messages.ts` (bajo
 * `legal.<doc>.content.<clave>`), se le quita el `pending` y deja de mostrar el
 * aviso.
 *
 * Las secciones no son decorativas: son las que un marketplace que cobra y
 * trata datos personales en la UE tiene que cubrir.
 */
import { LegalPage, type LegalSection } from '@/legal/LegalPage'

const TERMS: LegalSection[] = [
  { key: 'identity', pending: true },
  { key: 'purpose', pending: true },
  { key: 'accounts', pending: true },
  { key: 'authorContent', pending: true },
  { key: 'licensing', pending: true },
  { key: 'moderation', pending: true },
  { key: 'liability', pending: true },
  { key: 'law', pending: true },
]

const PRIVACY: LegalSection[] = [
  { key: 'controller', pending: true },
  { key: 'data', pending: true },
  { key: 'purposes', pending: true },
  { key: 'legalBasis', pending: true },
  { key: 'processors', pending: true },
  { key: 'retention', pending: true },
  { key: 'rights', pending: true },
  { key: 'claims', pending: true },
]

const BILLING: LegalSection[] = [
  { key: 'prices', pending: true },
  { key: 'payment', pending: true },
  { key: 'commission', pending: true },
  { key: 'payouts', pending: true },
  { key: 'invoices', pending: true },
  { key: 'refunds', pending: true },
  { key: 'withdrawal', pending: true },
]

const COOKIES: LegalSection[] = [
  { key: 'what', pending: true },
  { key: 'own', pending: true },
  { key: 'thirdParty', pending: true },
  { key: 'manage', pending: true },
]

export function TermsPage() {
  return <LegalPage doc="terms" sections={TERMS} />
}

export function PrivacyPage() {
  return <LegalPage doc="privacy" sections={PRIVACY} />
}

export function BillingPage() {
  return <LegalPage doc="billing" sections={BILLING} />
}

export function CookiesPage() {
  return <LegalPage doc="cookies" sections={COOKIES} />
}

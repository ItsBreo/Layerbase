/**
 * Titular con la ÚLTIMA palabra en el azul de marca (`--navy`, el del logo).
 *
 * Refuerza la identidad sin depender de partir las cadenas de i18n: funciona
 * igual en ES/EN ("Explorar componentes" → "componentes", "Explore components"
 * → "components"). Si el texto es de una sola palabra, la colorea entera.
 */
export function AccentedTitle({ text, className }: { text: string; className?: string }) {
  const at = text.lastIndexOf(' ')
  if (at === -1) {
    return (
      <h1 className={className}>
        <span className="text-navy">{text}</span>
      </h1>
    )
  }
  return (
    <h1 className={className}>
      {text.slice(0, at)} <span className="text-navy">{text.slice(at + 1)}</span>
    </h1>
  )
}

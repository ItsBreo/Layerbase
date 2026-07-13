/** Utilidades de formato compartidas. */

/** Formatea un precio DECIMAL (string o number) a euros con coma decimal. */
export function formatPrice(price: string | number): string {
  const value = typeof price === 'string' ? Number.parseFloat(price) : price
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
    Number.isFinite(value) ? value : 0,
  )
}

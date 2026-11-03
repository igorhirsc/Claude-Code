/**
 * Single source of truth for store/contact details. Header, Footer, the
 * home Contact section and the /contato page all import from here so they
 * never drift apart. Placeholder values until SALABELLA supplies real ones.
 */
export const WHATSAPP_URL = 'https://wa.me/5511930834471'
export const INSTAGRAM_URL = 'https://instagram.com/salabella'
export const PINTEREST_URL = 'https://pinterest.com/salabella'

export const ADDRESS_LINES = ['Alameda Lorena, 1288 — Jardins', 'São Paulo – SP, 01424-001'] as const
export const MAPS_URL = 'https://maps.google.com/?q=Alameda+Lorena+1288+Sao+Paulo'
export const HOURS_LINES = ['Terça a sábado, 10h às 19h', 'Domingo e segunda, com hora marcada'] as const

export const PHONE_DISPLAY = '+55 11 3083-4471'
export const PHONE_HREF = 'tel:+551130834471'
export const EMAIL = 'atelier@salabella.com.br'
export const EMAIL_HREF = `mailto:${EMAIL}`

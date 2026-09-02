import { StoreFooterLinkItem } from '../models/store-footer.model';

export const RECOMMENDED_FOOTER_NOSOTROS_LINKS: StoreFooterLinkItem[] = [
  { name: 'Acerca de nosotros', href: '/acerca-de-nosotros' },
  { name: 'Ventas al por mayor', href: '/ventas-al-por-mayor' },
];

export const RECOMMENDED_FOOTER_INFORMACION_LINKS: StoreFooterLinkItem[] = [
  { name: 'Términos y condiciones', href: '/terminos-y-condiciones' },
  { name: 'Libro de reclamaciones', href: '/libro-de-reclamaciones' },
  { name: 'Política de privacidad', href: '/politica-de-privacidad' },
  { name: 'Política de cookies', href: '/politica-de-cookies' },
];

export const RECOMMENDED_FOOTER_AYUDA_LINKS: StoreFooterLinkItem[] = [
  {
    name: 'Políticas de garantía y devoluciones',
    href: '/politicas-de-garantia-y-devoluciones',
  },
  { name: 'Tarifas y zonas de reparto', href: '/tarifas-y-zonas-de-reparto' },
  { name: 'Mi cuenta', href: '/micuenta/miperfil' },
];

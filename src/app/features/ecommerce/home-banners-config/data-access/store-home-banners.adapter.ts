import {
  StoreHeroSlide,
  StoreOfferBanner,
  StorePromoBanner,
} from '../models/store-home-banners.model';

function adaptHeroSlide(raw: unknown): StoreHeroSlide {
  const item = raw as Record<string, unknown>;

  return {
    id: typeof item['id'] === 'string' ? item['id'] : undefined,
    imageUrl: String(item['imageUrl'] ?? ''),
    href: String(item['href'] ?? ''),
    alt: String(item['alt'] ?? 'Banner promocional'),
    order: Number(item['order'] ?? 0),
    isActive: item['isActive'] !== false,
  };
}

function adaptPromoBanner(raw: unknown): StorePromoBanner {
  const item = raw as Record<string, unknown>;

  return {
    id: typeof item['id'] === 'string' ? item['id'] : undefined,
    imageUrl: String(item['imageUrl'] ?? ''),
    href: String(item['href'] ?? ''),
    order: Number(item['order'] ?? 0),
    isActive: item['isActive'] !== false,
  };
}

export function adaptHeroSlidesResponse(raw: unknown): StoreHeroSlide[] {
  const data = raw as Record<string, unknown>;
  const slides = Array.isArray(data['slides'])
    ? data['slides'].map(adaptHeroSlide)
    : [];

  return [...slides].sort((a, b) => a.order - b.order);
}

export function adaptPromoBannersResponse(raw: unknown): StorePromoBanner[] {
  const data = raw as Record<string, unknown>;
  const banners = Array.isArray(data['banners'])
    ? data['banners'].map(adaptPromoBanner)
    : [];

  return [...banners].sort((a, b) => a.order - b.order);
}

function adaptOfferBanner(raw: unknown): StoreOfferBanner {
  const item = raw as Record<string, unknown>;

  return {
    id: typeof item['id'] === 'string' ? item['id'] : undefined,
    imageUrl: String(item['imageUrl'] ?? ''),
    href: String(item['href'] ?? ''),
    altText: String(item['alt'] ?? item['altText'] ?? 'Banner promocional del home'),
    isActive: item['status'] !== false && item['isActive'] !== false,
  };
}

export function adaptOfferBannerResponse(raw: unknown): StoreOfferBanner {
  const data = raw as Record<string, unknown>;
  const banner = data['banner'];

  if (!banner || typeof banner !== 'object') {
    return {
      imageUrl: '',
      href: '/tienda',
      altText: 'Banner promocional del home',
      isActive: true,
    };
  }

  return adaptOfferBanner(banner);
}

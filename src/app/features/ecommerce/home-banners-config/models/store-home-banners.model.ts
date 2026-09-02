export interface StoreHeroSlide {
  id?: string;
  imageUrl: string;
  href: string;
  alt: string;
  order: number;
  isActive: boolean;
}

export interface StorePromoBanner {
  id?: string;
  imageUrl: string;
  href: string;
  order: number;
  isActive: boolean;
}

export interface StoreOfferBanner {
  id?: string;
  imageUrl: string;
  href: string;
  altText: string;
  isActive: boolean;
}

export interface StoreHomeBannersFormModel {
  heroSlides: StoreHeroSlide[];
  promoBanners: StorePromoBanner[];
  offerBanner: StoreOfferBanner;
}

export interface StoreOfferBannerPayload {
  imageUrl: string;
  href: string;
  altText?: string;
  isActive?: boolean;
}

export interface StoreHeroSlidesPayload {
  slides: Array<{
    id?: string;
    imageUrl: string;
    href: string;
    alt?: string;
    order: number;
    isActive?: boolean;
  }>;
}

export interface StorePromoBannersPayload {
  banners: Array<{
    id?: string;
    imageUrl: string;
    href: string;
    order: number;
    isActive?: boolean;
  }>;
}

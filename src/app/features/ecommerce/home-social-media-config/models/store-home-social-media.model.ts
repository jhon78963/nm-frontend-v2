export type StoreSocialMediaPlatform = 'tiktok' | 'instagram';

export interface StoreSocialMediaBanner {
  id?: string;
  imageUrl: string;
  href: string;
  status: boolean;
  order: number;
}

export interface StoreHomeSocialMediaConfig {
  status: boolean;
  title: string;
  platform: StoreSocialMediaPlatform;
  profileUrl: string;
  banners: StoreSocialMediaBanner[];
}

export type StoreHomeSocialMediaFormModel = StoreHomeSocialMediaConfig;

export interface StoreHomeSocialMediaPayload {
  status: boolean;
  title: string;
  platform: StoreSocialMediaPlatform;
  profileUrl?: string;
  banners: Array<{
    id?: string;
    imageUrl: string;
    href?: string;
    status: boolean;
    order: number;
  }>;
}

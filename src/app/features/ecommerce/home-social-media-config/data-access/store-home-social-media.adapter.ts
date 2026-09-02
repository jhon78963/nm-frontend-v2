import {
  StoreHomeSocialMediaConfig,
  StoreSocialMediaBanner,
  StoreSocialMediaPlatform,
} from '../models/store-home-social-media.model';

function adaptPlatform(raw: unknown): StoreSocialMediaPlatform {
  return raw === 'instagram' ? 'instagram' : 'tiktok';
}

function adaptBanner(raw: unknown): StoreSocialMediaBanner {
  const item = raw as Record<string, unknown>;

  return {
    id: typeof item['id'] === 'string' ? item['id'] : undefined,
    imageUrl: String(item['imageUrl'] ?? ''),
    href: String(item['href'] ?? ''),
    status: item['status'] !== false,
    order: Number(item['order'] ?? 0),
  };
}

export function adaptHomeSocialMediaResponse(raw: unknown): StoreHomeSocialMediaConfig {
  const data = raw as Record<string, unknown>;
  const socialMedia = data['socialMedia'] as Record<string, unknown> | null;

  if (!socialMedia) {
    return {
      status: true,
      title: '# TIKTOK',
      platform: 'tiktok',
      profileUrl: '',
      banners: [],
    };
  }

  const banners = Array.isArray(socialMedia['banners'])
    ? socialMedia['banners'].map(adaptBanner)
    : [];

  return {
    status: socialMedia['status'] !== false,
    title: String(socialMedia['title'] ?? ''),
    platform: adaptPlatform(socialMedia['platform']),
    profileUrl: String(socialMedia['profileUrl'] ?? ''),
    banners: [...banners].sort((a, b) => a.order - b.order),
  };
}

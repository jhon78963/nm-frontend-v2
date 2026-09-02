import {
  StoreFooterConfig,
  StoreFooterLinkItem,
} from '../models/store-footer.model';

function adaptLinkItem(raw: unknown): StoreFooterLinkItem {
  const item = raw as Record<string, unknown>;

  return {
    id: typeof item['id'] === 'string' ? item['id'] : undefined,
    name: String(item['name'] ?? ''),
    href: String(item['href'] ?? ''),
  };
}

function adaptLinkItems(raw: unknown): StoreFooterLinkItem[] {
  return Array.isArray(raw) ? raw.map(adaptLinkItem) : [];
}

function adaptFooterConfig(raw: unknown): StoreFooterConfig {
  const data = raw as Record<string, unknown>;

  return {
    newsletterTitle: String(data['newsletterTitle'] ?? ''),
    newsletterSubtitle: String(data['newsletterSubtitle'] ?? ''),
    aboutText: String(data['aboutText'] ?? ''),
    address: String(data['address'] ?? ''),
    supportNumber: String(data['supportNumber'] ?? ''),
    supportEmail: String(data['supportEmail'] ?? ''),
    socialMediaEnabled: data['socialMediaEnabled'] !== false,
    facebookUrl: String(data['facebookUrl'] ?? ''),
    twitterUrl: String(data['twitterUrl'] ?? ''),
    instagramUrl: String(data['instagramUrl'] ?? ''),
    pinterestUrl: String(data['pinterestUrl'] ?? ''),
    tiktokUrl: String(data['tiktokUrl'] ?? ''),
    categories: adaptLinkItems(data['categories']),
    usefulLinks: adaptLinkItems(data['usefulLinks']),
    helpCenterLinks: adaptLinkItems(data['helpCenterLinks']),
    copyrightEnabled: data['copyrightEnabled'] !== false,
    copyrightContent: String(data['copyrightContent'] ?? ''),
    paymentImageUrl: String(data['paymentImageUrl'] ?? ''),
  };
}

export function adaptFooterResponse(raw: unknown): StoreFooterConfig {
  const data = raw as Record<string, unknown>;
  const footer = data['footer'];

  if (!footer || typeof footer !== 'object') {
    return adaptFooterConfig({});
  }

  return adaptFooterConfig(footer);
}

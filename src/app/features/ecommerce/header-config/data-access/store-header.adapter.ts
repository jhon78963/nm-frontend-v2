import {
  StoreHeaderConfig,
  StoreNavigationItem,
} from '../models/store-header.model';

function adaptNavigationItem(raw: unknown): StoreNavigationItem {
  const item = raw as Record<string, unknown>;

  return {
    id: typeof item['id'] === 'string' ? item['id'] : undefined,
    label: String(item['label'] ?? ''),
    href: String(item['href'] ?? ''),
    order: Number(item['order'] ?? 0),
    isActive: item['isActive'] !== false,
    parentId:
      typeof item['parentId'] === 'string'
        ? item['parentId']
        : item['parentId'] === null
          ? null
          : undefined,
  };
}

export function adaptStoreHeader(raw: unknown): StoreHeaderConfig {
  const data = raw as Record<string, unknown>;
  const navigationItems = Array.isArray(data['navigationItems'])
    ? data['navigationItems'].map(adaptNavigationItem)
    : [];

  return {
    id: typeof data['id'] === 'string' ? data['id'] : null,
    topbarMessage:
      typeof data['topbarMessage'] === 'string' ? data['topbarMessage'] : null,
    supportPhone:
      typeof data['supportPhone'] === 'string' ? data['supportPhone'] : null,
    logoText: String(data['logoText'] ?? ''),
    logoUrl: typeof data['logoUrl'] === 'string' ? data['logoUrl'] : null,
    topBarEnabled: data['topBarEnabled'] !== false,
    stickyEnabled: data['stickyEnabled'] !== false,
    navigationItems: [...navigationItems].sort((a, b) => a.order - b.order),
  };
}

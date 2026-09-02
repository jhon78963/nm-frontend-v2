import {
  StoreShopCollectionItem,
  StoreShopCollectionsConfig,
} from '../models/store-shop-collections.model';

function adaptCollectionItem(raw: unknown): StoreShopCollectionItem {
  const item = raw as Record<string, unknown>;
  const slug = String(item['slug'] ?? item['id'] ?? '');

  return {
    id: String(item['id'] ?? slug),
    slug,
    label: String(item['label'] ?? ''),
    description: String(item['description'] ?? ''),
    bannerImageUrl: String(item['bannerImageUrl'] ?? ''),
    status: item['status'] !== false,
    productIds: Array.isArray(item['productIds'])
      ? item['productIds'].map((id) => String(id))
      : [],
  };
}

export function adaptShopCollectionsResponse(raw: unknown): StoreShopCollectionsConfig {
  const data = raw as Record<string, unknown>;
  const collections = Array.isArray(data['collections'])
    ? data['collections'].map(adaptCollectionItem)
    : [];

  return { collections };
}

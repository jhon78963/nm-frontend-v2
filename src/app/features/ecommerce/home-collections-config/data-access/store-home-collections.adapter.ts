import {
  StoreHomeCollectionItem,
  StoreHomeCollectionsConfig,
} from '../models/store-home-collections.model';

function adaptCollectionItem(raw: unknown): StoreHomeCollectionItem {
  const item = raw as Record<string, unknown>;

  return {
    id: String(item['id'] ?? ''),
    tag: String(item['tag'] ?? ''),
    title: String(item['title'] ?? ''),
    description: String(item['description'] ?? ''),
    status: item['status'] !== false,
    productIds: Array.isArray(item['productIds'])
      ? item['productIds'].map((id) => String(id))
      : [],
  };
}

export function adaptHomeCollectionsResponse(raw: unknown): StoreHomeCollectionsConfig {
  const data = raw as Record<string, unknown>;
  const collections = Array.isArray(data['collections'])
    ? data['collections'].map(adaptCollectionItem)
    : [];

  return { collections };
}

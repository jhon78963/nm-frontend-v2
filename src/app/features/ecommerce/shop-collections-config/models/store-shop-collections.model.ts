export interface StoreShopCollectionItem {
  id: string;
  slug: string;
  label: string;
  description: string;
  bannerImageUrl: string;
  status: boolean;
  productIds: string[];
}

export interface StoreShopCollectionsConfig {
  collections: StoreShopCollectionItem[];
}

export interface StoreShopCollectionsFormModel {
  collections: StoreShopCollectionItem[];
}

export interface StoreShopCollectionsPayload {
  collections: Array<{
    id: string;
    slug: string;
    label: string;
    description?: string;
    bannerImageUrl?: string;
    status: boolean;
    productIds: string[];
  }>;
}

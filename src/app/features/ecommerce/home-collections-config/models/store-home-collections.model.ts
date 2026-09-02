export interface StoreHomeCollectionItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  status: boolean;
  productIds: string[];
}

export interface StoreHomeCollectionsConfig {
  collections: StoreHomeCollectionItem[];
}

export interface StoreHomeCollectionsFormModel {
  collections: StoreHomeCollectionItem[];
}

export interface StoreHomeCollectionsPayload {
  collections: Array<{
    id: string;
    tag?: string;
    title: string;
    description?: string;
    status: boolean;
    productIds: string[];
  }>;
}

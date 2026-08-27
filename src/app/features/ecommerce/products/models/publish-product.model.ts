export interface PublishProductMediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  isPrimary: boolean;
}

export interface PublishProduct {
  id: string;
  name: string;
  barcode: string;
  description: string;
  status: string;
  genderId: string;
  warehouseId: string;
  percentageDiscount: number;
  cashDiscount: number;
  isFeatured: boolean;
  isOnSale: boolean;
  wooStatus: 'draft' | 'publish' | null;
  media: PublishProductMediaItem[];
  wooCommerce?: {
    productId: string | null;
    lastSyncedAt: string | null;
  };
}

export interface PublishProductListResponse {
  data: PublishProduct[];
  paginate: {
    total: number;
    pages: number;
  };
}

export interface PublishProductPayload {
  id?: string;
  name: string;
  barcode: string;
  description: string;
  status: string;
  genderId: string;
  warehouseId: string;
  percentageDiscount?: number;
  cashDiscount?: number;
  isFeatured?: boolean;
  isOnSale?: boolean;
  wooStatus?: 'draft' | 'publish' | null;
}

export interface PublishProductFormModel {
  name: string;
  barcode: string;
  description: string;
  genderId: string | null;
  warehouseId: string | null;
}

export interface PublishVariantFormModel {
  sizeId: string | null;
  colorId: string | null;
  salePrice: number | null;
  minSalePrice: number | null;
  stock: number;
}

export interface PublishSettingsFormModel {
  isFeatured: boolean;
  isOnSale: boolean;
  percentageDiscount: string;
  cashDiscount: string;
  wooStatus: 'draft' | 'publish';
}

export interface EcommerceStepState {
  isPublished: boolean;
  wooProductId: string | null;
  wooUrl: string | null;
  syncStatus: 'synced' | 'pending' | 'error' | 'never';
  lastSyncError: string | null;
  lastSyncedAt: string | null;
}

export interface EcommercePublishFormModel {
  publishOnline: boolean;
  wooDescription: string;
  onlinePrice: number | null;
}

export interface CatalogOption {
  id: string;
  description: string;
}

export interface WarehouseOption {
  id: string;
  name: string;
}

export interface GenderOption {
  id: string;
  description: string;
}

export interface ProductSizePayload {
  barcode?: number;
  stock?: number;
  purchasePrice?: number;
  salePrice?: number;
  minSalePrice?: number;
}

export interface ProductColorPayload {
  stock: number;
}

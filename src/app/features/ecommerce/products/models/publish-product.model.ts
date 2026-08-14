export interface PublishProductMediaItem {
  id: number;
  url: string;
  type: 'image' | 'video';
  isPrimary: boolean;
}

export interface PublishProduct {
  id: number;
  name: string;
  barcode: string;
  description: string;
  status: string;
  genderId: number;
  warehouseId: number;
  percentageDiscount: number;
  cashDiscount: number;
  isFeatured: boolean;
  isOnSale: boolean;
  wooStatus: 'draft' | 'publish' | null;
  media: PublishProductMediaItem[];
  wooCommerce?: {
    productId: number | null;
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
  id?: number;
  name: string;
  barcode: string;
  description: string;
  status: string;
  genderId: number;
  warehouseId: number;
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
  genderId: number | null;
  warehouseId: number | null;
}

export interface PublishVariantFormModel {
  sizeId: number | null;
  colorId: number | null;
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
  wooProductId: number | null;
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
  id: number;
  description: string;
}

export interface WarehouseOption {
  id: number;
  name: string;
}

export interface GenderOption {
  id: number;
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

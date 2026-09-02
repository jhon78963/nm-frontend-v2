export interface StoreCategoryProductTab {
  id: string;
  name: string;
  slug?: string;
  productIds: string[];
}

export interface StoreCategoryProductLeftPanel {
  title: string;
  status: boolean;
  productIds: string[];
}

export interface StoreCategoryProductCategory {
  title: string;
  status: boolean;
  tabs: StoreCategoryProductTab[];
}

export interface StoreCategoryProductBanner {
  status: boolean;
  imageUrl: string;
  href: string;
  alt?: string;
}

export interface StoreCategoryProductRightPanel {
  productCategory: StoreCategoryProductCategory;
  productBanner: StoreCategoryProductBanner;
}

export interface StoreHomeCategoryProductsConfig {
  status: boolean;
  leftPanel: StoreCategoryProductLeftPanel;
  rightPanel: StoreCategoryProductRightPanel;
}

export type StoreHomeCategoryProductsFormModel = StoreHomeCategoryProductsConfig;

export type StoreHomeCategoryProductsPayload = StoreHomeCategoryProductsConfig;

export interface ProductEcommerceFormModel {
  storeStatus: 'draft' | 'publish';
  shortDescription: string;
  description: string;
  additionalInfo: string;
  isNew: boolean;
  isFeatured: boolean;
  isOnSale: boolean;
  percentageDiscount: string;
  cashDiscount: string;
  offerPrice: string;
}

export const EMPTY_PRODUCT_ECOMMERCE_FORM: ProductEcommerceFormModel = {
  storeStatus: 'draft',
  shortDescription: '',
  description: '',
  additionalInfo: '',
  isNew: false,
  isFeatured: false,
  isOnSale: false,
  percentageDiscount: '',
  cashDiscount: '',
  offerPrice: '',
};

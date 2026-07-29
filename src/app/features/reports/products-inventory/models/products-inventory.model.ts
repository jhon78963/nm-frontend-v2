export interface ProductInventoryColor {
  colorId: number;
  color: string;
  stock: number;
}

export interface ProductInventorySize {
  productSizeId: number;
  sizeId: number;
  size: string;
  barcode: string | null;
  purchasePrice: number | null;
  salePrice: number | null;
  minSalePrice: number | null;
  stock: number;
  colors: ProductInventoryColor[];
}

export interface ProductInventoryItem {
  id: number;
  name: string;
  sizes: ProductInventorySize[];
}

export type ProductsInventoryTableRow =
  | { kind: 'product'; name: string }
  | {
      kind: 'size';
      size: string;
      barcode: string | null;
      purchasePrice: number | null;
      salePrice: number | null;
      minSalePrice: number | null;
      sizeStock: number;
      colorsSummary: string;
      colorsStockSum: number | null;
      stockMismatch: boolean;
    };

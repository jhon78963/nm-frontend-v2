export interface KardexReportParams {
  warehouseId: string;
  productId: string;
  productSizeId: string;
  colorId: string | null;
  startDate: string;
  endDate: string;
}

export interface KardexReference {
  morphShort?: string | null;
  code?: string | null;
}

export interface KardexMovement {
  id: string;
  occurredAt: string;
  direction: 'IN' | 'OUT';
  movementTypeLabel: string;
  quantity: number;
  balanceAfterMovement: number;
  reference: KardexReference | null;
}

export interface KardexMeta {
  openingBalanceQuantity: number;
  closingBalanceQuantity: number;
  movementsCount: number;
  productName?: string;
  warehouseName?: string;
  startDate?: string;
  endDate?: string;
}

export interface KardexReport {
  meta: KardexMeta;
  movements: KardexMovement[];
}

export interface KardexFilterModel {
  startDate: string;
  endDate: string;
  productSizeId: string | null;
  colorId: string | null;
}

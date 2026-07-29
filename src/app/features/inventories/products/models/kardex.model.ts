export interface KardexReportParams {
  warehouseId: number;
  productId: number;
  productSizeId: number;
  colorId: number | null;
  startDate: string;
  endDate: string;
}

export interface KardexReference {
  morphShort?: string | null;
  code?: string | null;
}

export interface KardexMovement {
  id: number;
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
  productSizeId: number | null;
  colorId: number | null;
}

export type CouponDiscountType = 'percentage' | 'fixed';

export interface EcommerceCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  minSubtotal: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usageCount: number;
  perCustomerLimit: number;
  perIpLimit: number;
  isWelcome: boolean;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  warehouseId: string | null;
}

export interface EcommerceCouponsResponse {
  coupons: EcommerceCoupon[];
}

export interface CreateEcommerceCouponPayload {
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minSubtotal?: number;
  maxDiscount?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  perIpLimit?: number;
  isWelcome?: boolean;
  isActive?: boolean;
}

export interface UpdateEcommerceCouponPayload {
  description?: string;
  discountType?: CouponDiscountType;
  discountValue?: number;
  minSubtotal?: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  perCustomerLimit?: number;
  perIpLimit?: number;
  isActive?: boolean;
}

export const COUPON_DISCOUNT_TYPE_OPTIONS = [
  { value: 'percentage' as CouponDiscountType, label: 'Porcentaje (%)' },
  { value: 'fixed' as CouponDiscountType, label: 'Monto fijo (S/)' },
];

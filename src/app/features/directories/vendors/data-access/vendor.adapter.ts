import { Vendor, VendorListResponse } from '../models/vendor.model';

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function readOptionalString(value: unknown): string {
  const s = readString(value);
  return s === '-' ? '' : s;
}

export function adaptVendor(raw: unknown): Vendor {
  const r = raw as Record<string, unknown>;
  const balanceRaw = r['balance'];
  return {
    id: readNumber(r['id']),
    name: readString(r['name']),
    address: readOptionalString(r['address']),
    local: readOptionalString(r['local']),
    phone: readOptionalString(r['phone']),
    balance: (() => {
      if (balanceRaw === null || balanceRaw === undefined || balanceRaw === '-') {
        return null;
      }
      if (typeof balanceRaw === 'number' || typeof balanceRaw === 'string') {
        return balanceRaw;
      }
      return null;
    })(),
  };
}

export function adaptVendorList(raw: unknown): VendorListResponse {
  const r = raw as {
    data: unknown[];
    paginate: { total: number; pages: number };
  };

  return {
    data: (r.data ?? []).map(adaptVendor),
    paginate: {
      total: r.paginate?.total ?? 0,
      pages: r.paginate?.pages ?? 0,
    },
  };
}

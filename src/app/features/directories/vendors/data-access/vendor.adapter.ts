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
    id: String(r['id'] ?? ''),
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
  if (Array.isArray(raw)) {
    return {
      data: (raw as unknown[]).map(adaptVendor),
      paginate: { total: raw.length, pages: 1 },
    };
  }

  const r = raw as {
    data?: unknown[];
    paginate?: { total: number; pages: number };
    meta?: { total: number; lastPage: number };
  };

  const total = r.paginate?.total ?? r.meta?.total ?? 0;
  const pages = r.paginate?.pages ?? r.meta?.lastPage ?? 1;

  return {
    data: (r.data ?? []).map(adaptVendor),
    paginate: { total, pages },
  };
}

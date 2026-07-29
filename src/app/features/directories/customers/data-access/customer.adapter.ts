import { Customer, CustomerListResponse } from '../models/customer.model';

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

export function adaptCustomer(raw: unknown): Customer {
  const r = raw as Record<string, unknown>;
  return {
    id: readNumber(r['id']),
    dni: readString(r['dni']),
    name: readString(r['name']),
    surname: readString(r['surname']),
  };
}

export function adaptCustomerList(raw: unknown): CustomerListResponse {
  const r = raw as {
    data: unknown[];
    paginate: { total: number; pages: number };
  };

  return {
    data: (r.data ?? []).map(adaptCustomer),
    paginate: {
      total: r.paginate?.total ?? 0,
      pages: r.paginate?.pages ?? 0,
    },
  };
}

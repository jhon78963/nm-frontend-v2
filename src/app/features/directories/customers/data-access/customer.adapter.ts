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
  const documentNumber = readString(r['documentNumber'] ?? r['document_number']);
  const dni = readString(r['dni'] ?? documentNumber);

  if (r['surname'] !== undefined && r['surname'] !== null) {
    return {
      id: String(r['id'] ?? ''),
      dni,
      name: readString(r['name']),
      surname: readString(r['surname']),
    };
  }

  const fullName = readString(r['name']);
  const parts = fullName.split(/\s+/).filter(Boolean);
  const surname = parts.length > 1 ? parts[parts.length - 1] : '';
  const name = parts.length > 1 ? parts.slice(0, -1).join(' ') : fullName;

  return {
    id: String(r['id'] ?? ''),
    dni,
    name,
    surname,
  };
}

export function adaptCustomerList(raw: unknown): CustomerListResponse {
  if (Array.isArray(raw)) {
    return {
      data: (raw as unknown[]).map(adaptCustomer),
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
    data: (r.data ?? []).map(adaptCustomer),
    paginate: { total, pages },
  };
}

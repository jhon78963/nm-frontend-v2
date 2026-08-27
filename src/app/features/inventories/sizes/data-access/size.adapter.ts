import {
  Size,
  SizeDetail,
  SizeListResponse,
  SizeType,
} from '../models/size.model';

function readNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function adaptSize(raw: unknown): Size {
  const r = raw as Record<string, unknown>;
  const sizeTypeRaw = r['sizeType'];
  const sizeTypeLabel =
    typeof sizeTypeRaw === 'string'
      ? sizeTypeRaw
      : sizeTypeRaw && typeof sizeTypeRaw === 'object'
        ? readString((sizeTypeRaw as Record<string, unknown>)['description'])
        : '';
  return {
    id: r['id'] != null ? String(r['id']) : '',
    description: readString(r['description']),
    sizeTypeLabel,
  };
}

export function adaptSizeDetail(raw: unknown): SizeDetail {
  return adaptSize(raw);
}

export function adaptSizeList(raw: unknown): SizeListResponse {
  if (Array.isArray(raw)) {
    return {
      data: (raw as unknown[]).map(adaptSize),
      paginate: { total: raw.length, pages: 1 },
    };
  }

  const r = raw as {
    data?: unknown[];
    paginate?: { total?: number; pages?: number };
    meta?: { total?: number; lastPage?: number };
  };

  const total = readNumber(r.paginate?.total ?? r.meta?.total);
  const pages = readNumber(r.paginate?.pages ?? r.meta?.lastPage, 1);

  return {
    data: (r.data ?? []).map(adaptSize),
    paginate: { total, pages },
  };
}

export function adaptSizeType(raw: unknown): SizeType {
  const r = raw as Record<string, unknown>;
  return {
    id: r['id'] != null ? String(r['id']) : '',
    description: readString(r['description']),
  };
}

export function adaptSizeTypes(raw: unknown): SizeType[] {
  return Array.isArray(raw) ? raw.map(adaptSizeType) : [];
}

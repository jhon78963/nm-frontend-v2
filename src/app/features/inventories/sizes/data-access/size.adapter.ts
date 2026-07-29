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
  return {
    id: readNumber(r['id']),
    description: readString(r['description']),
    sizeTypeLabel: readString(r['sizeType']),
  };
}

export function adaptSizeDetail(raw: unknown): SizeDetail {
  return adaptSize(raw);
}

export function adaptSizeList(raw: unknown): SizeListResponse {
  const r = raw as {
    data: unknown[];
    paginate: { total: number; pages: number };
  };

  return {
    data: r.data.map(adaptSize),
    paginate: { total: r.paginate.total, pages: r.paginate.pages },
  };
}

export function adaptSizeType(raw: unknown): SizeType {
  const r = raw as Record<string, unknown>;
  return {
    id: readNumber(r['id']),
    description: readString(r['description']),
  };
}

export function adaptSizeTypes(raw: unknown): SizeType[] {
  return Array.isArray(raw) ? raw.map(adaptSizeType) : [];
}

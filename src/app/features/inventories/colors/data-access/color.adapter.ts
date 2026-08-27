import { Color, ColorListResponse } from '../models/color.model';

function readNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function normalizeColorHash(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '#000000';
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

export function adaptColor(raw: unknown): Color {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r['id'] ?? ''),
    description: readString(r['description']),
    hash: normalizeColorHash(readString(r['hash'], '#000000')),
  };
}

export function adaptColorList(raw: unknown): ColorListResponse {
  if (Array.isArray(raw)) {
    return {
      data: (raw as unknown[]).map(adaptColor),
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
    data: (r.data ?? []).map(adaptColor),
    paginate: { total, pages },
  };
}

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
    id: readNumber(r['id']),
    description: readString(r['description']),
    hash: normalizeColorHash(readString(r['hash'], '#000000')),
  };
}

export function adaptColorList(raw: unknown): ColorListResponse {
  const r = raw as {
    data: unknown[];
    paginate: { total: number; pages: number };
  };

  return {
    data: r.data.map(adaptColor),
    paginate: { total: r.paginate.total, pages: r.paginate.pages },
  };
}

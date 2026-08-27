import { ProfileData } from '../models/profile.model';

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const wrapped = raw as { data?: unknown };
  if (wrapped.data && typeof wrapped.data === 'object') {
    return wrapped.data as Record<string, unknown>;
  }

  return raw as Record<string, unknown>;
}

function readString(value: unknown, fallback = ''): string {
  if (value == null) {
    return fallback;
  }

  return String(value).trim();
}

function readNullableString(value: unknown): string | null {
  const text = readString(value);
  return text ? text : null;
}

function readNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readWarehouse(record: Record<string, unknown>): string {
  const warehouse = record['warehouse'];
  if (typeof warehouse === 'string' && warehouse.trim()) {
    return warehouse.trim();
  }

  if (warehouse && typeof warehouse === 'object') {
    const nested = readString((warehouse as { name?: unknown }).name);
    if (nested) {
      return nested;
    }
  }

  return readString(record['warehouseName']);
}

function normalizePhone(value: unknown): string | null {
  const raw = readNullableString(value);
  if (!raw) {
    return null;
  }

  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('51') && digits.length === 11) {
    return digits.slice(2);
  }

  return digits || null;
}

function resolveAvatarUrl(value: unknown): string | null {
  const raw = readNullableString(value);
  if (!raw) {
    return null;
  }

  if (raw.includes('/assets/img/avatars/')) {
    return null;
  }

  return raw;
}

export function adaptProfile(raw: unknown): ProfileData {
  const record = asRecord(raw);
  const firstName = readString(record['name']);
  const surname = readString(record['surname']);
  const fullName = surname ? `${firstName} ${surname}`.trim() : firstName;

  return {
    id: record['id'] != null ? String(record['id']) : '',
    name: fullName,
    email: readString(record['email']),
    phone: normalizePhone(record['phone']),
    avatarUrl: resolveAvatarUrl(record['avatarUrl'] ?? record['profilePicture']),
    role: readString(record['role'] ?? (Array.isArray(record['roles']) ? record['roles'][0] : '')),
    warehouse: readWarehouse(record),
    createdAt: readString(
      record['createdAt'] ?? record['created_at'] ?? record['creationTime'] ?? record['creation_time'],
    ),
  };
}

export function adaptAvatarUpload(raw: unknown): { avatarUrl: string } {
  const record = asRecord(raw);
  const avatarUrl =
    resolveAvatarUrl(record['avatarUrl'] ?? record['profilePicture'] ?? record['url']) ?? '';

  return { avatarUrl };
}

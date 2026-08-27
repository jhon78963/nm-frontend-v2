import { Team, TeamCreateResponse, TeamListResponse, WarehouseLookupOption } from '../models/team.model';

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

export function adaptTeam(raw: unknown): Team {
  const r = raw as Record<string, unknown>;
  const salaryRaw = r['salary'];
  return {
    id: String(r['id'] ?? ''),
    dni: readString(r['dni']),
    name: readString(r['name']),
    surname: readString(r['surname']),
    salary:
      salaryRaw === null || salaryRaw === undefined || salaryRaw === ''
        ? null
        : readNumber(salaryRaw),
    warehouseId: String(r['warehouseId'] ?? r['warehouse_id'] ?? ''),
    userId: (r['userId'] ?? r['user_id']) as string | null ?? null,
    userEmail: (r['userEmail'] ?? r['user_email']) as string | null ?? null,
  };
}

export function adaptTeamList(raw: unknown): TeamListResponse {
  if (Array.isArray(raw)) {
    return {
      data: (raw as unknown[]).map(adaptTeam),
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
    data: (r.data ?? []).map(adaptTeam),
    paginate: { total, pages },
  };
}

export function adaptTeamCreateResponse(raw: unknown): TeamCreateResponse {
  const r = raw as { message: string; data: unknown };
  return {
    message: readString(r.message, 'Colaborador creado.'),
    data: adaptTeam(r.data),
  };
}

export function adaptWarehouseLookupOptions(raw: unknown): WarehouseLookupOption[] {
  const r = raw as { data?: unknown[] };
  return (r.data ?? []).map((item) => {
    const w = item as Record<string, unknown>;
    return {
      id: String(w['id'] ?? ''),
      name: readString(w['name']),
      tenantId: (w['tenantId'] ?? w['tenant_id']) as string | null ?? null,
      tenantName: (w['tenantName'] ?? w['tenant_name']) as string | null ?? null,
    };
  });
}

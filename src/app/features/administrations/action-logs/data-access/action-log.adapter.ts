import {
  ActionLog,
  ActionLogListResponse,
  ActionLogTeam,
  ActionLogUser,
} from '../models/action-log.model';

function adaptActionLogUser(raw: unknown): ActionLogUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const user = raw as ActionLogUser;
  return {
    id: user.id,
    name: user.name ?? '',
    email: user.email ?? '',
  };
}

function adaptActionLogTeam(raw: unknown): ActionLogTeam | null {
  if (!raw || typeof raw !== 'object') return null;
  const team = raw as ActionLogTeam;
  return {
    id: team.id,
    name: team.name ?? '',
  };
}

export function adaptActionLog(raw: unknown): ActionLog {
  const r = raw as ActionLog;
  return {
    id: r.id,
    creationTime: r.creationTime,
    action: r.action,
    description: r.description ?? null,
    metadata: r.metadata ?? null,
    ipAddress: r.ipAddress ?? null,
    warehouseId: r.warehouseId ?? null,
    userName: r.userName ?? r.user?.name ?? null,
    user: adaptActionLogUser(r.user),
    team: adaptActionLogTeam(r.team),
  };
}

export function adaptActionLogList(raw: unknown): ActionLogListResponse {
  const r = raw as {
    data: unknown[];
    paginate: { total: number; pages: number };
  };

  return {
    data: r.data.map(adaptActionLog),
    paginate: { total: r.paginate.total, pages: r.paginate.pages },
  };
}

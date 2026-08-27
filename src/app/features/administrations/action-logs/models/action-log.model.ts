export interface ActionLogUser {
  id: string;
  name: string;
  email: string;
}

export interface ActionLogTeam {
  id: string;
  name: string;
}

export interface ActionLog {
  id: string;
  creationTime: string;
  action: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  warehouseId: string | null;
  userName: string | null;
  user: ActionLogUser | null;
  team: ActionLogTeam | null;
}

export interface ActionLogListResponse {
  data: ActionLog[];
  paginate: { total: number; pages: number };
}

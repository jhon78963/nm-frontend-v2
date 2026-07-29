export interface ActionLogUser {
  id: number;
  name: string;
  email: string;
}

export interface ActionLogTeam {
  id: number;
  name: string;
}

export interface ActionLog {
  id: number;
  creationTime: string;
  action: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  warehouseId: number | null;
  userName: string | null;
  user: ActionLogUser | null;
  team: ActionLogTeam | null;
}

export interface ActionLogListResponse {
  data: ActionLog[];
  paginate: { total: number; pages: number };
}

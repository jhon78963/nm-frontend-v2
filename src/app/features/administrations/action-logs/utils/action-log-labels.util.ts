export type ActionLogTone = 'create' | 'update' | 'delete' | 'sync' | 'neutral';

export interface ActionLogLabel {
  label: string;
  tone: ActionLogTone;
}

export interface ActionLogFilterGroup {
  id: string;
  label: string;
  actions: string[];
}

const ACTION_LABELS: Record<string, ActionLogLabel> = {
  'role.created': { label: 'Rol creado', tone: 'create' },
  'role.updated': { label: 'Rol actualizado', tone: 'update' },
  'role.deleted': { label: 'Rol eliminado', tone: 'delete' },
  'role.permissions_synced': { label: 'Permisos sincronizados', tone: 'sync' },
  'user.created': { label: 'Usuario creado', tone: 'create' },
  'user.updated': { label: 'Usuario actualizado', tone: 'update' },
  'user.deleted': { label: 'Usuario eliminado', tone: 'delete' },
  'user.password_reset': { label: 'Contraseña restablecida', tone: 'update' },
  'team_payment.created': { label: 'Pago registrado', tone: 'create' },
  'team_payment.updated': { label: 'Pago actualizado', tone: 'update' },
  'team_payment.deleted': { label: 'Pago eliminado', tone: 'delete' },
  'sale.deleted': { label: 'Venta eliminada', tone: 'delete' },
  'cashflow.created': { label: 'Movimiento de caja creado', tone: 'create' },
  'cashflow.updated': { label: 'Movimiento de caja actualizado', tone: 'update' },
  'cashflow.deleted': { label: 'Movimiento de caja eliminado', tone: 'delete' },
};

export const ACTION_LOG_FILTER_GROUPS: ActionLogFilterGroup[] = [
  {
    id: 'role',
    label: 'Roles',
    actions: [
      'role.created',
      'role.updated',
      'role.deleted',
      'role.permissions_synced',
    ],
  },
  {
    id: 'user',
    label: 'Usuarios',
    actions: [
      'user.created',
      'user.updated',
      'user.deleted',
      'user.password_reset',
    ],
  },
  {
    id: 'team_payment',
    label: 'Pagos de colaboradores',
    actions: [
      'team_payment.created',
      'team_payment.updated',
      'team_payment.deleted',
    ],
  },
  {
    id: 'sale',
    label: 'Ventas',
    actions: ['sale.deleted'],
  },
  {
    id: 'cashflow',
    label: 'Caja',
    actions: [
      'cashflow.created',
      'cashflow.updated',
      'cashflow.deleted',
    ],
  },
];

const TONE_CLASSES: Record<ActionLogTone, string> = {
  create:
    'inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200',
  update:
    'inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200',
  delete:
    'inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200',
  sync:
    'inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-200',
  neutral:
    'inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-600 ring-1 ring-inset ring-gray-200',
};

export function getActionLogLabel(action: string): ActionLogLabel {
  return (
    ACTION_LABELS[action] ?? {
      label: action.replaceAll('.', ' · '),
      tone: 'neutral',
    }
  );
}

export function getActionLogToneClass(tone: ActionLogTone): string {
  return TONE_CLASSES[tone];
}

export function encodeActionFilter(value: string): {
  action?: string;
  actionGroup?: string;
} {
  if (!value) return {};
  if (value.startsWith('action:')) {
    return { action: value.slice('action:'.length) };
  }
  if (value.startsWith('group:')) {
    return { actionGroup: value.slice('group:'.length) };
  }
  return {};
}

export function decodeActionFilter(params: {
  action?: string;
  actionGroup?: string;
}): string {
  if (params.action) return `action:${params.action}`;
  if (params.actionGroup) return `group:${params.actionGroup}`;
  return '';
}

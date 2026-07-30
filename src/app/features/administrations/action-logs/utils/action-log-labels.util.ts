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
  // Auth
  'auth.login':            { label: 'Inicio de sesión',         tone: 'create'  },
  'auth.login_failed':     { label: 'Inicio de sesión fallido', tone: 'delete'  },
  'auth.logout':           { label: 'Cierre de sesión',         tone: 'neutral' },
  'auth.password_changed': { label: 'Contraseña actualizada',   tone: 'update'  },
  'auth.profile_updated':  { label: 'Perfil actualizado',       tone: 'update'  },

  // Roles
  'role.list_viewed':            { label: 'Lista de roles consultada',    tone: 'neutral' },
  'role.permissions_index_viewed': { label: 'Permisos consultados',       tone: 'neutral' },
  'role.viewed':                 { label: 'Detalle de rol consultado',    tone: 'neutral' },
  'role.created':                { label: 'Rol creado',                   tone: 'create'  },
  'role.updated':                { label: 'Rol actualizado',              tone: 'update'  },
  'role.deleted':                { label: 'Rol eliminado',                tone: 'delete'  },
  'role.permissions_synced':     { label: 'Permisos sincronizados',       tone: 'sync'    },

  // Usuarios
  'user.list_viewed':    { label: 'Lista de usuarios consultada',  tone: 'neutral' },
  'user.viewed':         { label: 'Detalle de usuario consultado', tone: 'neutral' },
  'user.created':        { label: 'Usuario creado',                tone: 'create'  },
  'user.updated':        { label: 'Usuario actualizado',           tone: 'update'  },
  'user.deleted':        { label: 'Usuario deshabilitado',             tone: 'delete'  },
  'user.password_reset': { label: 'Contraseña restablecida',       tone: 'update'  },

  // Pagos de colaboradores
  'team_payment.list_viewed':    { label: 'Pagos consultados',             tone: 'neutral' },
  'team_payment.payroll_viewed': { label: 'Nómina consultada',             tone: 'neutral' },
  'team_payment.created':        { label: 'Pago registrado',               tone: 'create'  },
  'team_payment.updated':        { label: 'Pago actualizado',              tone: 'update'  },
  'team_payment.deleted':        { label: 'Pago eliminado',                tone: 'delete'  },

  // POS
  'pos.product_searched':  { label: 'Consulta producto POS',   tone: 'neutral' },
  'pos.customer_searched': { label: 'Consulta cliente POS',    tone: 'neutral' },
  'pos.checkout':          { label: 'Venta POS registrada',    tone: 'create'  },

  // Ventas
  'sale.list_viewed':   { label: 'Lista de ventas consultada',    tone: 'neutral' },
  'sale.stats_viewed':  { label: 'Estadísticas de ventas',        tone: 'neutral' },
  'sale.viewed':        { label: 'Detalle de venta consultado',   tone: 'neutral' },
  'sale.pdf_downloaded':{ label: 'Comprobante descargado',        tone: 'neutral' },
  'sale.updated':       { label: 'Venta actualizada',             tone: 'update'  },
  'sale.deleted':       { label: 'Venta eliminada',               tone: 'delete'  },
  'sale.exchanged':     { label: 'Cambio de mercadería',          tone: 'update'  },

  // Caja
  'cashflow.daily_viewed':              { label: 'Caja del día consultada',          tone: 'neutral' },
  'cashflow.admin_monthly_viewed':      { label: 'Reporte mensual consultado',       tone: 'neutral' },
  'cashflow.accumulated_monthly_viewed':{ label: 'Reporte acumulado consultado',     tone: 'neutral' },
  'cashflow.created':                   { label: 'Movimiento de caja creado',        tone: 'create'  },
  'cashflow.updated':                   { label: 'Movimiento de caja actualizado',   tone: 'update'  },
  'cashflow.deleted':                   { label: 'Movimiento de caja eliminado',     tone: 'delete'  },
};

export const ACTION_LOG_FILTER_GROUPS: ActionLogFilterGroup[] = [
  {
    id: 'auth',
    label: 'Sesión',
    actions: [
      'auth.login',
      'auth.login_failed',
      'auth.logout',
      'auth.password_changed',
      'auth.profile_updated',
    ],
  },
  {
    id: 'pos',
    label: 'POS',
    actions: [
      'pos.checkout',
      'pos.product_searched',
      'pos.customer_searched',
    ],
  },
  {
    id: 'sale',
    label: 'Ventas',
    actions: [
      'sale.list_viewed',
      'sale.stats_viewed',
      'sale.viewed',
      'sale.pdf_downloaded',
      'sale.updated',
      'sale.exchanged',
      'sale.deleted',
    ],
  },
  {
    id: 'cashflow',
    label: 'Caja',
    actions: [
      'cashflow.daily_viewed',
      'cashflow.admin_monthly_viewed',
      'cashflow.accumulated_monthly_viewed',
      'cashflow.created',
      'cashflow.updated',
      'cashflow.deleted',
    ],
  },
  {
    id: 'user',
    label: 'Usuarios',
    actions: [
      'user.list_viewed',
      'user.viewed',
      'user.created',
      'user.updated',
      'user.deleted',
      'user.password_reset',
    ],
  },
  {
    id: 'role',
    label: 'Roles',
    actions: [
      'role.list_viewed',
      'role.viewed',
      'role.created',
      'role.updated',
      'role.deleted',
      'role.permissions_synced',
      'role.permissions_index_viewed',
    ],
  },
  {
    id: 'team_payment',
    label: 'Pagos colaboradores',
    actions: [
      'team_payment.list_viewed',
      'team_payment.payroll_viewed',
      'team_payment.created',
      'team_payment.updated',
      'team_payment.deleted',
    ],
  },
  {
    id: 'http',
    label: 'Actividad API (otras)',
    actions: [],
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
  const known = ACTION_LABELS[action];
  if (known) return known;

  if (action.startsWith('http.get.'))    return { label: 'Consulta API',      tone: 'neutral' };
  if (action.startsWith('http.post.'))   return { label: 'Registro API',      tone: 'create'  };
  if (action.startsWith('http.patch.') || action.startsWith('http.put.'))
                                          return { label: 'Actualización API', tone: 'update'  };
  if (action.startsWith('http.delete.')) return { label: 'Eliminación API',   tone: 'delete'  };

  return { label: action.replaceAll('.', ' · '), tone: 'neutral' };
}

export function getActionLogToneClass(tone: ActionLogTone): string {
  return TONE_CLASSES[tone];
}

export function encodeActionFilter(value: string): {
  action?: string;
  actionGroup?: string;
} {
  if (!value) return {};
  if (value.startsWith('action:'))  return { action:      value.slice('action:'.length) };
  if (value.startsWith('group:'))   return { actionGroup: value.slice('group:'.length)  };
  return {};
}

export function decodeActionFilter(params: {
  action?: string;
  actionGroup?: string;
}): string {
  if (params.action)      return `action:${params.action}`;
  if (params.actionGroup) return `group:${params.actionGroup}`;
  return '';
}

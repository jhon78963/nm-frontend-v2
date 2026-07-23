import { Permission } from '../models/role.model';

export interface PermissionOption {
  label: string;
  value: string;
  actionLabel: string;
}

export interface PermissionSubmodule {
  id: string;
  label: string;
  permissions: PermissionOption[];
}

export interface PermissionModule {
  id: string;
  label: string;
  submodules: PermissionSubmodule[];
}

type MenuPlacement = {
  module: string;
  submodule: string;
  moduleOrder: number;
  submoduleOrder: number;
};

const MODULE_ORDER = [
  'Administración',
  'Directorio',
  'Inventario',
  'Compras',
  'Ventas',
  'Gastos',
  'Reportes',
  'Otros',
] as const;

export function buildPermissionGroups(
  perms: Permission[],
): { label: string; items: { label: string; value: string }[] }[] {
  const map = new Map<string, { label: string; value: string }[]>();
  for (const p of perms) {
    const g = p.group?.trim() || 'Otros';
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push({ label: p.label ?? p.name, value: p.name });
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([label, items]) => ({
      label,
      items: items.sort((x, y) => x.label.localeCompare(y.label, 'es')),
    }));
}

export function buildPermissionTree(perms: Permission[]): PermissionModule[] {
  const moduleMap = new Map<
    string,
    {
      label: string;
      moduleOrder: number;
      submodules: Map<
        string,
        {
          label: string;
          submoduleOrder: number;
          permissions: PermissionOption[];
        }
      >;
    }
  >();

  for (const perm of perms) {
    const placement = resolvePermissionPlacement(perm);
    const moduleKey = placement.module;
    const submoduleKey = `${placement.module}::${placement.submodule}`;

    if (!moduleMap.has(moduleKey)) {
      moduleMap.set(moduleKey, {
        label: placement.module,
        moduleOrder: placement.moduleOrder,
        submodules: new Map(),
      });
    }

    const moduleEntry = moduleMap.get(moduleKey)!;
    if (!moduleEntry.submodules.has(submoduleKey)) {
      moduleEntry.submodules.set(submoduleKey, {
        label: placement.submodule,
        submoduleOrder: placement.submoduleOrder,
        permissions: [],
      });
    }

    moduleEntry.submodules.get(submoduleKey)!.permissions.push({
      label: perm.label ?? perm.name,
      value: perm.name,
      actionLabel: extractActionLabel(perm),
    });
  }

  return [...moduleMap.values()]
    .sort((a, b) => a.moduleOrder - b.moduleOrder)
    .map((moduleEntry) => ({
      id: slugify(moduleEntry.label),
      label: moduleEntry.label,
      submodules: [...moduleEntry.submodules.values()]
        .sort((a, b) => {
          const byOrder = a.submoduleOrder - b.submoduleOrder;
          return byOrder !== 0 ? byOrder : a.label.localeCompare(b.label, 'es');
        })
        .map((submoduleEntry) => ({
          id: slugify(`${moduleEntry.label}-${submoduleEntry.label}`),
          label: submoduleEntry.label,
          permissions: submoduleEntry.permissions.sort((a, b) =>
            a.actionLabel.localeCompare(b.actionLabel, 'es'),
          ),
        })),
    }));
}

export function filterPermissionTree(
  tree: PermissionModule[],
  query: string,
): PermissionModule[] {
  const term = query.trim().toLowerCase();
  if (!term) return tree;

  return tree
    .map((moduleEntry) => {
      const moduleMatches = moduleEntry.label.toLowerCase().includes(term);
      const submodules = moduleEntry.submodules
        .map((submoduleEntry) => {
          const submoduleMatches = submoduleEntry.label
            .toLowerCase()
            .includes(term);
          const permissions = submoduleEntry.permissions.filter(
            (permission) =>
              moduleMatches ||
              submoduleMatches ||
              permission.actionLabel.toLowerCase().includes(term) ||
              permission.label.toLowerCase().includes(term) ||
              permission.value.toLowerCase().includes(term),
          );
          if (permissions.length === 0) return null;
          return { ...submoduleEntry, permissions };
        })
        .filter(
          (sub): sub is PermissionSubmodule => sub !== null,
        );

      if (submodules.length === 0) return null;
      return { ...moduleEntry, submodules };
    })
    .filter((mod): mod is PermissionModule => mod !== null);
}

export function countPermissions(tree: PermissionModule[]): number {
  return tree.reduce(
    (total, moduleEntry) =>
      total +
      moduleEntry.submodules.reduce(
        (sub, submoduleEntry) => sub + submoduleEntry.permissions.length,
        0,
      ),
    0,
  );
}

function resolvePermissionPlacement(perm: Permission): MenuPlacement {
  const name = perm.name;
  const prefix = name.split('.')[0] ?? name;

  if (name === 'cashflow.getAdminMonthlyReport') {
    return {
      module: 'Gastos',
      submodule: 'Gastos Administrativos',
      moduleOrder: moduleOrderIndex('Gastos'),
      submoduleOrder: 0,
    };
  }
  if (name === 'cashflow.getAccumulatedExpensesReport') {
    return {
      module: 'Gastos',
      submodule: 'Egresos Cuenta Acumulada',
      moduleOrder: moduleOrderIndex('Gastos'),
      submoduleOrder: 1,
    };
  }
  if (prefix === 'cashflow') {
    return {
      module: 'Ventas',
      submodule: 'Caja',
      moduleOrder: moduleOrderIndex('Ventas'),
      submoduleOrder: 2,
    };
  }
  if (name === 'report.products') return placement('Reportes', 'Productos (inventario)', 1);
  if (prefix === 'report') return placement('Reportes', 'Reportes', 0);
  if (prefix === 'financialSummary') return placement('Reportes', 'Resumen Financiero', 2);

  const byPrefix: Record<string, MenuPlacement> = {
    role: placement('Administración', 'Roles y permisos', 0),
    user: placement('Administración', 'Usuarios', 1),
    tenant: placement('Administración', 'Clientes (tenants)', 2),
    warehouse: placement('Administración', 'Tiendas (warehouses)', 3),
    audit: placement('Administración', 'Historial de acciones', 4),
    team: placement('Directorio', 'Equipo', 0),
    customer: placement('Directorio', 'Clientes', 1),
    vendor: placement('Directorio', 'Proveedores', 2),
    product: placement('Inventario', 'Productos', 0),
    productSize: placement('Inventario', 'Productos · Tallas', 1),
    productSizeColor: placement('Inventario', 'Productos · Colores por talla', 2),
    productHistory: placement('Inventario', 'Productos · Historial', 3),
    inventoryKardex: placement('Inventario', 'Productos · Kardex', 4),
    size: placement('Inventario', 'Tallas', 5),
    color: placement('Inventario', 'Colores', 6),
    inventoryReconciliation: placement('Inventario', 'Cuadre rápido', 7),
    gender: placement('Inventario', 'Géneros', 8),
    purchase: placement('Compras', 'Compras', 0),
    pos: placement('Ventas', 'POS', 0),
    sale: placement('Ventas', 'Ventas', 1),
  };

  if (byPrefix[prefix]) return byPrefix[prefix];

  return {
    module: 'Otros',
    submodule: perm.group?.trim() || prefix,
    moduleOrder: moduleOrderIndex('Otros'),
    submoduleOrder: 99,
  };
}

function placement(
  module: string,
  submodule: string,
  submoduleOrder: number,
): MenuPlacement {
  return {
    module,
    submodule,
    moduleOrder: moduleOrderIndex(module),
    submoduleOrder,
  };
}

function moduleOrderIndex(module: string): number {
  const index = MODULE_ORDER.indexOf(module as (typeof MODULE_ORDER)[number]);
  return index >= 0 ? index : MODULE_ORDER.length;
}

function extractActionLabel(perm: Permission): string {
  const labelParts = (perm.label ?? '').split(' · ');
  if (labelParts.length >= 2) return labelParts.slice(1).join(' · ');
  const nameParts = perm.name.split('.');
  return nameParts.length > 1 ? nameParts.slice(1).join('.') : perm.name;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

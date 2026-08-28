import { Component, computed, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { isSuperAdmin } from '../../core/auth/permission.util';
import { buildBreadcrumbPaths } from '../../core/navigation/breadcrumb.util';
import { AuthService } from '../../features/auth/data-access/auth.service';
import {
  BreadcrumbComponent,
  BreadcrumbPath,
} from '../../shared/ui/breadcrumb/breadcrumb.component';

export interface NavItem {
  label: string;
  route?: string;
  permission?: string;
  permissions?: string[];
  items?: NavItem[];
}

export interface HeaderShortcut {
  label: string;
  shortLabel: string;
  route: string;
  icon: 'pos' | 'cash' | 'sale' | 'products' | 'purchases' | 'expenses';
  permission?: string;
  permissions?: string[];
}

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, BreadcrumbComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isMobileMenuOpen = signal(false);
  protected readonly isProfileMenuOpen = signal(false);
  protected readonly hasActiveModal = signal(false);
  protected readonly isSidebarCollapsed = signal(this.readSidebarCollapsed());
  protected readonly breadcrumbPaths = signal<BreadcrumbPath[]>([]);
  protected readonly sessionReady = signal(false);
  protected readonly currentUrl = signal(this.router.url);

  private readonly allNavItems: NavItem[] = [
    {
      label: 'Administración',
      items: [
        { label: 'Clientes (tenants)', route: '/administrations/tenants', permission: 'tenant.getAll' },
        { label: 'Tiendas (warehouses)', route: '/administrations/warehouses', permission: 'warehouse.getAll' },
        { label: 'Roles y permisos', route: '/administrations/roles', permission: 'role.getAll' },
        { label: 'Usuarios', route: '/administrations/users', permission: 'user.getAll' },
        { label: 'Historial de acciones', route: '/administrations/action-logs', permission: 'audit.getAll' },
      ],
    },
    {
      label: 'Directorio',
      items: [
        { label: 'Equipo', route: '/directories/teams', permissions: ['team.getAll', 'team.get'] },
        { label: 'Clientes', route: '/directories/customers', permissions: ['customer.getAll', 'customer.get'] },
        { label: 'Proveedores', route: '/directories/vendors', permissions: ['vendor.getAll', 'vendor.get'] },
      ],
    },
    {
      label: 'Inventario',
      items: [
        { label: 'Productos', route: '/inventories/products', permissions: ['product.getAll', 'product.get'] },
        { label: 'Tallas', route: '/inventories/sizes', permissions: ['size.getAll', 'size.get'] },
        { label: 'Colores', route: '/inventories/colors', permissions: ['color.getAll', 'color.get'] },
        { label: 'Actualizar inventario', route: '/inventories/reconciliations', permission: 'inventoryReconciliation.search' },
      ],
    },
    {
      label: 'Ecommerce',
      items: [
        { label: 'Publicar productos', route: '/ecommerce/products', permissions: ['product.update', 'product.create'] },
        { label: 'Multimedia', route: '/ecommerce/multimedia', permission: 'product.update' },
      ],
    },
    {
      label: 'Compras',
      items: [
        { label: 'Lista', route: '/inventories/purchases', permissions: ['purchase.getAll', 'purchase.get'] },
        { label: 'Registro', route: '/inventories/purchases/register', permission: 'purchase.registerBulk' },
      ],
    },
    {
      label: 'Finanzas',
      items: [
        { label: 'POS', route: '/finances/pos', permission: 'pos.checkout' },
        { label: 'Ventas', route: '/finances/sales', permissions: ['sale.getAll', 'sale.get'] },
        { label: 'Caja', route: '/finances/cash-movements', permission: 'cashflow.getDaily' },
      ],
    },
    {
      label: 'Gastos',
      items: [
        { label: 'Gastos Administrativos', route: '/expenses/admin-expenses', permission: 'cashflow.getAdminMonthlyReport' },
        { label: 'Egresos Cuenta Acumulada', route: '/expenses/accumulated-expenses', permission: 'cashflow.getAccumulatedExpensesReport' },
      ],
    },
    {
      label: 'Reportes',
      items: [
        { label: 'Reportes', route: '/reports', permission: 'report.index' },
        { label: 'Ventas', route: '/reports/sales', permission: 'report.sales' },
        { label: 'Ventas por Período', route: '/reports/sales-period', permission: 'report.sales' },
        { label: 'Productos (inventario)', route: '/reports/products', permission: 'report.products' },
        { label: 'Resumen Financiero', route: '/reports/financial-summaries', permission: 'financialSummary.getSummary' },
        { label: 'Asistente IA', route: '/ai', permissions: ['product.get', 'product.getAll'] },
      ],
    },
  ];

  private readonly headerShortcuts: HeaderShortcut[] = [
    {
      label: 'POS',
      shortLabel: 'POS',
      route: '/finances/pos',
      icon: 'pos',
      permission: 'pos.checkout',
    },
    {
      label: 'Caja',
      shortLabel: 'Caja',
      route: '/finances/cash-movements',
      icon: 'cash',
      permission: 'cashflow.getDaily',
    },
    {
      label: 'Ventas',
      shortLabel: 'Ventas',
      route: '/finances/sales',
      icon: 'sale',
      permissions: ['sale.getAll', 'sale.get'],
    },
    {
      label: 'Productos',
      shortLabel: 'Prod.',
      route: '/inventories/products',
      icon: 'products',
      permissions: ['product.getAll', 'product.get'],
    },
    {
      label: 'Compras',
      shortLabel: 'Compras',
      route: '/inventories/purchases',
      icon: 'purchases',
      permissions: ['purchase.getAll', 'purchase.get'],
    },
    {
      label: 'Gastos administrativos',
      shortLabel: 'Gastos',
      route: '/expenses/admin-expenses',
      icon: 'expenses',
      permission: 'cashflow.getAdminMonthlyReport',
    },
  ];

  protected readonly showHomeLink = computed(
    () => !isSuperAdmin(this.authService.currentUser()),
  );

  protected readonly navItems = computed(() => {
    const user = this.authService.currentUser();
    const groups = isSuperAdmin(user)
      ? this.allNavItems.filter((group) => group.label === 'Administración')
      : this.allNavItems;

    return groups
      .map((group) => ({
        ...group,
        items: (group.items ?? []).filter((item) => this.canSeeNavItem(item)),
      }))
      .filter((group) => (group.items?.length ?? 0) > 0);
  });

  protected readonly visibleHeaderShortcuts = computed(() => {
    if (isSuperAdmin(this.authService.currentUser())) {
      return [];
    }

    return this.headerShortcuts.filter((item) => this.canSeeShortcut(item));
  });

  protected readonly userAvatarUrl = computed(() => {
    const raw = this.authService.currentUser()?.profilePicture?.trim();
    if (!raw || raw.includes('/assets/img/avatars/')) {
      return null;
    }

    return raw;
  });

  private readonly closeProfileMenuOnModal = effect(() => {
    if (this.hasActiveModal()) {
      this.isProfileMenuOpen.set(false);
    }
  });

  ngOnInit(): void {
    this.observeActiveModals();
    this.authService
      .ensureSessionLoaded()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.sessionReady.set(true));

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.currentUrl.set(this.router.url);
        this.breadcrumbPaths.set(
          buildBreadcrumbPaths(this.router.routerState.snapshot.root),
        );
        this.isProfileMenuOpen.set(false);
      });

    this.breadcrumbPaths.set(
      buildBreadcrumbPaths(this.router.routerState.snapshot.root),
    );
  }

  protected toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((open) => !open);
  }

  protected closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  protected toggleSidebarCollapsed(): void {
    this.isSidebarCollapsed.update((collapsed) => {
      const next = !collapsed;
      this.persistSidebarCollapsed(next);
      return next;
    });
  }

  protected toggleProfileMenu(): void {
    this.isProfileMenuOpen.update((open) => !open);
  }

  protected logout(): void {
    this.authService.signOut().subscribe({
      next: () => void this.router.navigate(['/auth/login']),
      error: () => void this.router.navigate(['/auth/login']),
    });
  }

  protected userInitials(): string {
    const user = this.authService.currentUser();
    if (!user) {
      return 'A';
    }

    const first = user.name?.charAt(0) ?? '';
    const last = user.surname?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || 'A';
  }

  protected userDisplayName(): string {
    const user = this.authService.currentUser();
    if (!user) {
      return 'Administrador';
    }

    return `${user.name} ${user.surname}`.trim() || user.username;
  }

  protected userRole(): string {
    return this.authService.currentUser()?.role ?? '';
  }

  private canSeeNavItem(item: NavItem): boolean {
    if (
      item.route === '/administrations/tenants' &&
      !isSuperAdmin(this.authService.currentUser())
    ) {
      return false;
    }

    return this.canSeeShortcut(item);
  }

  private canSeeShortcut(item: Pick<HeaderShortcut, 'permission' | 'permissions'>): boolean {
    if (item.permission) {
      return this.authService.hasPermission(item.permission);
    }

    if (item.permissions?.length) {
      return this.authService.hasAnyPermission(item.permissions);
    }

    return true;
  }

  protected isHeaderShortcutActive(item: HeaderShortcut): boolean {
    const url = this.currentUrl().split('?')[0];
    return url === item.route || url.startsWith(`${item.route}/`);
  }

  protected isHomeActive(): boolean {
    const url = this.currentUrl().split('?')[0];
    return url === '/dashboard' || url === '/';
  }

  protected isNavActive(item: NavItem, siblings: NavItem[]): boolean {
    const route = item.route;
    if (!route) {
      return false;
    }

    const url = this.currentUrl().split('?')[0];
    const matchesRoute = (candidate: string): boolean =>
      url === candidate || url.startsWith(`${candidate}/`);

    if (!matchesRoute(route)) {
      return false;
    }

    const bestMatch = siblings
      .filter((sibling) => sibling.route && matchesRoute(sibling.route))
      .sort((a, b) => b.route!.length - a.route!.length)[0];

    return bestMatch?.route === route;
  }

  private readSidebarCollapsed(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    return localStorage.getItem('nm-sidebar-collapsed') === 'true';
  }

  private persistSidebarCollapsed(collapsed: boolean): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem('nm-sidebar-collapsed', String(collapsed));
  }

  private observeActiveModals(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const update = (): void => {
      this.hasActiveModal.set(document.querySelector('[aria-modal="true"]') !== null);
    };

    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-modal'],
    });

    update();
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}

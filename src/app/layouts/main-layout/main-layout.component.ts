import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
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

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, BreadcrumbComponent],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isMobileMenuOpen = signal(false);
  protected readonly isProfileMenuOpen = signal(false);
  protected readonly breadcrumbPaths = signal<BreadcrumbPath[]>([]);
  protected readonly sessionReady = signal(false);
  protected readonly currentUrl = signal(this.router.url);

  private readonly allNavItems: NavItem[] = [
    {
      label: 'Administración',
      items: [
        { label: 'Roles y permisos', route: '/administrations/roles', permission: 'role.getAll' },
        { label: 'Usuarios', route: '/administrations/users', permission: 'user.getAll' },
        { label: 'Clientes (tenants)', route: '/administrations/tenants', permission: 'tenant.getAll' },
        { label: 'Tiendas (warehouses)', route: '/administrations/warehouses', permission: 'warehouse.getAll' },
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
        { label: 'Productos (inventario)', route: '/reports/products', permission: 'report.products' },
        { label: 'Resumen Financiero', route: '/reports/financial-summaries', permission: 'financialSummary.getSummary' },
        { label: 'Asistente IA', route: '/ai', permissions: ['product.get', 'product.getAll'] },
      ],
    },
  ];

  protected readonly navItems = computed(() =>
    this.allNavItems
      .map((group) => ({
        ...group,
        items: (group.items ?? []).filter((item) => this.canSeeNavItem(item)),
      }))
      .filter((group) => (group.items?.length ?? 0) > 0),
  );

  ngOnInit(): void {
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
    if (item.permission) {
      return this.authService.hasPermission(item.permission);
    }

    if (item.permissions?.length) {
      return this.authService.hasAnyPermission(item.permissions);
    }

    return true;
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
}

import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BreadcrumbComponent],
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

  private readonly allNavItems: NavItem[] = [
    {
      label: 'Administración',
      items: [
        { label: 'Roles y permisos', route: '/administration/roles', permission: 'role.getAll' },
        { label: 'Usuarios', route: '/administration/users', permission: 'user.getAll' },
        { label: 'Clientes (tenants)', route: '/administration/tenants', permission: 'tenant.getAll' },
        { label: 'Tiendas (warehouses)', route: '/administration/warehouses', permission: 'warehouse.getAll' },
        { label: 'Historial de acciones', route: '/administration/action-logs', permission: 'audit.getAll' },
      ],
    },
    {
      label: 'Directorio',
      items: [
        { label: 'Equipo', route: '/directory/team', permissions: ['team.getAll', 'team.get'] },
        { label: 'Clientes', route: '/directory/customers', permissions: ['customer.getAll', 'customer.get'] },
        { label: 'Proveedores', route: '/directory/vendors', permissions: ['vendor.getAll', 'vendor.get'] },
      ],
    },
    {
      label: 'Inventario',
      items: [
        { label: 'Productos', route: '/inventories/products', permissions: ['product.getAll', 'product.get'] },
        { label: 'Tallas', route: '/inventories/sizes', permissions: ['size.getAll', 'size.get'] },
        { label: 'Colores', route: '/inventories/colors', permissions: ['color.getAll', 'color.get'] },
        { label: 'Actualizar inventario', route: '/inventories/reconciliation', permission: 'inventoryReconciliation.search' },
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
        { label: 'Lista', route: '/inventories/purchase', permissions: ['purchase.getAll', 'purchase.get'] },
        { label: 'Registro', route: '/inventories/purchase/register', permission: 'purchase.registerBulk' },
      ],
    },
    {
      label: 'Ventas',
      items: [
        { label: 'POS', route: '/sales/pos', permission: 'pos.checkout' },
        { label: 'Ventas', route: '/sales', permissions: ['sale.getAll', 'sale.get'] },
        { label: 'Caja', route: '/finance/cash-movements', permission: 'cashflow.getDaily' },
      ],
    },
    {
      label: 'Gastos',
      items: [
        { label: 'Gastos Administrativos', route: '/finance/cash-movements/admin-expenses', permission: 'cashflow.getAdminMonthlyReport' },
        { label: 'Egresos Cuenta Acumulada', route: '/finance/cash-movements/accumulated-expenses', permission: 'cashflow.getAccumulatedExpensesReport' },
      ],
    },
    {
      label: 'Reportes',
      items: [
        { label: 'Reportes', route: '/reports', permission: 'report.index' },
        { label: 'Productos (inventario)', route: '/reports/products', permission: 'report.products' },
        { label: 'Resumen Financiero', route: '/financial-summary', permission: 'financialSummary.getSummary' },
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
}

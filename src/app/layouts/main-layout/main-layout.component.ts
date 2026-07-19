import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreadcrumbComponent, BreadcrumbPath } from '../../shared/ui/breadcrumb/breadcrumb.component';

interface NavItem {
  label: string;
  icon: 'dashboard' | 'sale' | 'inventory' | 'purchases';
  route: string;
}

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BreadcrumbComponent],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  protected readonly isMobileMenuOpen = signal(false);
  protected readonly isProfileMenuOpen = signal(false);

  protected readonly breadcrumbPaths: BreadcrumbPath[] = [
    { label: 'Inicio', route: '/' },
    { label: 'Inventario' },
  ];

  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Nueva Venta', icon: 'sale', route: '/sales/new' },
    { label: 'Inventario', icon: 'inventory', route: '/inventory' },
    { label: 'Compras', icon: 'purchases', route: '/purchases' },
  ];

  protected toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((open) => !open);
  }

  protected closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  protected toggleProfileMenu(): void {
    this.isProfileMenuOpen.update((open) => !open);
  }
}

import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavItem {
  label: string;
  icon: 'dashboard' | 'sale' | 'inventory' | 'purchases';
  route: string;
}

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  protected readonly isMobileMenuOpen = signal(false);

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
}

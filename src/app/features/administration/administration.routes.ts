import { Routes } from '@angular/router';
import { createPlaceholderRoute } from '../../core/routing/feature-placeholder.component';

const routes: Routes = [
  createPlaceholderRoute('Roles', 'roles'),
  createPlaceholderRoute('Usuarios', 'users'),
  createPlaceholderRoute('Clientes', 'tenants'),
  createPlaceholderRoute('Tiendas', 'warehouses'),
  createPlaceholderRoute('Historial', 'action-logs'),
  { path: '', redirectTo: 'roles', pathMatch: 'full' },
];

export default routes;

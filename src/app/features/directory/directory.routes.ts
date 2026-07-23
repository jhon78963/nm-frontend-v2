import { Routes } from '@angular/router';
import { createPlaceholderRoute } from '../../core/routing/feature-placeholder.component';

const routes: Routes = [
  createPlaceholderRoute('Equipo', 'team'),
  createPlaceholderRoute('Clientes', 'customers'),
  createPlaceholderRoute('Proveedores', 'vendors'),
  { path: '', redirectTo: 'team', pathMatch: 'full' },
];

export default routes;

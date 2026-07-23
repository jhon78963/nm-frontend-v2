import { Routes } from '@angular/router';
import { createPlaceholderRoute } from '../../core/routing/feature-placeholder.component';

const routes: Routes = [
  createPlaceholderRoute('Reportes', ''),
  createPlaceholderRoute('Productos (inventario)', 'products'),
];

export default routes;

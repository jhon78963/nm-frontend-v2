import { Routes } from '@angular/router';
import { createPlaceholderRoute } from '../../core/routing/feature-placeholder.component';

const routes: Routes = [
  {
    path: 'cash-movements',
    data: { breadcrumb: 'Movimientos de Caja' },
    children: [
      createPlaceholderRoute('Movimientos de Caja', ''),
      createPlaceholderRoute('Gastos Administrativos', 'admin-expenses'),
      createPlaceholderRoute('Egresos Cuenta Acumulada', 'accumulated-expenses'),
    ],
  },
  { path: '', redirectTo: 'cash-movements', pathMatch: 'full' },
];

export default routes;

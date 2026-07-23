import { Routes } from '@angular/router';
import { createPlaceholderRoute } from '../../core/routing/feature-placeholder.component';

const routes: Routes = [
  createPlaceholderRoute('Publicar productos', 'products'),
  createPlaceholderRoute('Multimedia', 'multimedia'),
  { path: '', redirectTo: 'products', pathMatch: 'full' },
];

export default routes;

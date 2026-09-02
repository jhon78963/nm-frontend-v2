import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/auth/role.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Redes sociales del home',
    data: {
      breadcrumb: 'Redes sociales del home',
      roles: ['Admin', 'Super Admin'],
    },
    canActivate: [roleGuard],
    loadComponent: () =>
      import(
        './components/store-home-social-media-config/store-home-social-media-config.component'
      ).then((m) => m.StoreHomeSocialMediaConfigComponent),
  },
];

export default routes;

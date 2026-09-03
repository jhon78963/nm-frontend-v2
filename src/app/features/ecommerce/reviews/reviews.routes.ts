import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/ecommerce-reviews-list/ecommerce-reviews-list.component').then(
        (m) => m.EcommerceReviewsListComponent,
      ),
  },
];

export default routes;

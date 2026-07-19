import { Component } from '@angular/core';
import { Routes } from '@angular/router';

@Component({
  template: `<p class="text-gray-500">Compras — próximamente</p>`,
})
class PurchasesPlaceholder {}

const routes: Routes = [
  {
    path: '',
    component: PurchasesPlaceholder,
  },
];

export default routes;

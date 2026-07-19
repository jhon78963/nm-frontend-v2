import { Component } from '@angular/core';
import { Routes } from '@angular/router';

@Component({
  template: `<p class="text-gray-500">Ventas — próximamente</p>`,
})
class SalesPlaceholder {}

const routes: Routes = [
  {
    path: '',
    component: SalesPlaceholder,
  },
];

export default routes;

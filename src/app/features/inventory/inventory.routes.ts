import { Component } from '@angular/core';
import { Routes } from '@angular/router';

@Component({
  template: `<p class="text-gray-500">Inventario — próximamente</p>`,
})
class InventoryPlaceholder {}

const routes: Routes = [
  {
    path: '',
    component: InventoryPlaceholder,
  },
];

export default routes;

import { Component } from '@angular/core';
import { Routes } from '@angular/router';

@Component({
  template: `<p class="text-gray-500">Módulo en construcción.</p>`,
})
export class FeaturePlaceholderComponent {}

export function createPlaceholderRoute(
  breadcrumb: string,
  path = '',
): Routes[number] {
  return {
    path,
    data: { breadcrumb },
    component: FeaturePlaceholderComponent,
  };
}

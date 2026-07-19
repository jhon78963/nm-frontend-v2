import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbPath {
  label: string;
  route?: string;
}

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
})
export class BreadcrumbComponent {
  readonly paths = input<BreadcrumbPath[]>([]);
}

import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductFormComponent } from '../product-form/product-form.component';

@Component({
  selector: 'app-product-form-wrapper',
  imports: [ProductFormComponent],
  template: `
    <app-product-form
      [productId]="productId()"
      (saved)="onSaved($event)"
      (closed)="onClosed()" />
  `,
})
export class ProductFormWrapperComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly productId = signal<number | null>(null);

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('id');
    this.productId.set(id ? Number(id) : null);
  }

  protected onSaved(data: { message: string; productId: number }): void {
    this.router.navigate([`/inventories/products/${data.productId}/sizes`]);
  }

  protected onClosed(): void {
    this.router.navigate(['/inventories/products']);
  }
}

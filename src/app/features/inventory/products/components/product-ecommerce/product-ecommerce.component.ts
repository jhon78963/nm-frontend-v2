import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-product-ecommerce',
  imports: [],
  template: `
    <div class="flex flex-col gap-6">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">Configuración de Ecommerce</h2>
        <p class="mt-1 text-sm text-gray-500">
          Configura las opciones de venta online para este producto.
        </p>
      </div>

      <div class="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <h3 class="mt-2 text-sm font-semibold text-gray-900">
          Configuración de Ecommerce
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          La configuración de ecommerce estará disponible próximamente.
        </p>
        <p class="mt-1 text-xs text-gray-400">
          Producto ID: {{ productId() }}
        </p>
      </div>
    </div>
  `,
})
export class ProductEcommerceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  protected readonly productId = signal<number | null>(null);

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('id');
    this.productId.set(id ? Number(id) : null);
  }
}

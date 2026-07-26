import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { ProductService } from '../../data-access/product.service';

@Component({
  selector: 'app-product-history',
  imports: [],
  template: `
    <div class="flex flex-col gap-6">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">Historial del Producto</h2>
        <p class="mt-1 text-sm text-gray-500">
          Visualiza todos los cambios realizados en este producto.
        </p>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="flex flex-col items-center gap-3">
            <svg
              class="h-10 w-10 animate-spin text-sky-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p class="text-sm text-gray-600">Cargando historial...</p>
          </div>
        </div>
      } @else {
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="mt-2 text-sm font-semibold text-gray-900">
            Historial del producto
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            El historial completo del producto estará disponible próximamente.
          </p>
          <p class="mt-1 text-xs text-gray-400">
            Producto ID: {{ productId() }}
          </p>
        </div>
      }
    </div>
  `,
})
export class ProductHistoryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly productId = signal<number | null>(null);
  protected readonly loading = signal(true);
  protected readonly history = signal<unknown[]>([]);

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('id');
    this.productId.set(id ? Number(id) : null);
    this.loading.set(false);
  }
}

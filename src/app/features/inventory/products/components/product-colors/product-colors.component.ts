import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { ProductColorsService } from '../../data-access/product-colors.service';
import { ProductColor } from '../../models/product.model';

@Component({
  selector: 'app-product-colors',
  imports: [],
  template: `
    <div class="flex flex-col gap-6">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">Gestión de Colores</h2>
        <p class="mt-1 text-sm text-gray-500">
          Asigna y configura los colores disponibles para las tallas de este producto.
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
            <p class="text-sm text-gray-600">Cargando colores...</p>
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
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          <h3 class="mt-2 text-sm font-semibold text-gray-900">
            Funcionalidad de colores
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            La gestión completa de colores estará disponible próximamente.
          </p>
          <p class="mt-1 text-xs text-gray-400">
            Producto ID: {{ productId() }}
          </p>
        </div>
      }
    </div>
  `,
})
export class ProductColorsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly colorsService = inject(ProductColorsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly productId = signal<number | null>(null);
  protected readonly loading = signal(true);
  protected readonly colors = signal<ProductColor[]>([]);

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('id');
    this.productId.set(id ? Number(id) : null);
    this.loading.set(false);
  }
}

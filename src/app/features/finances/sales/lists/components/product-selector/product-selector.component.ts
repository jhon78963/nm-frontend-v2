import {
  Component,
  DestroyRef,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ButtonComponent } from '../../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../../shared/ui/input/input.component';
import { TableActionButtonComponent } from '../../../../../../shared/ui/table-action-button/table-action-button.component';
import { PosService } from '../../../../pos/data-access/pos.service';
import { Product } from '../../../../pos/models/pos.model';
import { ProductVariantSelection } from '../../models/sale.model';

@Component({
  selector: 'app-sale-product-selector',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    InputComponent,
    TableActionButtonComponent,
  ],
  templateUrl: './product-selector.component.html',
})
export class SaleProductSelectorComponent {
  private readonly posService = inject(PosService);
  private readonly destroyRef = inject(DestroyRef);

  readonly selected = output<ProductVariantSelection>();
  readonly closed = output<void>();

  protected readonly products = signal<ProductVariantSelection[]>([]);
  protected readonly loading = signal(false);
  protected readonly query = signal('');
  protected readonly searchControl = new FormControl('', { nonNullable: true });

  private readonly search$ = new Subject<string>();

  protected readonly moneyFormatter = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  constructor() {
    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.query.set(value);
        this.search$.next(value.trim());
      });

    this.search$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((term) => {
        void this.loadProducts(term);
      });
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      void this.loadProducts(this.query().trim());
    }
  }

  protected close(): void {
    this.closed.emit();
  }

  protected pick(product: ProductVariantSelection): void {
    this.selected.emit(product);
  }

  protected formatMoney(value: number): string {
    return `S/ ${this.moneyFormatter.format(value)}`;
  }

  private async loadProducts(term: string): Promise<void> {
    if (term.length < 2) {
      this.products.set([]);
      return;
    }

    this.loading.set(true);

    try {
      const product = await this.posService.searchProductBySku(term);
      this.products.set(this.flattenProductVariants(product, term));
    } catch {
      this.products.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private flattenProductVariants(
    product: Product | undefined,
    query: string,
  ): ProductVariantSelection[] {
    if (!product?.variants) {
      return [];
    }

    const flat: ProductVariantSelection[] = [];

    for (const [sizeName, variants] of Object.entries(product.variants)) {
      for (const variant of variants) {
        flat.push({
          productSizeId: variant.product_size_id,
          colorId: variant.color_id,
          name: product.name,
          sizeName,
          colorName: variant.colorName,
          salePrice: variant.price > 0 ? variant.price : product.basePrice,
          sku: variant.sku ?? `${variant.product_size_id}-${variant.color_id}`,
          availableQuantity: variant.inventory?.available_quantity ?? 0,
        });
      }
    }

    const trimmedQuery = query.trim();
    const exactSku = flat.some((item) => item.sku === trimmedQuery);
    return exactSku ? flat.filter((item) => item.sku === trimmedQuery) : flat;
  }
}

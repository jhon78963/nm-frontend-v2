import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ProductService } from '../../../features/inventories/products/data-access/product.service';
import { ChipsApiComponent } from '../chips-api/chips-api.component';
import {
  formatProductChipLabel,
  ProductChipItem,
  toProductChipItem,
} from './models/product-chip.model';

@Component({
  selector: 'app-product-chips-picker',
  imports: [ChipsApiComponent],
  templateUrl: './product-chips-picker.component.html',
})
export class ProductChipsPickerComponent {
  private readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);

  readonly productIds = input<string[]>([]);
  readonly label = input('Productos');
  readonly placeholder = input('Buscar por nombre o código de barras...');
  readonly minChars = input(2);
  readonly disabled = input(false);

  readonly productIdsChange = output<string[]>();

  protected readonly selectedItems = signal<ProductChipItem[]>([]);
  protected readonly searchOptions = signal<ProductChipItem[]>([]);
  protected readonly isLoading = signal(false);

  private lastResolvedIdsKey = '';

  protected readonly displayProduct = (item: unknown): string =>
    formatProductChipLabel(item as ProductChipItem);

  constructor() {
    effect(() => {
      const ids = this.normalizeIds(this.productIds());
      const key = ids.join('|');

      if (key === this.lastResolvedIdsKey) {
        return;
      }

      this.resolveSelectedProducts(ids);
    });
  }

  protected onSearch(query: string): void {
    const trimmed = query.trim();
    if (trimmed.length < this.minChars()) {
      this.searchOptions.set([]);
      return;
    }

    this.isLoading.set(true);

    this.productService
      .getAll({ limit: 15, page: 1, search: trimmed })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const selectedIds = new Set(this.selectedItems().map((item) => item.id));
          const options = response.data
            .map(toProductChipItem)
            .filter((item) => !selectedIds.has(item.id));

          this.searchOptions.set(options);
          this.isLoading.set(false);
        },
        error: () => {
          this.searchOptions.set([]);
          this.isLoading.set(false);
        },
      });
  }

  protected onSelect(item: unknown): void {
    const product = item as ProductChipItem;
    if (this.selectedItems().some((selected) => selected.id === product.id)) {
      return;
    }

    const nextItems = [...this.selectedItems(), product];
    this.applySelection(nextItems);
    this.searchOptions.set([]);
  }

  protected onRemove(item: unknown): void {
    const product = item as ProductChipItem;
    const nextItems = this.selectedItems().filter((selected) => selected.id !== product.id);
    this.applySelection(nextItems);
  }

  private applySelection(items: ProductChipItem[]): void {
    this.selectedItems.set(items);
    const ids = items.map((item) => item.id);
    this.lastResolvedIdsKey = ids.join('|');
    this.productIdsChange.emit(ids);
  }

  private resolveSelectedProducts(ids: string[]): void {
    const currentById = new Map(this.selectedItems().map((item) => [item.id, item]));
    const knownItems = ids
      .map((id) => currentById.get(id))
      .filter((item): item is ProductChipItem => Boolean(item));

    if (knownItems.length === ids.length) {
      this.selectedItems.set(knownItems);
      this.lastResolvedIdsKey = ids.join('|');
      return;
    }

    const missingIds = ids.filter((id) => !currentById.has(id));
    if (missingIds.length === 0) {
      this.selectedItems.set(knownItems);
      this.lastResolvedIdsKey = ids.join('|');
      return;
    }

    this.isLoading.set(true);

    forkJoin(
      missingIds.map((id) =>
        this.productService.getOne(id).pipe(
          map(toProductChipItem),
          catchError(() =>
            of({
              id,
              name: `Producto ${id.slice(0, 8)}…`,
              barcode: '',
            } satisfies ProductChipItem),
          ),
        ),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resolved) => {
          const resolvedById = new Map(resolved.map((item) => [item.id, item]));
          const nextItems = ids.map(
            (id) =>
              currentById.get(id) ??
              resolvedById.get(id) ?? {
                id,
                name: `Producto ${id.slice(0, 8)}…`,
                barcode: '',
              },
          );

          this.selectedItems.set(nextItems);
          this.lastResolvedIdsKey = ids.join('|');
          this.isLoading.set(false);
        },
        error: () => {
          this.selectedItems.set(
            ids.map((id) => ({
              id,
              name: `Producto ${id.slice(0, 8)}…`,
              barcode: '',
            })),
          );
          this.lastResolvedIdsKey = ids.join('|');
          this.isLoading.set(false);
        },
      });
  }

  private normalizeIds(ids: string[]): string[] {
    return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  }
}

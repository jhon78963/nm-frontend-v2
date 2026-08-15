import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../../../shared/ui/data-table/data-table.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { ProductService } from '../../data-access/product.service';
import { ProductSizesService } from '../../data-access/product-sizes.service';
import { ProductLookupService } from '../../data-access/product-lookup.service';
import {
  ProductSize,
  ProductSizeFormData,
  SizeType,
} from '../../models/product.model';

interface SizeFieldSnapshot {
  barcode: string;
  stock: number | null;
  purchasePrice: number | null;
  salePrice: number | null;
  minSalePrice: number | null;
}

@Component({
  selector: 'app-product-sizes',
  imports: [FormsModule, RouterLink, ButtonComponent, DataTableComponent],
  templateUrl: './product-sizes.component.html',
})
export class ProductSizesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly sizesService = inject(ProductSizesService);
  private readonly productLookupService = inject(ProductLookupService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly productId = signal<number | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly sizes = signal<ProductSize[]>([]);
  protected readonly sizeTypes = signal<SizeType[]>([]);
  protected readonly selectedSizeTypeIds = signal<number[]>([1]);
  protected readonly selectedSizes = signal<ProductSize[]>([]);

  protected readonly sizeTableColumns: DataTableColumn<ProductSize>[] = [
    { key: 'select', label: '', width: '3rem' },
    { key: 'id', label: '#' },
    { key: 'description', label: 'Talla' },
    { key: 'barcode', label: 'Código de barras' },
    { key: 'stock', label: 'Stock' },
    { key: 'purchasePrice', label: 'Precio compra' },
    { key: 'salePrice', label: 'Precio venta' },
    { key: 'minSalePrice', label: 'Precio mínimo' },
    { key: 'actions', label: 'Acciones', align: 'right' },
  ];

  private readonly initialSizeSnapshots = new Map<number, SizeFieldSnapshot>();

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('id');
    this.productId.set(id ? Number(id) : null);

    if (this.productId()) {
      this.loadSizeTypes();
      this.loadProductAndSizes();
    } else {
      this.loading.set(false);
    }
  }

  protected loadSizeTypes(): void {
    this.productLookupService
      .getSizeTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => {
          this.sizeTypes.set(types);
        },
      });
  }

  protected loadProductAndSizes(): void {
    const id = this.productId();
    if (!id) return;

    this.loading.set(true);
    this.productService
      .getOne(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (product) => {
          this.selectedSizeTypeIds.set(
            product.sizeTypeId.length ? product.sizeTypeId : [1],
          );
          this.loadSizes();
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar el producto.');
        },
      });
  }

  protected loadSizes(): void {
    const id = this.productId();
    if (!id) return;

    this.loading.set(true);
    this.sizesService
      .getSizes(id, this.selectedSizeTypeIds())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sizes) => {
          this.initialSizeSnapshots.clear();
          for (const size of sizes) {
            this.initialSizeSnapshots.set(size.id, this.captureSizeSnapshot(size));
          }
          this.sizes.set(sizes);
          this.selectedSizes.set([]);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudieron cargar las tallas.');
        },
      });
  }

  protected toggleSizeType(id: number): void {
    const current = this.selectedSizeTypeIds();
    const next = current.includes(id)
      ? current.filter((itemId) => itemId !== id)
      : [...current, id];

    this.selectedSizeTypeIds.set(next.length ? next : [id]);
    this.loadSizes();
  }

  protected isSizeTypeSelected(id: number): boolean {
    return this.selectedSizeTypeIds().includes(id);
  }

  protected isSizeSelected(size: ProductSize): boolean {
    return this.selectedSizes().some((s) => s.id === size.id);
  }

  protected toggleSizeSelection(size: ProductSize, checked: boolean): void {
    if (checked) {
      if (!this.isSizeSelected(size)) {
        this.selectedSizes.update((items) => [...items, size]);
      }
      return;
    }

    this.selectedSizes.update((items) => items.filter((s) => s.id !== size.id));
  }

  protected toggleSelectAll(checked: boolean): void {
    this.selectedSizes.set(checked ? [...this.sizes()] : []);
  }

  protected allSelected(): boolean {
    const rows = this.sizes();
    return rows.length > 0 && this.selectedSizes().length === rows.length;
  }

  protected onSizeFieldChange(size: ProductSize): void {
    if (this.isSizeAtInitialValues(size)) {
      this.selectedSizes.update((items) => items.filter((s) => s.id !== size.id));
      return;
    }

    this.markSizeSelected(size);
  }

  protected markSizeSelected(size: ProductSize): void {
    if (!this.isSizeSelected(size)) {
      this.selectedSizes.update((items) => [...items, size]);
    }
  }

  protected someSelected(): boolean {
    const selected = this.selectedSizes().length;
    const total = this.sizes().length;
    return selected > 0 && selected < total;
  }

  protected saveAllSelectedSizes(): void {
    const id = this.productId();
    const selected = this.selectedSizes();
    if (!id || !selected.length) return;

    this.saving.set(true);
    const toAdd = selected.filter((s) => !s.isExists);
    const toUpdate = selected.filter((s) => s.isExists);

    const requests = [
      ...toAdd.map((size) =>
        this.sizesService
          .add(id, size.id, this.buildPayload(size))
          .pipe(catchError(() => of(null))),
      ),
      ...toUpdate.map((size) =>
        this.sizesService
          .update(id, size.id, this.buildPayload(size))
          .pipe(catchError(() => of(null))),
      ),
    ];

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toastService.show('success', 'Operación completada.');
          this.loadSizes();
        },
        error: () => {
          this.saving.set(false);
          this.toastService.show('error', 'Hubo un error en la operación masiva.');
          this.loadSizes();
        },
      });
  }

  protected deleteAllSelectedSizes(): void {
    const id = this.productId();
    const selected = this.selectedSizes();
    if (!id || !selected.length) return;

    this.saving.set(true);
    const requests = selected.map((size) =>
      this.sizesService.remove(id, size.id).pipe(catchError(() => of(null))),
    );

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toastService.show('success', 'Tallas eliminadas.');
          this.loadSizes();
        },
        error: () => {
          this.saving.set(false);
          this.toastService.show('error', 'Error al eliminar tallas.');
          this.loadSizes();
        },
      });
  }

  protected saveSize(size: ProductSize): void {
    const id = this.productId();
    if (!id) return;

    this.saving.set(true);
    this.sizesService
      .add(id, size.id, this.buildPayload(size))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toastService.show('success', 'Talla guardada.');
          this.selectedSizes.update((items) => items.filter((s) => s.id !== size.id));
          this.loadSizes();
        },
        error: () => {
          this.saving.set(false);
          this.toastService.show('error', 'Error al guardar la talla.');
          this.loadSizes();
        },
      });
  }

  protected updateSize(size: ProductSize): void {
    const id = this.productId();
    if (!id) return;

    this.saving.set(true);
    this.sizesService
      .update(id, size.id, this.buildPayload(size))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toastService.show('success', 'Talla actualizada.');
          this.selectedSizes.update((items) => items.filter((s) => s.id !== size.id));
          this.loadSizes();
        },
        error: () => {
          this.saving.set(false);
          this.toastService.show('error', 'Error al actualizar la talla.');
          this.loadSizes();
        },
      });
  }

  protected removeSize(size: ProductSize): void {
    const id = this.productId();
    if (!id) return;

    this.saving.set(true);
    this.sizesService
      .remove(id, size.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toastService.show('success', 'Talla eliminada.');
          this.selectedSizes.update((items) => items.filter((s) => s.id !== size.id));
          this.loadSizes();
        },
        error: () => {
          this.saving.set(false);
          this.toastService.show('error', 'Error al eliminar la talla.');
          this.loadSizes();
        },
      });
  }

  private buildPayload(size: ProductSize): ProductSizeFormData {
    return {
      barcode: size.barcode ?? '',
      stock: size.stock != null ? Number(size.stock) : undefined,
      purchasePrice:
        size.purchasePrice != null ? Number(size.purchasePrice) : undefined,
      salePrice: size.salePrice != null ? Number(size.salePrice) : undefined,
      minSalePrice:
        size.minSalePrice != null ? Number(size.minSalePrice) : undefined,
    };
  }

  private captureSizeSnapshot(size: ProductSize): SizeFieldSnapshot {
    return {
      barcode: (size.barcode ?? '').toString().trim(),
      stock: this.normalizeNullableNumber(size.stock),
      purchasePrice: this.normalizeNullableNumber(size.purchasePrice),
      salePrice: this.normalizeNullableNumber(size.salePrice),
      minSalePrice: this.normalizeNullableNumber(size.minSalePrice),
    };
  }

  private isSizeAtInitialValues(size: ProductSize): boolean {
    const initial = this.initialSizeSnapshots.get(size.id);
    if (!initial) {
      return true;
    }

    const current = this.captureSizeSnapshot(size);
    return (
      current.barcode === initial.barcode &&
      current.stock === initial.stock &&
      current.purchasePrice === initial.purchasePrice &&
      current.salePrice === initial.salePrice &&
      current.minSalePrice === initial.minSalePrice
    );
  }

  private normalizeNullableNumber(value: unknown): number | null {
    if (value == null || `${value}`.trim() === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}

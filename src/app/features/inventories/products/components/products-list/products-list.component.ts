import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { downloadFile } from '../../../../../core/utils/file-download.util';
import { ConfirmDialogComponent } from '../../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ExportButtonComponent } from '../../../../../shared/ui/export-button/export-button.component';
import {
  DataTableComponent,
  DataTableColumn,
  DataTableEmptyState,
  DataTablePagination,
} from '../../../../../shared/ui/data-table/data-table.component';
import { DtCellDirective } from '../../../../../shared/ui/data-table/dt-cell.directive';
import { DtExpandCellComponent } from '../../../../../shared/ui/data-table/dt-expand-cell.component';
import { DtRowDirective } from '../../../../../shared/ui/data-table/dt-row.directive';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { TableActionsComponent } from '../../../../../shared/ui/table-actions/table-actions.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { ProductService } from '../../data-access/product.service';
import { ProductLookupService } from '../../data-access/product-lookup.service';
import { Product, Gender } from '../../models/product.model';

@Component({
  selector: 'app-products-list',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConfirmDialogComponent,
    DataTableComponent,
    DtCellDirective,
    DtExpandCellComponent,
    DtRowDirective,
    ExportButtonComponent,
    TableActionButtonComponent,
    TableActionsComponent,
  ],
  templateUrl: './products-list.component.html',
})
export class ProductsListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly productLookupService = inject(ProductLookupService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly products = signal<Product[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly limit = signal(10);

  protected readonly deleteConfirmId = signal<number | null>(null);
  protected readonly deleting = signal(false);

  protected readonly genders = signal<Gender[]>([]);
  protected readonly selectedGenderIds = signal<number[]>([]);

  protected readonly isExporting = signal(false);
  protected readonly isImporting = signal(false);

  protected readonly importInput = viewChild<ElementRef<HTMLInputElement>>('importInput');

  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  protected readonly currentSearch = signal('');

  protected readonly deleteTargetLabel = computed(() => {
    const id = this.deleteConfirmId();
    if (id === null) return '';
    const product = this.products().find((p) => p.id === id);
    return product ? product.name : '';
  });

  protected readonly paginationPages = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [1];
    if (current > 3) pages.push('...');
    for (
      let i = Math.max(2, current - 1);
      i <= Math.min(total - 1, current + 1);
      i++
    ) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  protected readonly paginationData = computed<DataTablePagination | null>(() => {
    if (this.totalPages() <= 1) return null;
    return {
      currentPage: this.page(),
      totalPages: this.totalPages(),
      pageSize: this.limit(),
      totalItems: this.total(),
      pages: this.paginationPages(),
    };
  });

  protected readonly hasActiveFilters = computed(
    () =>
      this.currentSearch().trim().length > 0 ||
      this.selectedGenderIds().length > 0,
  );

  protected readonly tableEmptySearch = computed(() => {
    if (!this.hasActiveFilters()) return '';
    return this.currentSearch().trim() || 'los filtros seleccionados';
  });

  protected readonly emptyState = computed<DataTableEmptyState>(() => ({
    icon: undefined as never,
    title: 'Aún no hay productos registrados',
    description: 'Crea el primer producto para comenzar a gestionar tu inventario.',
    actionLabel: 'Nuevo producto',
  }));

  protected readonly tableColumns = signal<DataTableColumn<Product>[]>([
    { key: 'id', label: '#', align: 'left', width: '80px', className: 'w-20' },
    { key: 'name', label: 'Nombre', align: 'left', mobilePrimary: true },
    { key: 'gender', label: 'Género', align: 'left', width: '128px', className: 'w-32' },
    { key: 'stock', label: 'Stock', align: 'right', width: '112px', className: 'w-28' },
    { key: 'actions', label: 'Acciones', align: 'right', width: '320px', className: 'w-80' },
  ]);

  ngOnInit(): void {
    this.loadProducts();
    this.loadGenders();

    this.filterForm.controls.search.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.currentSearch.set(value);
        this.page.set(1);
        this.loadProducts();
      });
  }

  protected loadProducts(): void {
    this.loading.set(true);
    this.productService
      .getAll({
        limit: this.limit(),
        page: this.page(),
        search: this.currentSearch(),
        genderId: this.selectedGenderIds(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.products.set(res.data);
          this.total.set(res.paginate.total);
          this.totalPages.set(res.paginate.pages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar la lista de productos.');
        },
      });
  }

  protected loadGenders(): void {
    this.productLookupService
      .getGenders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (genders) => {
          this.genders.set(genders);
        },
      });
  }

  protected goToPage(p: number | '...'): void {
    if (p === '...' || p === this.page()) return;
    this.page.set(p);
    this.loadProducts();
  }

  protected openCreate(): void {
    this.router.navigate(['/inventories/products/new']);
  }

  protected openEdit(id: number): void {
    this.router.navigate([`/inventories/products/${id}/general`]);
  }

  protected openSizes(id: number): void {
    this.router.navigate([`/inventories/products/${id}/sizes`]);
  }

  protected openColors(id: number): void {
    this.router.navigate([`/inventories/products/${id}/colors`]);
  }

  protected openKardex(id: number): void {
    this.router.navigate([`/inventories/products/${id}/kardex`]);
  }

  protected openHistory(id: number): void {
    this.router.navigate([`/inventories/products/${id}/history`]);
  }

  protected openInventoryUpdate(product: Product): void {
    this.router.navigate([`/inventories/reconciliations/${product.id}`], {
      state: {
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        gender: product.gender,
      },
    });
  }

  protected openDeleteConfirm(id: number): void {
    this.deleteConfirmId.set(id);
  }

  protected cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  protected confirmDelete(): void {
    const id = this.deleteConfirmId();
    if (id === null) return;

    this.deleting.set(true);
    this.productService
      .delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteConfirmId.set(null);
          this.deleting.set(false);
          this.toastService.show('success', 'Producto eliminado correctamente.');
          if (this.products().length === 1 && this.page() > 1) {
            this.page.update((p) => p - 1);
          }
          this.loadProducts();
        },
        error: (err: unknown) => {
          this.deleting.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo eliminar el producto.',
          );
        },
      });
  }

  protected clearSearch(): void {
    this.filterForm.controls.search.setValue('');
  }

  protected clearFilters(): void {
    this.filterForm.controls.search.setValue('');
    this.selectedGenderIds.set([]);
    this.page.set(1);
    this.loadProducts();
  }

  protected handleGenderSelection(ids: number[]): void {
    this.selectedGenderIds.set(ids);
    this.page.set(1);
    this.loadProducts();
  }

  protected toggleGender(id: number): void {
    const current = this.selectedGenderIds();
    const next = current.includes(id)
      ? current.filter((genderId) => genderId !== id)
      : [...current, id];
    this.handleGenderSelection(next);
  }

  protected isGenderSelected(id: number): boolean {
    return this.selectedGenderIds().includes(id);
  }

  protected exportProducts(): void {
    if (this.isExporting()) {
      return;
    }

    this.isExporting.set(true);
    const loadingToastId = this.toastService.loading('Generando archivo...');

    this.productService
      .exportToExcel()
      .pipe(
        finalize(() => this.isExporting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob: Blob) => {
          this.toastService.dismiss(loadingToastId);
          downloadFile(blob, {
            filename: 'productos',
            extension: 'xlsx',
            appendDate: true,
          });
          this.toastService.show('success', 'Archivo descargado', 3_000);
        },
        error: () => {
          this.toastService.dismiss(loadingToastId);
          this.toastService.show(
            'error',
            'Error al generar el archivo. Intenta nuevamente.',
            5_000,
          );
        },
      });
  }

  protected triggerImport(): void {
    const input = this.importInput();
    if (input) {
      input.nativeElement.value = '';
      input.nativeElement.click();
    }
  }

  protected onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isImporting.set(true);
    this.productService
      .importFromExcel(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isImporting.set(false);
          if (res.errors?.length) {
            this.toastService.show(
              'error',
              `Importación con errores: ${res.errors.slice(0, 3).join('; ')}`,
            );
          } else {
            this.toastService.show('success', res.message);
          }
          this.loadProducts();
        },
        error: () => {
          this.isImporting.set(false);
          this.toastService.show('error', 'Error al importar el archivo.');
        },
      });
  }

  protected getProductInitials(product: Product): string {
    const words = product.name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return product.name.substring(0, 2).toUpperCase();
  }

  protected getProductStock(product: Product): number {
    return Math.max(0, Math.trunc(Number(product.stock) || 0));
  }
}

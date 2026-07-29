import { DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import {
  buildProductsInventoryTableRows,
  countStockMismatches,
} from '../../data-access/products-inventory.adapter';
import { ProductsInventoryService } from '../../data-access/products-inventory.service';
import { ProductInventoryItem } from '../../models/products-inventory.model';

@Component({
  selector: 'app-products-inventory-report',
  imports: [DecimalPipe, RouterLink],
  providers: [ProductsInventoryService],
  templateUrl: './products-inventory-report.component.html',
})
export class ProductsInventoryReportComponent implements OnInit {
  private readonly productsInventoryService = inject(ProductsInventoryService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly exporting = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly products = signal<ProductInventoryItem[]>([]);

  protected readonly filteredProducts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.products();
    }

    return this.products().filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(query);
      const sizeMatch = product.sizes.some(
        (size) =>
          size.size.toLowerCase().includes(query) ||
          (size.barcode ?? '').toLowerCase().includes(query) ||
          size.colors.some((color) => color.color.toLowerCase().includes(query)),
      );
      return nameMatch || sizeMatch;
    });
  });

  protected readonly tableRows = computed(() =>
    buildProductsInventoryTableRows(this.filteredProducts()),
  );

  protected readonly productCount = computed(() => this.products().length);
  protected readonly filteredCount = computed(() => this.filteredProducts().length);
  protected readonly mismatchCount = computed(() =>
    countStockMismatches(this.filteredProducts()),
  );

  ngOnInit(): void {
    this.loadData();
  }

  protected loadData(): void {
    this.loading.set(true);

    this.productsInventoryService
      .loadInventory()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.products.set(products);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar el inventario.');
        },
      });
  }

  protected exportPdf(): void {
    this.exporting.set(true);

    this.productsInventoryService
      .downloadPdf()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `reporte-productos-inventario-${new Date().toISOString().slice(0, 10)}.pdf`;
          anchor.click();
          window.URL.revokeObjectURL(url);
          this.exporting.set(false);
        },
        error: () => {
          this.exporting.set(false);
          this.toastService.show('error', 'No se pudo exportar el PDF.');
        },
      });
  }

  protected onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
  }
}

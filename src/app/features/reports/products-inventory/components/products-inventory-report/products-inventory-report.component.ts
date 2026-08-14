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
import { finalize } from 'rxjs';
import { downloadFile } from '../../../../../core/utils/file-download.util';
import { ExportButtonComponent } from '../../../../../shared/ui/export-button/export-button.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import {
  buildProductsInventoryTableRows,
  countDeadStockProducts,
  countStockMismatches,
} from '../../data-access/products-inventory.adapter';
import { ProductsInventoryService } from '../../data-access/products-inventory.service';
import {
  ProductInventoryItem,
  ProductsInventoryAiSummary,
} from '../../models/products-inventory.model';

const DEFAULT_HORIZON_DAYS = 30;

@Component({
  selector: 'app-products-inventory-report',
  imports: [DecimalPipe, RouterLink, ExportButtonComponent],
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
  protected readonly horizonDays = signal(DEFAULT_HORIZON_DAYS);
  protected readonly aiSummary = signal<ProductsInventoryAiSummary | null>(null);
  protected readonly includeAi = signal(true);

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
  protected readonly deadStockCount = computed(() =>
    countDeadStockProducts(this.filteredProducts()),
  );

  ngOnInit(): void {
    this.loadData();
  }

  protected loadData(): void {
    this.loading.set(true);

    if (this.includeAi()) {
      this.productsInventoryService
        .loadInventoryWithAi(this.horizonDays())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (result) => {
            this.products.set(result.products);
            this.horizonDays.set(result.horizonDays);
            this.aiSummary.set(result.aiSummary);
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
            this.toastService.show('error', 'No se pudo cargar el inventario con predicciones IA.');
          },
        });
      return;
    }

    this.productsInventoryService
      .loadInventory()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.products.set(products);
          this.aiSummary.set(null);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar el inventario.');
        },
      });
  }

  protected toggleIncludeAi(): void {
    this.includeAi.update((value) => !value);
    this.loadData();
  }

  protected exportPdf(): void {
    if (this.exporting()) {
      return;
    }

    this.exporting.set(true);
    const loadingToastId = this.toastService.loading('Generando archivo...');

    this.productsInventoryService
      .downloadPdf()
      .pipe(
        finalize(() => this.exporting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob) => {
          this.toastService.dismiss(loadingToastId);
          downloadFile(blob, {
            filename: 'reporte-productos-inventario',
            extension: 'pdf',
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

  protected onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
  }
}

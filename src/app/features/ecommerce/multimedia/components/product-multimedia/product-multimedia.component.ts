import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  DataTableComponent,
  DataTableColumn,
  DataTableEmptyState,
  DataTablePagination,
  DtCellDirective,
  DtExpandCellComponent,
  DtRowDirective,
} from '../../../../../shared/ui/data-table/data-table.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { PublishProductService } from '../../../products/data-access/publish-product.service';
import { PublishProduct } from '../../../products/models/publish-product.model';
import { mediaCountFor } from '../../../products/utils/woocommerce-sync.util';
import { ProductGalleryComponent } from '../../../products/components/product-gallery/product-gallery.component';

@Component({
  selector: 'app-product-multimedia',
  imports: [ReactiveFormsModule, DataTableComponent, DtCellDirective, DtExpandCellComponent, DtRowDirective, ProductGalleryComponent],
  templateUrl: './product-multimedia.component.html',
})
export class ProductMultimediaComponent implements OnDestroy {
  private readonly publishProductService = inject(PublishProductService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly products = signal<PublishProduct[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly limit = signal(10);
  protected readonly currentSearch = signal('');

  protected readonly selectedProduct = signal<PublishProduct | null>(null);
  protected readonly mediaCountOverrides = signal<Map<number, number>>(new Map());

  protected readonly selectedProductList = computed(() => {
    const product = this.selectedProduct();
    return product ? [product] : [];
  });

  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  protected readonly tableColumns = signal<DataTableColumn<PublishProduct>[]>([
    { key: 'id', label: '#', width: '16' },
    { key: 'thumb', label: 'Foto', align: 'center', width: '56px' },
    { key: 'name', label: 'Producto', align: 'left', mobilePrimary: true },
    { key: 'barcode', label: 'Código', align: 'left' },
    { key: 'media', label: 'Imágenes', align: 'center', width: '80px' },
    { key: 'actions', label: '', align: 'right', width: '120px' },
  ]);

  protected readonly emptyState = computed<DataTableEmptyState>(() => ({
    icon: undefined as never,
    title: this.currentSearch().trim()
      ? 'No se encontraron productos'
      : 'Sin productos en el almacén',
    description: this.currentSearch().trim()
      ? 'Prueba con otro término de búsqueda.'
      : 'Busca un producto para gestionar sus imágenes de tienda online.',
  }));

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

  constructor() {
    this.loadProducts();

    this.filterForm.controls.search.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((term) => {
        this.currentSearch.set(term.trim());
        this.page.set(1);
        this.loadProducts();
      });
  }

  ngOnDestroy(): void {
    // Reservado por si se agregan previews en memoria más adelante.
  }

  protected mediaCount(product: PublishProduct): number {
    const override = this.mediaCountOverrides().get(product.id);
    if (override !== undefined) return override;
    return mediaCountFor(product);
  }

  protected listThumbUrl(product: PublishProduct): string | null {
    const url = product.media?.[0]?.url;
    if (!url?.trim()) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return null;
  }

  protected productInitial(name: string): string {
    return name.trim().charAt(0).toUpperCase() || '?';
  }

  protected isSelected(product: PublishProduct): boolean {
    return this.selectedProduct()?.id === product.id;
  }

  protected selectProduct(product: PublishProduct): void {
    if (this.selectedProduct()?.id === product.id) {
      this.selectedProduct.set(null);
      return;
    }
    this.selectedProduct.set(product);
  }

  protected onMediaCountChange(count: number): void {
    const selected = this.selectedProduct();
    if (!selected) return;

    this.mediaCountOverrides.update((map) => {
      const next = new Map(map);
      next.set(selected.id, count);
      return next;
    });
  }

  protected clearSearch(): void {
    this.filterForm.controls.search.setValue('');
    this.currentSearch.set('');
    this.page.set(1);
    this.loadProducts();
  }

  protected onPageChange(nextPage: number): void {
    this.page.set(nextPage);
    this.loadProducts();
  }

  protected closeGallery(): void {
    this.selectedProduct.set(null);
  }

  private loadProducts(): void {
    this.loading.set(true);

    this.publishProductService
      .search({
        limit: this.limit(),
        page: this.page(),
        search: this.currentSearch(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.products.set(response.data);
          this.total.set(response.paginate.total);
          this.totalPages.set(response.paginate.pages);
          this.loading.set(false);

          const selectedId = this.selectedProduct()?.id;
          if (selectedId) {
            const refreshed = response.data.find((p) => p.id === selectedId);
            if (refreshed) {
              this.selectedProduct.set(refreshed);
            }
          }
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudieron cargar los productos.');
        },
      });
  }
}

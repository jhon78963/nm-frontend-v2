import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import {
  TableDataComponent,
  TableDataColumn,
  TableDataEmptyState,
  TableDataPagination,
  DtCellDirective,
  DtExpandCellComponent,
  DtRowDirective,
} from '../../../../../shared/ui/table-data/table-data.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { PublishProductService } from '../../data-access/publish-product.service';
import { PublishProduct } from '../../models/publish-product.model';
import { mediaCountFor } from '../../utils/woocommerce-sync.util';
import { ProductCreateDrawerComponent } from '../product-create-drawer/product-create-drawer.component';
import { ProductPublishPanelComponent } from '../product-publish-panel/product-publish-panel.component';

@Component({
  selector: 'app-products-publish',
  imports: [
    ReactiveFormsModule,
    InputComponent,
    ButtonComponent,
    TableDataComponent,
    DtCellDirective,
    DtExpandCellComponent,
    DtRowDirective,
    ProductCreateDrawerComponent,
    ProductPublishPanelComponent,
  ],
  templateUrl: './products-publish.component.html',
})
export class ProductsPublishComponent implements OnInit {
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

  protected readonly createDrawerOpen = signal(false);
  protected readonly selectedProduct = signal<PublishProduct | null>(null);
  protected readonly loadingSelectedProduct = signal(false);

  protected readonly selectedProductList = computed(() => {
    const product = this.selectedProduct();
    return product ? [product] : [];
  });

  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  protected readonly tableColumns = signal<TableDataColumn<PublishProduct>[]>([
    { key: 'id', label: '#', width: '16' },
    { key: 'name', label: 'Producto', align: 'left', mobilePrimary: true },
    { key: 'barcode', label: 'Código', align: 'left' },
    { key: 'media', label: 'Imágenes', align: 'center', width: '80px' },
    { key: 'status', label: 'Estado', align: 'center', width: '100px' },
    { key: 'actions', label: '', align: 'right', width: '120px' },
  ]);

  protected readonly emptyState = computed<TableDataEmptyState>(() => ({
    icon: undefined as never,
    title: currentSearchEmpty(this.currentSearch())
      ? 'No se encontraron productos'
      : 'Sin productos en el almacén',
    description: currentSearchEmpty(this.currentSearch())
      ? 'Prueba con otro término de búsqueda o crea un producto nuevo.'
      : 'Crea un producto con variantes para publicarlo en WooCommerce.',
    actionLabel: 'Nuevo producto',
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

  protected readonly paginationData = computed<TableDataPagination | null>(() => {
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
    () => this.currentSearch().trim().length > 0,
  );

  ngOnInit(): void {
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

  protected mediaCount(product: PublishProduct): number {
    return mediaCountFor(product);
  }

  protected isSelected(product: PublishProduct): boolean {
    return this.selectedProduct()?.id === product.id;
  }

  protected selectProduct(product: PublishProduct): void {
    if (this.selectedProduct()?.id === product.id) {
      this.selectedProduct.set(null);
      this.loadingSelectedProduct.set(false);
      return;
    }

    this.selectedProduct.set(product);
    this.loadingSelectedProduct.set(true);

    this.publishProductService
      .getOne(product.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (full) => {
          this.selectedProduct.set(full);
          this.loadingSelectedProduct.set(false);
        },
        error: () => {
          this.loadingSelectedProduct.set(false);
          this.selectedProduct.set(null);
          this.toastService.show(
            'error',
            'No se pudo cargar la configuración ecommerce del producto.',
          );
        },
      });
  }

  protected openCreateDrawer(): void {
    this.createDrawerOpen.set(true);
  }

  protected closeCreateDrawer(): void {
    this.createDrawerOpen.set(false);
  }

  protected onProductCreated(productId: number): void {
    this.createDrawerOpen.set(false);
    this.loadProducts();

    this.publishProductService.getOne(productId).subscribe({
      next: (product) => this.selectedProduct.set(product),
    });
  }

  protected onProductUpdated(product: PublishProduct): void {
    this.selectedProduct.set(product);
    this.products.update((items) =>
      items.map((p) => (p.id === product.id ? { ...p, ...product } : p)),
    );
  }

  protected closePublishPanel(): void {
    this.selectedProduct.set(null);
  }

  protected clearSearch(): void {
    this.filterForm.controls.search.setValue('');
    this.currentSearch.set('');
    this.page.set(1);
    this.loadProducts();
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
    this.loadProducts();
  }

  protected loadProducts(): void {
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
              this.selectedProduct.update((current) =>
                current ? { ...current, media: refreshed.media } : current,
              );
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

function currentSearchEmpty(search: string): boolean {
  return search.trim().length > 0;
}

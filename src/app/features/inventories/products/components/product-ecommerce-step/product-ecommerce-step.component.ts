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
import { form, FormField } from '@angular/forms/signals';
import { forkJoin } from 'rxjs';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { CheckboxComponent } from '../../../../../shared/ui/checkbox/checkbox.component';
import {
  TableDataColumn,
  TableDataComponent,
} from '../../../../../shared/ui/table-data/table-data.component';
import { MoneyInputComponent } from '../../../../../shared/ui/money-input/money-input.component';
import { TextareaComponent } from '../../../../../shared/ui/textarea/textarea.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { ProductGalleryComponent } from '../../../../ecommerce/products/components/product-gallery/product-gallery.component';
import { WooCommerceService } from '../../../../ecommerce/products/data-access/product-media.service';
import { toEcommerceStepState } from '../../../../ecommerce/products/data-access/publish-product.adapter';
import { PublishProductService } from '../../../../ecommerce/products/data-access/publish-product.service';
import {
  EcommercePublishFormModel,
  EcommerceStepState,
  PublishProduct,
} from '../../../../ecommerce/products/models/publish-product.model';
import { notifyWooCommerceSyncResult } from '../../../../ecommerce/products/utils/woocommerce-sync.util';
import { ProductColorsService } from '../../data-access/product-colors.service';
import { EcommerceVariantRow } from '../../models/product.model';

const EMPTY_FORM: EcommercePublishFormModel = {
  publishOnline: false,
  wooDescription: '',
  onlinePrice: null,
};

@Component({
  selector: 'app-product-ecommerce-step',
  imports: [
    FormField,
    AlertComponent,
    ButtonComponent,
    CheckboxComponent,
    TableDataComponent,
    MoneyInputComponent,
    TextareaComponent,
    ProductGalleryComponent,
  ],
  templateUrl: './product-ecommerce-step.component.html',
})
export class ProductEcommerceStepComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);
  private readonly publishProductService = inject(PublishProductService);
  private readonly wooCommerceService = inject(WooCommerceService);
  private readonly productColorsService = inject(ProductColorsService);

  protected readonly productId = signal('');
  protected readonly product = signal<PublishProduct | null>(null);
  protected readonly ecommerceState = signal<EcommerceStepState | null>(null);
  protected readonly variants = signal<EcommerceVariantRow[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isSyncing = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly loadError = signal('');

  protected readonly isPublished = computed(
    () => this.ecommerceState()?.isPublished ?? false,
  );

  protected readonly syncStatus = computed(
    () => this.ecommerceState()?.syncStatus ?? 'never',
  );

  protected readonly formModel = signal<EcommercePublishFormModel>({ ...EMPTY_FORM });
  protected readonly publishForm = form(this.formModel);

  protected readonly variantColumns: TableDataColumn<EcommerceVariantRow>[] = [
    { key: 'sizeLabel', label: 'Talla' },
    { key: 'colorLabel', label: 'Color' },
    { key: 'price', label: 'Precio' },
    { key: 'stock', label: 'Stock' },
    { key: 'syncStatus', label: 'Sincronización' },
  ];

  protected readonly lastSyncedLabel = computed(() => {
    const raw = this.ecommerceState()?.lastSyncedAt;
    if (!raw) {
      return '';
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return raw;
    }

    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  });

  protected readonly moneyFormatter = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.productId.set(id);
    this.load();
  }

  protected load(): void {
    const id = this.productId();
    if (!id) {
      this.loadError.set('No se encontró el producto.');
      return;
    }

    this.isLoading.set(true);
    this.loadError.set('');

    forkJoin({
      product: this.publishProductService.getOne(id),
      variants: this.productColorsService.getAttachedColorVariants(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ product, variants }) => {
          this.applyProduct(product, null);
          this.variants.set(this.withVariantSyncStatus(variants));
          this.isLoading.set(false);
        },
        error: (err: unknown) => {
          this.isLoading.set(false);
          this.loadError.set(
            typeof err === 'string'
              ? err
              : 'No se pudo cargar la configuración de ecommerce.',
          );
        },
      });
  }

  protected onPublishToggle(checked: boolean): void {
    this.formModel.update((model) => ({ ...model, publishOnline: checked }));
  }

  protected onDescriptionChange(value: string): void {
    this.formModel.update((model) => ({ ...model, wooDescription: value }));
  }

  protected saveAndPublish(event: Event): void {
    event.preventDefault();
    const product = this.product();
    const model = this.formModel();

    if (!product || this.isSaving()) {
      return;
    }

    if (!model.publishOnline) {
      this.toastService.show(
        'info',
        'Activa “Publicar en tienda online” para sincronizar el producto.',
      );
      return;
    }

    this.isSaving.set(true);
    this.isSyncing.set(true);

    this.publishProductService
      .update(product.id, {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        description: model.wooDescription.trim() || product.description,
        status: product.status,
        genderId: product.genderId,
        warehouseId: product.warehouseId,
        percentageDiscount: product.percentageDiscount,
        cashDiscount: product.cashDiscount,
        isFeatured: product.isFeatured,
        isOnSale: product.isOnSale,
        wooStatus: 'publish',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.syncProduct(),
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.isSyncing.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string'
              ? err
              : 'No se pudo guardar la configuración de ecommerce.',
          );
        },
      });
  }

  protected syncNow(): void {
    if (this.isSyncing()) {
      return;
    }

    this.isSyncing.set(true);
    this.syncProduct();
  }

  protected formatMoney(value: number): string {
    return `S/ ${this.moneyFormatter.format(value)}`;
  }

  private syncProduct(): void {
    const id = this.productId();
    if (!id) {
      this.isSaving.set(false);
      this.isSyncing.set(false);
      return;
    }

    this.wooCommerceService
      .syncProduct(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSaving.set(false);
          this.isSyncing.set(false);

          const body = response.body;
          const sync = body?.wooCommerceSync;
          notifyWooCommerceSyncResult(
            this.toastService,
            sync,
            body?.message ?? 'Sincronización completada.',
          );

          const lastError =
            sync && (sync.errors > 0 || sync.products < 1 || !sync.attempted)
              ? (sync.error ?? 'La sincronización no se completó.')
              : null;

          const current = this.product();
          if (current) {
            const updated: PublishProduct = {
              ...current,
              wooStatus: 'publish',
              description: this.formModel().wooDescription || current.description,
              wooCommerce: {
                productId: body?.wooProductId ?? current.wooCommerce?.productId ?? null,
                lastSyncedAt:
                  body?.lastSyncedAt ?? current.wooCommerce?.lastSyncedAt ?? null,
              },
            };
            this.applyProduct(updated, lastError);
            this.variants.update((rows) => this.withVariantSyncStatus(rows));
          } else {
            this.load();
          }
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.isSyncing.set(false);
          const message =
            typeof err === 'string'
              ? err
              : 'No se pudo sincronizar con WooCommerce.';
          this.toastService.show('error', message);

          const current = this.product();
          if (current) {
            this.applyProduct(current, message);
          }
        },
      });
  }

  private applyProduct(product: PublishProduct, lastError: string | null): void {
    this.product.set(product);
    this.ecommerceState.set(toEcommerceStepState(product, lastError));
    this.formModel.set({
      publishOnline: product.wooStatus === 'publish' || !!product.wooCommerce?.productId,
      wooDescription: product.description,
      onlinePrice: null,
    });
  }

  private withVariantSyncStatus(rows: EcommerceVariantRow[]): EcommerceVariantRow[] {
    const status = this.syncStatus() === 'synced' ? 'synced' : 'pending';
    return rows.map((row) => ({ ...row, syncStatus: status }));
  }
}

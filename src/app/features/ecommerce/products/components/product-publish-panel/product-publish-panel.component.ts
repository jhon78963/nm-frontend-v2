import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  form,
  FormField,
  required,
} from '@angular/forms/signals';
import { distinctUntilChanged, finalize, switchMap } from 'rxjs';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import { PublishProductService } from '../../data-access/publish-product.service';
import { WooCommerceService } from '../../data-access/product-media.service';
import {
  PublishProduct,
  PublishSettingsFormModel,
} from '../../models/publish-product.model';
import { notifyWooCommerceSyncResult } from '../../utils/woocommerce-sync.util';
import { ProductGalleryComponent } from '../product-gallery/product-gallery.component';

const DEFAULT_SETTINGS: PublishSettingsFormModel = {
  isFeatured: false,
  isOnSale: false,
  percentageDiscount: '',
  cashDiscount: '',
  wooStatus: 'draft',
};

function settingsFromProduct(product: PublishProduct): PublishSettingsFormModel {
  return {
    isFeatured: product.isFeatured ?? false,
    isOnSale: product.isOnSale ?? false,
    percentageDiscount: product.percentageDiscount
      ? String(product.percentageDiscount)
      : '',
    cashDiscount: product.cashDiscount ? String(product.cashDiscount) : '',
    wooStatus: product.wooStatus ?? 'draft',
  };
}

@Component({
  selector: 'app-product-publish-panel',
  imports: [FormField, InputComponent, ProductGalleryComponent],
  templateUrl: './product-publish-panel.component.html',
})
export class ProductPublishPanelComponent {
  private readonly publishProductService = inject(PublishProductService);
  private readonly wooCommerceService = inject(WooCommerceService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly product = input.required<PublishProduct>();
  readonly updated = output<PublishProduct>();
  readonly closed = output<void>();

  protected readonly saving = signal(false);
  protected readonly mediaCount = signal(0);

  protected readonly settingsModel = signal<PublishSettingsFormModel>({
    ...DEFAULT_SETTINGS,
  });

  protected readonly settingsForm = form(this.settingsModel, (schema) => {
    required(schema.wooStatus, { message: 'Selecciona un estado.' });
  });

  protected readonly wooStatusError = computed(() =>
    fieldErrorMessage(this.settingsForm.wooStatus, {
      required: 'Selecciona un estado en WordPress.',
    }),
  );

  protected readonly wooStatusOptions = [
    { label: 'Borrador', value: 'draft' as const, description: 'Oculto en la tienda' },
    { label: 'Publicado', value: 'publish' as const, description: 'Visible en WooCommerce' },
  ];

  private readonly galleryRef = viewChild(ProductGalleryComponent);

  constructor() {
    toObservable(this.product)
      .pipe(
        distinctUntilChanged((prev, next) => prev.id === next.id),
        takeUntilDestroyed(),
      )
      .subscribe((product) => this.applyProductSettings(product));
  }

  private applyProductSettings(product: PublishProduct): void {
    this.settingsModel.set(settingsFromProduct(product));
    this.mediaCount.set(product.media?.length ?? 0);
  }

  protected closePanel(): void {
    this.closed.emit();
  }

  protected toggleFeatured(checked: boolean): void {
    this.settingsModel.update((model) => ({ ...model, isFeatured: checked }));
  }

  protected toggleOnSale(checked: boolean): void {
    this.settingsModel.update((model) => ({ ...model, isOnSale: checked }));
  }

  protected setWooStatus(status: 'draft' | 'publish'): void {
    this.settingsModel.update((model) => ({ ...model, wooStatus: status }));
  }

  protected onMediaCountChange(count: number): void {
    this.mediaCount.set(count);
  }

  protected saveAndSync(): void {
    if (this.saving()) return;

    this.settingsForm().markAsTouched();
    if (this.settingsForm().invalid()) return;

    const gallery = this.galleryRef();
    if (!gallery) {
      this.toastService.show(
        'error',
        'La galería aún no está lista. Espera un momento e intenta de nuevo.',
      );
      return;
    }

    const product = this.product();
    const settings = this.settingsModel();
    this.saving.set(true);

    gallery
      .uploadPendingIfAny(true)
      .pipe(
        switchMap(() =>
          this.publishProductService.update(product.id, {
            id: product.id,
            name: product.name,
            barcode: product.barcode,
            description: product.description,
            status: product.status,
            genderId: product.genderId,
            warehouseId: product.warehouseId,
            percentageDiscount: Number(settings.percentageDiscount) || 0,
            cashDiscount: Number(settings.cashDiscount) || 0,
            isFeatured: settings.isFeatured,
            isOnSale: settings.isOnSale,
            wooStatus: settings.wooStatus,
          }),
        ),
        switchMap(() => this.wooCommerceService.syncProduct(product.id)),
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          notifyWooCommerceSyncResult(
            this.toastService,
            response.body?.wooCommerceSync,
            'Configuración guardada.',
          );

          const updated: PublishProduct = {
            ...product,
            isFeatured: settings.isFeatured,
            isOnSale: settings.isOnSale,
            percentageDiscount: Number(settings.percentageDiscount) || 0,
            cashDiscount: Number(settings.cashDiscount) || 0,
            wooStatus: settings.wooStatus,
          };

          if (response.body?.wooProductId) {
            updated.wooCommerce = {
              productId: response.body.wooProductId,
              lastSyncedAt: response.body.lastSyncedAt,
            };
          }

          this.updated.emit(updated);
        },
        error: (err: unknown) => {
          const message =
            typeof err === 'string'
              ? err
              : 'No se pudo guardar, subir imágenes ni sincronizar el producto.';
          this.toastService.show('error', message);
        },
      });
  }
}

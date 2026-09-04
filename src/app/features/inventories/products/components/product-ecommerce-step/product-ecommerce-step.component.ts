import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { finalize, switchMap } from 'rxjs';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { CheckboxComponent } from '../../../../../shared/ui/checkbox/checkbox.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { MoneyInputComponent } from '../../../../../shared/ui/money-input/money-input.component';
import { RadioGroupComponent } from '../../../../../shared/ui/radio-group/radio-group.component';
import { TextareaComponent } from '../../../../../shared/ui/textarea/textarea.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { ProductGalleryComponent } from '../../../../ecommerce/products/components/product-gallery/product-gallery.component';
import { ProductService } from '../../data-access/product.service';
import {
  EMPTY_PRODUCT_ECOMMERCE_FORM,
  ProductEcommerceFormModel,
} from '../../models/product-ecommerce.model';
import { Product } from '../../models/product.model';

function resolveOfferPrice(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value) || value <= 0) {
    return null;
  }

  return value;
}

function resolveErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'string' && err.trim()) {
    return err;
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }

  const http = err as {
    error?: { message?: string | string[] };
    message?: string;
  };
  const backendMessage = http?.error?.message;

  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage;
  }
  if (Array.isArray(backendMessage) && backendMessage.length > 0) {
    return backendMessage.join(' ');
  }
  if (typeof http?.message === 'string' && http.message.trim()) {
    return http.message;
  }

  return fallback;
}

function formFromProduct(product: Product): ProductEcommerceFormModel {
  return {
    storeStatus: product.wooStatus === 'publish' ? 'publish' : 'draft',
    shortDescription: product.shortDescription ?? '',
    description: product.description ?? '',
    additionalInfo: product.additionalInfo ?? '',
    isNew: product.isNew ?? false,
    isFeatured: product.isFeatured ?? false,
    isOnSale: product.isOnSale ?? false,
    percentageDiscount: product.percentageDiscount
      ? String(product.percentageDiscount)
      : '',
    cashDiscount: product.cashDiscount ? String(product.cashDiscount) : '',
    offerPrice: resolveOfferPrice(product.offerPrice),
  };
}

@Component({
  selector: 'app-product-ecommerce-step',
  imports: [
    FormField,
    AlertComponent,
    ButtonComponent,
    CheckboxComponent,
    InputComponent,
    MoneyInputComponent,
    RadioGroupComponent,
    TextareaComponent,
    ProductGalleryComponent,
  ],
  templateUrl: './product-ecommerce-step.component.html',
})
export class ProductEcommerceStepComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);
  private readonly productService = inject(ProductService);

  protected readonly productId = signal('');
  protected readonly product = signal<Product | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly loadError = signal('');
  protected readonly mediaCount = signal(0);

  protected readonly formModel = signal<ProductEcommerceFormModel>({
    ...EMPTY_PRODUCT_ECOMMERCE_FORM,
  });
  protected readonly ecommerceForm = form(this.formModel);

  protected readonly storeStatusOptions = [
    { value: 'draft' as const, label: 'Borrador — oculto en la tienda online' },
    { value: 'publish' as const, label: 'Publicado — visible en nm-ecommerce' },
  ];

  protected readonly isPublished = computed(
    () => this.formModel().storeStatus === 'publish',
  );

  private readonly galleryRef = viewChild(ProductGalleryComponent);

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

    this.productService
      .getOne(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (product) => {
          this.product.set(product);
          this.formModel.set(formFromProduct(product));
          this.mediaCount.set(product.media?.length ?? 0);
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

  protected onStoreStatusChange(status: 'draft' | 'publish'): void {
    this.formModel.update((model) => ({ ...model, storeStatus: status }));
  }

  protected onShortDescriptionChange(value: string): void {
    this.formModel.update((model) => ({ ...model, shortDescription: value }));
  }

  protected onDescriptionChange(value: string): void {
    this.formModel.update((model) => ({ ...model, description: value }));
  }

  protected onAdditionalInfoChange(value: string): void {
    this.formModel.update((model) => ({ ...model, additionalInfo: value }));
  }

  protected toggleIsNew(checked: boolean): void {
    this.formModel.update((model) => ({ ...model, isNew: checked }));
  }

  protected toggleIsFeatured(checked: boolean): void {
    this.formModel.update((model) => ({ ...model, isFeatured: checked }));
  }

  protected toggleIsOnSale(checked: boolean): void {
    this.formModel.update((model) => ({ ...model, isOnSale: checked }));
  }

  protected onMediaCountChange(count: number): void {
    this.mediaCount.set(count);
  }

  protected save(event: Event): void {
    event.preventDefault();

    const current = this.product();
    const model = this.formModel();
    if (!current || this.isSaving()) {
      return;
    }

    const gallery = this.galleryRef();
    if (!gallery) {
      this.toastService.show('error', 'La galería aún no está lista.');
      return;
    }

    this.isSaving.set(true);

    gallery
      .uploadPendingIfAny(true)
      .pipe(
        switchMap(() =>
          this.productService.update(current.id, {
            id: current.id,
            name: current.name,
            barcode: current.barcode,
            description: model.description.trim(),
            shortDescription: model.shortDescription.trim(),
            additionalInfo: model.additionalInfo.trim(),
            status: current.status,
            genderId: current.genderId,
            warehouseId: current.warehouseId,
            percentageDiscount: Number(model.percentageDiscount) || 0,
            cashDiscount: Number(model.cashDiscount) || 0,
            offerPrice: resolveOfferPrice(model.offerPrice),
            isFeatured: model.isFeatured,
            isOnSale: model.isOnSale,
            isNew: model.isNew,
            wooStatus: model.storeStatus,
          }),
        ),
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toastService.show('success', 'Contenido de tienda online guardado.');
          this.product.update((product) =>
            product
              ? {
                  ...product,
                  description: model.description.trim(),
                  shortDescription: model.shortDescription.trim(),
                  additionalInfo: model.additionalInfo.trim(),
                  percentageDiscount: Number(model.percentageDiscount) || 0,
                  cashDiscount: Number(model.cashDiscount) || 0,
                  offerPrice: resolveOfferPrice(model.offerPrice),
                  isFeatured: model.isFeatured,
                  isOnSale: model.isOnSale,
                  isNew: model.isNew,
                  wooStatus: model.storeStatus,
                }
              : product,
          );
        },
        error: (err: unknown) => {
          this.toastService.show(
            'error',
            resolveErrorMessage(
              err,
              'No se pudo guardar el contenido de ecommerce.',
            ),
          );
        },
      });
  }
}

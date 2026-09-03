import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  form,
  FormField,
  maxLength,
  required,
} from '@angular/forms/signals';
import { concatMap, finalize, from, map, switchMap, toArray } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { MoneyInputComponent } from '../../../../../shared/ui/money-input/money-input.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { SelectComponent, SelectOption } from '../../../../../shared/ui/select/select.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import {
  PublishCatalogService,
  PublishVariantService,
} from '../../data-access/publish-catalog.service';
import { PublishProductService } from '../../data-access/publish-product.service';
import {
  CatalogOption,
  GenderOption,
  PublishProductFormModel,
  PublishVariantFormModel,
  WarehouseOption,
} from '../../models/publish-product.model';

const EMPTY_PRODUCT: PublishProductFormModel = {
  name: '',
  barcode: '',
  description: '',
  genderId: null,
  warehouseId: null,
};

const EMPTY_VARIANT: PublishVariantFormModel = {
  sizeId: null,
  colorId: null,
  salePrice: null,
  minSalePrice: null,
  stock: 0,
};

@Component({
  selector: 'app-product-create-drawer',
  imports: [
    FormField,
    FormsModule,
    InputComponent,
    SelectComponent,
    ButtonComponent,
    MoneyInputComponent,
    TableActionButtonComponent,
  ],
  templateUrl: './product-create-drawer.component.html',
})
export class ProductCreateDrawerComponent implements OnInit {
  private readonly publishProductService = inject(PublishProductService);
  private readonly publishCatalogService = inject(PublishCatalogService);
  private readonly publishVariantService = inject(PublishVariantService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly created = output<string>();
  readonly closed = output<void>();

  protected readonly loadingCatalogs = signal(true);
  protected readonly creating = signal(false);

  protected readonly genders = signal<GenderOption[]>([]);
  protected readonly warehouses = signal<WarehouseOption[]>([]);
  protected readonly catalogSizes = signal<CatalogOption[]>([]);
  protected readonly catalogColors = signal<CatalogOption[]>([]);
  protected readonly variants = signal<PublishVariantFormModel[]>([{ ...EMPTY_VARIANT }]);
  protected readonly variantErrors = signal<string[]>([]);

  protected readonly formModel = signal<PublishProductFormModel>({ ...EMPTY_PRODUCT });

  protected readonly productForm = form(this.formModel, (schema) => {
    required(schema.name, { message: 'El nombre es obligatorio.' });
    maxLength(schema.name, 200, { message: 'Máximo 200 caracteres.' });
    required(schema.genderId, { message: 'El género es obligatorio.' });
    required(schema.warehouseId, { message: 'El almacén es obligatorio.' });
  });

  protected readonly nameError = computed(() =>
    fieldErrorMessage(this.productForm.name, {
      required: 'El nombre es obligatorio.',
      maxLength: 'Máximo 200 caracteres.',
    }),
  );

  protected readonly genderError = computed(() =>
    fieldErrorMessage(this.productForm.genderId, {
      required: 'El género es obligatorio.',
    }),
  );

  protected readonly warehouseError = computed(() =>
    fieldErrorMessage(this.productForm.warehouseId, {
      required: 'El almacén es obligatorio.',
    }),
  );

  protected readonly genderOptions = computed<SelectOption<string>[]>(() =>
    this.genders().map((g) => ({ label: g.description, value: g.id })),
  );

  protected readonly warehouseOptions = computed<SelectOption<string>[]>(() =>
    this.warehouses().map((w) => ({ label: w.name, value: w.id })),
  );

  protected readonly sizeOptions = computed<SelectOption<string>[]>(() =>
    this.catalogSizes().map((s) => ({ label: s.description, value: s.id })),
  );

  protected readonly colorOptions = computed<SelectOption<string>[]>(() =>
    this.catalogColors().map((c) => ({ label: c.description, value: c.id })),
  );

  ngOnInit(): void {
    this.loadCatalogs();
  }

  protected close(): void {
    this.closed.emit();
  }

  protected addVariant(): void {
    this.variants.update((items) => [...items, { ...EMPTY_VARIANT }]);
  }

  protected removeVariant(index: number): void {
    if (this.variants().length <= 1) return;
    this.variants.update((items) => items.filter((_, i) => i !== index));
  }

  protected updateVariant<K extends keyof PublishVariantFormModel>(
    index: number,
    field: K,
    value: PublishVariantFormModel[K],
  ): void {
    this.variants.update((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.productForm().markAsTouched();

    const variantValidation = this.validateVariants();
    this.variantErrors.set(variantValidation);

    if (this.productForm().invalid() || variantValidation.some(Boolean)) {
      return;
    }

    const raw = this.formModel();
    const variants = this.variants();

    this.creating.set(true);

    this.publishProductService
      .create({
        name: raw.name.trim(),
        barcode: raw.barcode.trim(),
        description: raw.description.trim(),
        genderId: raw.genderId!,
        warehouseId: raw.warehouseId!,
        status: 'AVAILABLE',
      })
      .pipe(
        switchMap((response) => {
          const productId = response.productId;
          return from(variants).pipe(
            concatMap((variant) =>
              this.attachVariant(productId, variant, raw.barcode.trim()),
            ),
            toArray(),
            map(() => productId),
          );
        }),
        finalize(() => this.creating.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (productId) => {
          this.toastService.show(
            'success',
            'Producto creado. Configura el contenido de tienda online.',
          );
          this.created.emit(productId);
        },
        error: (err: unknown) => {
          const message =
            typeof err === 'string' ? err : 'No se pudo crear el producto.';
          this.toastService.show('error', message);
        },
      });
  }

  protected parseOptionalNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  protected parseStock(value: string): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
  }

  private loadCatalogs(): void {
    this.loadingCatalogs.set(true);

    this.publishCatalogService.getGenders().subscribe({
      next: (genders) => {
        this.genders.set(genders);
        const defaultGender = genders[0] ?? null;
        if (defaultGender) {
          this.formModel.update((m) => ({ ...m, genderId: defaultGender.id }));
        }
      },
    });

    this.publishCatalogService.getWarehouses().subscribe({
      next: (warehouses) => {
        this.warehouses.set(warehouses);
        const defaultWarehouse = warehouses[0] ?? null;
        if (defaultWarehouse) {
          this.formModel.update((m) => ({
            ...m,
            warehouseId: defaultWarehouse.id,
          }));
        }
        this.loadingCatalogs.set(false);
      },
      error: () => {
        this.loadingCatalogs.set(false);
        this.toastService.show(
          'error',
          'No se pudieron cargar catálogos de tallas, colores o almacenes.',
        );
      },
    });

    this.publishCatalogService.getSizes().subscribe({
      next: (sizes) => this.catalogSizes.set(sizes),
    });

    this.publishCatalogService.getColors().subscribe({
      next: (colors) => this.catalogColors.set(colors),
    });
  }

  private validateVariants(): string[] {
    return this.variants().map((variant) => {
      if (!variant.sizeId) return 'Selecciona una talla.';
      if (!variant.colorId) return 'Selecciona un color.';
      if (variant.salePrice == null || variant.salePrice <= 0) {
        return 'Ingresa un precio de venta válido.';
      }
      return '';
    });
  }

  private attachVariant(
    productId: string,
    variant: PublishVariantFormModel,
    productBarcode: string,
  ) {
    const sizeId = Number(variant.sizeId);
    const colorId = Number(variant.colorId);
    const salePrice = Number(variant.salePrice);
    const minSalePrice = Number(variant.minSalePrice ?? variant.salePrice);
    const stock = Number(variant.stock ?? 0);

    return this.publishVariantService
      .attachSize(productId, sizeId, {
        barcode: productBarcode ? Number(productBarcode) || 0 : 0,
        stock,
        purchasePrice: 0,
        salePrice,
        minSalePrice,
      })
      .pipe(
        switchMap(() =>
          this.publishVariantService.getProductSizeId(productId, sizeId),
        ),
        switchMap((res) =>
          this.publishVariantService.attachColor(res.productSizeId, colorId, {
            stock,
          }),
        ),
      );
  }
}

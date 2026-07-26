import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
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
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { SelectComponent, SelectOption } from '../../../../../shared/ui/select/select.component';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import { ProductService } from '../../data-access/product.service';
import { ProductLookupService } from '../../data-access/product-lookup.service';
import { ProductFormModel, Gender, Warehouse } from '../../models/product.model';

const EMPTY_FORM: ProductFormModel = {
  name: '',
  genderId: 1,
  warehouseId: 1,
};

@Component({
  selector: 'app-product-form',
  imports: [
    FormField,
    InputComponent,
    SelectComponent,
    AlertComponent,
  ],
  templateUrl: './product-form.component.html',
})
export class ProductFormComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly productLookupService = inject(ProductLookupService);
  private readonly destroyRef = inject(DestroyRef);

  readonly productId = input<number | null>(null);

  readonly saved = output<{ message: string; productId: number }>();
  readonly closed = output<void>();

  protected readonly loadingData = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');

  protected readonly genders = signal<Gender[]>([]);
  protected readonly warehouses = signal<Warehouse[]>([]);

  protected readonly formModel = signal<ProductFormModel>({ ...EMPTY_FORM });

  protected readonly isEditing = computed(() => this.productId() !== null);

  protected readonly genderOptions = computed<SelectOption<number>[]>(() =>
    this.genders().map((g) => ({ label: g.description, value: g.id })),
  );

  protected readonly warehouseOptions = computed<SelectOption<number>[]>(() =>
    this.warehouses().map((w) => ({ label: w.name, value: w.id })),
  );

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

  ngOnInit(): void {
    this.loadGenders();
    this.loadWarehouses();

    const id = this.productId();

    if (id !== null) {
      this.productService
        .getOne(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (product) => {
            this.formModel.set({
              name: product.name,
              genderId: product.genderId,
              warehouseId: product.warehouseId,
            });
            this.loadingData.set(false);
          },
          error: () => {
            this.loadError.set('No se pudo cargar el producto.');
            this.loadingData.set(false);
          },
        });
    } else {
      this.loadingData.set(false);
    }
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

  protected loadWarehouses(): void {
    this.productLookupService
      .getWarehouses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (warehouses) => {
          this.warehouses.set(warehouses);
        },
      });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.productForm().markAsTouched();

    if (this.productForm().invalid()) {
      return;
    }

    const model = this.formModel();
    const payload = {
      name: model.name.trim(),
      genderId: model.genderId,
      warehouseId: model.warehouseId,
      barcode: '',
      description: '',
      status: 'active',
      percentageDiscount: 0,
      cashDiscount: 0,
    };

    const id = this.productId();
    this.saving.set(true);
    this.loadError.set('');

    if (id !== null) {
      this.productService
        .update(id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.saving.set(false);
            this.saved.emit({
              message: 'Producto actualizado correctamente.',
              productId: res.productId,
            });
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.loadError.set(
              typeof err === 'string' ? err : 'No se pudo actualizar el producto.',
            );
          },
        });
    } else {
      this.productService
        .create(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.saving.set(false);
            this.saved.emit({
              message: 'Producto creado correctamente.',
              productId: res.productId,
            });
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.loadError.set(
              typeof err === 'string' ? err : 'No se pudo crear el producto.',
            );
          },
        });
    }
  }

  protected close(): void {
    this.closed.emit();
  }
}

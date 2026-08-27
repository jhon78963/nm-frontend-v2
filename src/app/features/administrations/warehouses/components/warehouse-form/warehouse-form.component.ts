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
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { SelectComponent, SelectOption } from '../../../../../shared/ui/select/select.component';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import { WarehouseLookupService } from '../../data-access/warehouse-lookup.service';
import { WarehouseService } from '../../data-access/warehouse.service';
import { WarehouseFormModel } from '../../models/warehouse.model';

const EMPTY_FORM: WarehouseFormModel = {
  name: '',
  tenantId: null,
};

@Component({
  selector: 'app-warehouse-form',
  imports: [FormField, InputComponent, SelectComponent, ButtonComponent, TableActionButtonComponent],
  templateUrl: './warehouse-form.component.html',
})
export class WarehouseFormComponent implements OnInit {
  private readonly warehouseService = inject(WarehouseService);
  private readonly lookupService = inject(WarehouseLookupService);
  private readonly destroyRef = inject(DestroyRef);

  readonly warehouseId = input<string | null>(null);

  readonly saved = output<string>();
  readonly closed = output<void>();

  protected readonly loadingData = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');

  protected readonly tenantOptions = signal<SelectOption<string>[]>([]);

  protected readonly formModel = signal<WarehouseFormModel>({ ...EMPTY_FORM });

  protected readonly isEditing = computed(() => this.warehouseId() !== null);

  protected readonly warehouseForm = form(this.formModel, (schema) => {
    required(schema.tenantId, { message: 'Selecciona un cliente.' });
    required(schema.name, { message: 'El nombre de la tienda es obligatorio.' });
    maxLength(schema.name, 25, { message: 'Máximo 25 caracteres.' });
  });

  protected readonly tenantError = computed(() =>
    fieldErrorMessage(this.warehouseForm.tenantId, {
      required: 'Selecciona un cliente.',
    }),
  );

  protected readonly nameError = computed(() =>
    fieldErrorMessage(this.warehouseForm.name, {
      required: 'El nombre de la tienda es obligatorio.',
      maxLength: 'Máximo 25 caracteres.',
    }),
  );

  ngOnInit(): void {
    this.lookupService
      .getTenants()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tenants) => {
          this.tenantOptions.set(
            tenants.map((t) => ({ label: t.name, value: t.id })),
          );
        },
        error: () => {
          this.loadError.set('No se pudo cargar la lista de clientes.');
        },
      });

    const id = this.warehouseId();

    if (id !== null) {
      this.warehouseService
        .getOne(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (warehouse) => {
            this.formModel.set({
              name: warehouse.name,
              tenantId: warehouse.tenantId,
            });
            this.loadingData.set(false);
          },
          error: () => {
            this.loadError.set('No se pudo cargar la tienda.');
            this.loadingData.set(false);
          },
        });
    } else {
      this.loadingData.set(false);
    }
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.warehouseForm().markAsTouched();

    if (this.warehouseForm().invalid()) {
      return;
    }

    const model = this.formModel();
    const tenantId = model.tenantId;
    if (tenantId === null) {
      return;
    }

    const payload = {
      name: model.name.trim(),
      tenantId,
    };

    const id = this.warehouseId();
    this.saving.set(true);
    this.loadError.set('');

    if (id !== null) {
      this.warehouseService
        .update(id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit('Tienda actualizada correctamente.');
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.loadError.set(
              typeof err === 'string'
                ? err
                : 'No se pudo guardar la tienda. Verifica los datos.',
            );
          },
        });
    } else {
      this.warehouseService
        .create(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit('Tienda creada correctamente.');
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.loadError.set(
              typeof err === 'string'
                ? err
                : 'No se pudo crear la tienda. Verifica los datos.',
            );
          },
        });
    }
  }

  protected close(): void {
    this.closed.emit();
  }
}

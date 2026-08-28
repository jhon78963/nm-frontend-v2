import {
  Component,
  computed,
  DestroyRef,
  effect,
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
import { CheckboxComponent } from '../../../../../shared/ui/checkbox/checkbox.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { SelectComponent, SelectOption } from '../../../../../shared/ui/select/select.component';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import { WarehouseLookupService } from '../../data-access/warehouse-lookup.service';
import { WarehouseService } from '../../data-access/warehouse.service';
import { TenantLookupOption, WarehouseFormModel } from '../../models/warehouse.model';

const EMPTY_FORM: WarehouseFormModel = {
  name: '',
  tenantId: null,
  electronicInvoicingEnabled: false,
};

@Component({
  selector: 'app-warehouse-form',
  imports: [FormField, InputComponent, SelectComponent, CheckboxComponent, ButtonComponent, TableActionButtonComponent],
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
  private readonly tenantLookup = signal<TenantLookupOption[]>([]);
  protected readonly tenantElectronicInvoicingEnabled = signal(false);

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

  constructor() {
    effect(() => {
      const tenantId = this.formModel().tenantId;
      if (!tenantId) {
        this.tenantElectronicInvoicingEnabled.set(false);
        return;
      }

      const tenant = this.tenantLookup().find((item) => item.id === tenantId);
      const enabled = tenant?.electronicInvoicingEnabled ?? false;
      this.tenantElectronicInvoicingEnabled.set(enabled);

      if (!enabled) {
        this.formModel.update((current) => ({
          ...current,
          electronicInvoicingEnabled: false,
        }));
      }
    });
  }

  ngOnInit(): void {
    this.lookupService
      .getTenants()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tenants) => {
          this.tenantLookup.set(tenants);
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
            this.tenantLookup.update((current) => {
              const others = current.filter((item) => item.id !== warehouse.tenantId);
              return [
                ...others,
                {
                  id: warehouse.tenantId ?? '',
                  name:
                    current.find((item) => item.id === warehouse.tenantId)?.name ??
                    'Cliente',
                  electronicInvoicingEnabled:
                    warehouse.tenantElectronicInvoicingEnabled ?? false,
                },
              ];
            });
            this.formModel.set({
              name: warehouse.name,
              tenantId: warehouse.tenantId,
              electronicInvoicingEnabled: warehouse.electronicInvoicingEnabled ?? false,
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
      electronicInvoicingEnabled: model.electronicInvoicingEnabled,
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

  protected onWarehouseElectronicInvoicingChange(enabled: boolean): void {
    this.formModel.update((current) => ({
      ...current,
      electronicInvoicingEnabled: enabled,
    }));
  }
}

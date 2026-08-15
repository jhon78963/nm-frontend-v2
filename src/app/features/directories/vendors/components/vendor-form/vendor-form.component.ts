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
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import { VendorService } from '../../data-access/vendor.service';
import { VendorFormModel } from '../../models/vendor.model';

const EMPTY_FORM: VendorFormModel = {
  name: '',
  phone: '',
  address: '',
  local: '',
};

@Component({
  selector: 'app-vendor-form',
  imports: [FormField, InputComponent, ButtonComponent, AlertComponent, TableActionButtonComponent],
  templateUrl: './vendor-form.component.html',
})
export class VendorFormComponent implements OnInit {
  private readonly vendorService = inject(VendorService);
  private readonly destroyRef = inject(DestroyRef);

  readonly vendorId = input<number | null>(null);

  readonly saved = output<string>();
  readonly closed = output<void>();

  protected readonly loadingData = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');

  protected readonly formModel = signal<VendorFormModel>({ ...EMPTY_FORM });

  protected readonly isEditing = computed(() => this.vendorId() !== null);

  protected readonly vendorForm = form(this.formModel, (schema) => {
    required(schema.name, { message: 'El nombre es obligatorio.' });
    maxLength(schema.name, 100, { message: 'Máximo 100 caracteres.' });
    maxLength(schema.phone, 50, { message: 'Máximo 50 caracteres.' });
    maxLength(schema.address, 100, { message: 'Máximo 100 caracteres.' });
    maxLength(schema.local, 100, { message: 'Máximo 100 caracteres.' });
  });

  protected readonly nameError = computed(() =>
    fieldErrorMessage(this.vendorForm.name, {
      required: 'El nombre es obligatorio.',
      maxLength: 'Máximo 100 caracteres.',
    }),
  );

  protected readonly phoneError = computed(() =>
    fieldErrorMessage(this.vendorForm.phone, {
      maxLength: 'Máximo 50 caracteres.',
    }),
  );

  protected readonly addressError = computed(() =>
    fieldErrorMessage(this.vendorForm.address, {
      maxLength: 'Máximo 100 caracteres.',
    }),
  );

  protected readonly localError = computed(() =>
    fieldErrorMessage(this.vendorForm.local, {
      maxLength: 'Máximo 100 caracteres.',
    }),
  );

  ngOnInit(): void {
    const id = this.vendorId();

    if (id !== null) {
      this.vendorService
        .getOne(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (vendor) => {
            this.formModel.set({
              name: vendor.name,
              phone: vendor.phone,
              address: vendor.address,
              local: vendor.local,
            });
            this.loadingData.set(false);
          },
          error: () => {
            this.loadError.set('No se pudo cargar el proveedor.');
            this.loadingData.set(false);
          },
        });
    } else {
      this.loadingData.set(false);
    }
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.vendorForm().markAsTouched();

    if (this.vendorForm().invalid()) {
      return;
    }

    const model = this.formModel();
    const payload = {
      name: model.name.trim(),
      phone: model.phone.trim() || undefined,
      address: model.address.trim() || undefined,
      local: model.local.trim() || undefined,
    };

    const id = this.vendorId();
    this.saving.set(true);
    this.loadError.set('');

    if (id !== null) {
      this.vendorService
        .update(id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit('Proveedor actualizado correctamente.');
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.loadError.set(
              typeof err === 'string' ? err : 'No se pudo actualizar el proveedor.',
            );
          },
        });
    } else {
      this.vendorService
        .create(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit('Proveedor creado correctamente.');
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.loadError.set(
              typeof err === 'string' ? err : 'No se pudo crear el proveedor.',
            );
          },
        });
    }
  }

  protected close(): void {
    this.closed.emit();
  }
}

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
  pattern,
  required,
} from '@angular/forms/signals';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import { CustomerService } from '../../data-access/customer.service';
import { CustomerFormModel } from '../../models/customer.model';

const EMPTY_FORM: CustomerFormModel = {
  dni: '',
  name: '',
  surname: '',
};

@Component({
  selector: 'app-customer-form',
  imports: [FormField, InputComponent, ButtonComponent, AlertComponent],
  templateUrl: './customer-form.component.html',
})
export class CustomerFormComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly destroyRef = inject(DestroyRef);

  readonly customerId = input<number | null>(null);

  readonly saved = output<string>();
  readonly closed = output<void>();

  protected readonly loadingData = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');

  protected readonly formModel = signal<CustomerFormModel>({ ...EMPTY_FORM });

  protected readonly isEditing = computed(() => this.customerId() !== null);

  protected readonly customerForm = form(this.formModel, (schema) => {
    required(schema.dni, { message: 'El DNI es obligatorio.' });
    pattern(schema.dni, /^\d{8}$/, { message: 'El DNI debe tener 8 dígitos.' });
    required(schema.name, { message: 'Los nombres son obligatorios.' });
    maxLength(schema.name, 100, { message: 'Máximo 100 caracteres.' });
    required(schema.surname, { message: 'Los apellidos son obligatorios.' });
    maxLength(schema.surname, 100, { message: 'Máximo 100 caracteres.' });
  });

  protected readonly dniError = computed(() =>
    fieldErrorMessage(this.customerForm.dni, {
      required: 'El DNI es obligatorio.',
      pattern: 'El DNI debe tener 8 dígitos.',
    }),
  );

  protected readonly nameError = computed(() =>
    fieldErrorMessage(this.customerForm.name, {
      required: 'Los nombres son obligatorios.',
      maxLength: 'Máximo 100 caracteres.',
    }),
  );

  protected readonly surnameError = computed(() =>
    fieldErrorMessage(this.customerForm.surname, {
      required: 'Los apellidos son obligatorios.',
      maxLength: 'Máximo 100 caracteres.',
    }),
  );

  ngOnInit(): void {
    const id = this.customerId();

    if (id !== null) {
      this.customerService
        .getOne(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (customer) => {
            this.formModel.set({
              dni: String(customer.dni).replace(/\D/g, '').slice(0, 8),
              name: customer.name,
              surname: customer.surname,
            });
            this.loadingData.set(false);
          },
          error: () => {
            this.loadError.set('No se pudo cargar el cliente.');
            this.loadingData.set(false);
          },
        });
    } else {
      this.loadingData.set(false);
    }
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.customerForm().markAsTouched();

    if (this.customerForm().invalid()) {
      return;
    }

    const model = this.formModel();
    const payload = {
      dni: model.dni.replace(/\D/g, '').slice(0, 8),
      name: model.name.trim(),
      surname: model.surname.trim(),
    };

    const id = this.customerId();
    this.saving.set(true);
    this.loadError.set('');

    if (id !== null) {
      this.customerService
        .update(id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit('Cliente actualizado correctamente.');
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.loadError.set(
              typeof err === 'string' ? err : 'No se pudo actualizar el cliente.',
            );
          },
        });
    } else {
      this.customerService
        .create(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit('Cliente creado correctamente.');
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.loadError.set(
              typeof err === 'string' ? err : 'No se pudo crear el cliente.',
            );
          },
        });
    }
  }

  protected close(): void {
    this.closed.emit();
  }
}

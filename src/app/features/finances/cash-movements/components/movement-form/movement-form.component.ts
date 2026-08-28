import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  form,
  FormField,
  required,
} from '@angular/forms/signals';
import {
  FormControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { DateInputComponent } from '../../../../../shared/ui/date-input/date-input.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { MoneyInputComponent } from '../../../../../shared/ui/money-input/money-input.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import {
  SelectComponent,
  SelectOption,
} from '../../../../../shared/ui/select/select.component';
import { VoucherFilePickerComponent } from '../../../../expenses/admin-expenses/components/voucher-file-picker/voucher-file-picker.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import {
  formatDateTime,
  parseDatetimeLocalValue,
  toDatetimeLocalValue,
} from '../../data-access/cash-movement.adapter';
import { CashMovementService } from '../../data-access/cash-movement.service';
import {
  CashMovementItem,
  MovementFormModel,
  MovementType,
  PAYMENT_METHOD_OPTIONS,
  PaymentMethod,
  QUICK_EXPENSE_PRESETS,
} from '../../models/cash-movement.model';

const EMPTY_FORM: MovementFormModel = {
  description: '',
  amount: null,
  date: toDatetimeLocalValue(new Date()),
  paymentMethod: 'CASH',
};

@Component({
  selector: 'app-movement-form',
  imports: [
    FormField,
    ReactiveFormsModule,
    ButtonComponent,
    DateInputComponent,
    InputComponent,
    MoneyInputComponent,
    TableActionButtonComponent,
    SelectComponent,
    VoucherFilePickerComponent,
  ],
  templateUrl: './movement-form.component.html',
})
export class MovementFormComponent {
  private readonly cashMovementService = inject(CashMovementService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly movementType = input.required<MovementType>();
  readonly editingItem = input<CashMovementItem | null>(null);
  readonly viewDate = input.required<Date>();
  readonly isAdmin = input(false);

  readonly saved = output<void>();
  readonly closed = output<void>();

  protected readonly saving = signal(false);
  protected readonly formModel = signal<MovementFormModel>({ ...EMPTY_FORM });
  protected readonly voucherFiles = signal<File[]>([]);
  protected readonly dateControl = new FormControl('', { nonNullable: true });

  protected readonly isEditing = computed(() => this.editingItem() !== null);

  protected readonly title = computed(() => {
    const editing = this.isEditing();
    const type = this.movementType();

    if (editing) {
      return type === 'INCOME' ? 'Editar ingreso' : 'Editar gasto';
    }

    return type === 'INCOME' ? 'Registrar ingreso' : 'Registrar gasto';
  });

  protected readonly saveLabel = computed(() =>
    this.isEditing() ? 'Guardar cambios' : this.movementType() === 'INCOME' ? 'Guardar ingreso' : 'Confirmar gasto',
  );

  protected readonly paymentOptions: SelectOption<PaymentMethod>[] =
    PAYMENT_METHOD_OPTIONS;

  protected readonly quickExpenses = QUICK_EXPENSE_PRESETS;

  protected readonly movementForm = form(this.formModel, (schema) => {
    required(schema.description, { message: 'La descripción es obligatoria.' });
    required(schema.amount, { message: 'El monto es obligatorio.' });
  });

  protected readonly descriptionError = computed(() =>
    fieldErrorMessage(this.movementForm.description, {
      required: 'La descripción es obligatoria.',
    }),
  );

  protected readonly amountError = computed(() =>
    fieldErrorMessage(this.movementForm.amount, {
      required: 'El monto es obligatorio.',
    }),
  );

  protected readonly canSubmit = computed(() => {
    const model = this.formModel();
    return (
      !!model.description.trim() &&
      model.amount != null &&
      model.amount > 0 &&
      !this.saving()
    );
  });

  constructor() {
    effect(() => {
      const item = this.editingItem();
      const viewDate = this.viewDate();

      if (item) {
        const parsedDate = item.date
          ? new Date(item.date.replace(' ', 'T'))
          : this.defaultMovementDate(viewDate);

        this.formModel.set({
          description: item.description,
          amount: item.amount,
          date: toDatetimeLocalValue(parsedDate),
          paymentMethod: (item.payment_method ?? item.method ?? 'CASH') as PaymentMethod,
        });
        return;
      }

      this.formModel.set({
        ...EMPTY_FORM,
        date: toDatetimeLocalValue(this.defaultMovementDate(viewDate)),
      });
    });

    effect(() => {
      const date = this.formModel().date;
      if (this.dateControl.value !== date) {
        this.dateControl.setValue(date, { emitEvent: false });
      }
    });

    this.dateControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.onDateTimeChange(value));
  }

  protected onClose(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  protected applyQuickExpense(label: string, amount: number): void {
    this.formModel.update((current) => ({
      ...current,
      description: label,
      amount,
    }));
  }

  protected onDateTimeChange(value: string): void {
    this.formModel.update((current) => ({ ...current, date: value }));
  }

  protected onVoucherFilesChange(files: File[]): void {
    this.voucherFiles.set(files);
  }

  protected onSubmit(): void {
    if (!this.canSubmit()) {
      return;
    }

    const model = this.formModel();
    const amount = model.amount;
    if (amount == null || amount <= 0) {
      return;
    }

    const movementDate = this.isAdmin()
      ? parseDatetimeLocalValue(model.date)
      : this.defaultMovementDate(this.viewDate());

    const payload = {
      type: this.movementType(),
      category: 'STORE' as const,
      amount,
      description: model.description.trim(),
      date: formatDateTime(movementDate),
      payment_method: model.paymentMethod,
    };

    const viewDateStr = this.formatViewDateIso(this.viewDate());
    const editing = this.editingItem();

    this.saving.set(true);

    const files = this.voucherFiles();
    const request$ = editing
      ? this.cashMovementService.updateMovement(editing.id, payload, viewDateStr)
      : this.cashMovementService.registerMovement(payload, viewDateStr, files.length ? files : undefined);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.voucherFiles.set([]);
        this.toastService.show(
          'success',
          editing ? 'Movimiento actualizado.' : 'Movimiento registrado.',
        );
        this.saved.emit();
      },
      error: () => {
        this.saving.set(false);
        this.toastService.show('error', 'No se pudo guardar el movimiento.');
      },
    });
  }

  private defaultMovementDate(viewDate: Date): Date {
    const result = new Date(viewDate);
    const now = new Date();
    result.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    return result;
  }

  private formatViewDateIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

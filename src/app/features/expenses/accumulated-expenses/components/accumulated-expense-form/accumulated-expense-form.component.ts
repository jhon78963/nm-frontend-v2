import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  form,
  FormField,
  required,
} from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { DateInputComponent } from '../../../../../shared/ui/date-input/date-input.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { MoneyInputComponent } from '../../../../../shared/ui/money-input/money-input.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import {
  SelectComponent,
  SelectOption,
} from '../../../../../shared/ui/select/select.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import { toDatetimeLocalValue } from '../../../../finances/cash-movements/data-access/cash-movement.adapter';
import { VoucherFilePickerComponent } from '../../../admin-expenses/components/voucher-file-picker/voucher-file-picker.component';
import { AccumulatedExpenseService } from '../../data-access/accumulated-expense.service';
import {
  AccumulatedExpense,
  AccumulatedExpenseFormModel,
  AccumulatedPaymentMethod,
  ACCUMULATED_PAYMENT_METHOD_OPTIONS,
} from '../../models/accumulated-expense.model';

const EMPTY_FORM: AccumulatedExpenseFormModel = {
  description: '',
  amount: null,
  date: toDatetimeLocalValue(new Date()),
  paymentMethod: 'CASH',
};

@Component({
  selector: 'app-accumulated-expense-form',
  imports: [
    FormsModule,
    FormField,
    ButtonComponent,
    DateInputComponent,
    InputComponent,
    MoneyInputComponent,
    SelectComponent,
    TableActionButtonComponent,
    VoucherFilePickerComponent,
  ],
  templateUrl: './accumulated-expense-form.component.html',
})
export class AccumulatedExpenseFormComponent {
  private readonly accumulatedService = inject(AccumulatedExpenseService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly editingExpense = input<AccumulatedExpense | null>(null);
  readonly viewMonth = input.required<Date>();
  readonly canSave = input(true);

  readonly saved = output<void>();
  readonly closed = output<void>();

  private readonly voucherPicker = viewChild(VoucherFilePickerComponent);

  protected readonly saving = signal(false);
  protected readonly selectedFiles = signal<File[]>([]);
  protected readonly formModel = signal<AccumulatedExpenseFormModel>({ ...EMPTY_FORM });

  protected readonly isEditing = computed(() => this.editingExpense() !== null);

  protected readonly title = computed(() =>
    this.isEditing() ? 'Editar egreso' : 'Registrar egreso',
  );

  protected readonly saveLabel = computed(() =>
    this.isEditing() ? 'Guardar cambios' : 'Registrar egreso',
  );

  protected readonly paymentOptions: SelectOption<AccumulatedPaymentMethod>[] =
    ACCUMULATED_PAYMENT_METHOD_OPTIONS;

  protected readonly expenseForm = form(this.formModel, (schema) => {
    required(schema.description, { message: 'La descripción es obligatoria.' });
    required(schema.amount, { message: 'El monto es obligatorio.' });
  });

  protected readonly descriptionError = computed(() =>
    fieldErrorMessage(this.expenseForm.description, {
      required: 'La descripción es obligatoria.',
    }),
  );

  protected readonly amountError = computed(() =>
    fieldErrorMessage(this.expenseForm.amount, {
      required: 'El monto es obligatorio.',
    }),
  );

  protected readonly canSubmit = computed(() => {
    const model = this.formModel();
    return (
      !!model.description.trim() &&
      model.amount != null &&
      model.amount > 0 &&
      !this.saving() &&
      this.canSave()
    );
  });

  constructor() {
    effect(() => {
      const expense = this.editingExpense();

      if (expense) {
        const paymentDate = expense.date
          ? new Date(expense.date.replace(' ', 'T'))
          : new Date();

        this.formModel.set({
          description: expense.description,
          amount: expense.amount,
          date: toDatetimeLocalValue(paymentDate),
          paymentMethod: expense.method,
        });
        return;
      }

      this.formModel.set({ ...EMPTY_FORM, date: toDatetimeLocalValue(new Date()) });
      this.selectedFiles.set([]);
      this.voucherPicker()?.clear();
    });
  }

  protected onClose(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  protected onDateTimeChange(value: string): void {
    this.formModel.update((current) => ({ ...current, date: value }));
  }

  protected onFilesChange(files: File[]): void {
    this.selectedFiles.set(files);
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

    const payload = this.accumulatedService.buildPayloadFromForm({
      description: model.description,
      amount,
      date: model.date,
      paymentMethod: model.paymentMethod,
    });

    const year = this.viewMonth().getFullYear();
    const month = String(this.viewMonth().getMonth() + 1).padStart(2, '0');
    const viewMonthStr = `${year}-${month}`;
    const files = this.selectedFiles();
    const editing = this.editingExpense();

    this.saving.set(true);

    const request$ = editing
      ? this.accumulatedService.updateExpense(
          editing.id,
          payload,
          files.length > 0 ? files : null,
          viewMonthStr,
        )
      : this.accumulatedService.registerExpense(
          payload,
          files.length > 0 ? files : null,
          viewMonthStr,
        );

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.accumulatedService.refreshAccountAfterExpenses().subscribe();
        this.saving.set(false);
        this.toastService.show(
          'success',
          editing ? 'Egreso actualizado.' : 'Egreso registrado desde Cuenta Acumulada.',
        );
        this.saved.emit();
      },
      error: () => {
        this.saving.set(false);
        this.toastService.show('error', 'No se pudo guardar el egreso.');
      },
    });
  }
}

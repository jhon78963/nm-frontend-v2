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
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { MoneyInputComponent } from '../../../../../shared/ui/money-input/money-input.component';
import {
  SelectComponent,
  SelectOption,
} from '../../../../../shared/ui/select/select.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import {
  toDatetimeLocalValue,
} from '../../../../finances/cash-movements/data-access/cash-movement.adapter';
import { formatYearMonth } from '../../data-access/admin-expense.adapter';
import { AdminExpenseService } from '../../data-access/admin-expense.service';
import {
  AdminExpense,
  AdminExpenseCategory,
  AdminExpenseFormModel,
  AdminExpensePaymentMethod,
  ADMIN_EXPENSE_CATEGORY_OPTIONS,
  ADMIN_PAYMENT_METHOD_OPTIONS,
  PAYROLL_PERIOD_OPTIONS,
} from '../../models/admin-expense.model';
import { VoucherFilePickerComponent } from '../voucher-file-picker/voucher-file-picker.component';

function emptyForm(accountingMonth: string): AdminExpenseFormModel {
  return {
    category: 'ADMINISTRATIVE',
    description: '',
    amount: null,
    date: toDatetimeLocalValue(new Date()),
    accountingMonth,
    payrollPeriod: null,
    paymentMethod: 'CASH',
  };
}

@Component({
  selector: 'app-admin-expense-form',
  imports: [
    FormField,
    ButtonComponent,
    InputComponent,
    MoneyInputComponent,
    SelectComponent,
    VoucherFilePickerComponent,
  ],
  templateUrl: './admin-expense-form.component.html',
})
export class AdminExpenseFormComponent {
  private readonly adminExpenseService = inject(AdminExpenseService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly editingExpense = input<AdminExpense | null>(null);
  readonly viewMonth = input.required<Date>();
  readonly canSave = input(true);

  readonly saved = output<void>();
  readonly closed = output<void>();

  private readonly voucherPicker = viewChild(VoucherFilePickerComponent);

  protected readonly saving = signal(false);
  protected readonly showAccountingDetails = signal(false);
  protected readonly selectedFiles = signal<File[]>([]);

  protected readonly formModel = signal<AdminExpenseFormModel>(
    emptyForm(formatYearMonth(new Date())),
  );

  protected readonly isEditing = computed(() => this.editingExpense() !== null);

  protected readonly title = computed(() =>
    this.isEditing() ? 'Editar gasto' : 'Registrar gasto',
  );

  protected readonly saveLabel = computed(() =>
    this.isEditing() ? 'Guardar cambios' : 'Registrar gasto',
  );

  protected readonly categoryOptions: SelectOption<AdminExpenseCategory>[] =
    ADMIN_EXPENSE_CATEGORY_OPTIONS.map(({ label, value }) => ({ label, value }));

  protected readonly paymentOptions: SelectOption<AdminExpensePaymentMethod>[] =
    ADMIN_PAYMENT_METHOD_OPTIONS;

  protected readonly payrollOptions: SelectOption<'q1' | 'q2'>[] =
    PAYROLL_PERIOD_OPTIONS.filter(
      (option): option is { label: string; value: 'q1' | 'q2' } =>
        option.value !== null,
    );

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

  protected readonly selectedCategoryHint = computed(() => {
    const category = this.formModel().category;
    return (
      ADMIN_EXPENSE_CATEGORY_OPTIONS.find((option) => option.value === category)?.hint ?? ''
    );
  });

  constructor() {
    effect(() => {
      const expense = this.editingExpense();
      const viewMonth = this.viewMonth();
      const monthStr = formatYearMonth(viewMonth);

      if (expense) {
        const paymentDate = expense.date
          ? new Date(expense.date.replace(' ', 'T'))
          : new Date();

        this.formModel.set({
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          date: toDatetimeLocalValue(paymentDate),
          accountingMonth: expense.accountingMonth || monthStr,
          payrollPeriod: expense.payrollPeriod,
          paymentMethod: expense.method,
        });

        const hasCustomAccounting =
          expense.accountingMonth !== monthStr || expense.payrollPeriod !== null;
        this.showAccountingDetails.set(hasCustomAccounting);
        return;
      }

      this.formModel.set(emptyForm(monthStr));
      this.showAccountingDetails.set(false);
      this.selectedFiles.set([]);
      this.voucherPicker()?.clear();
    });
  }

  protected onClose(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  protected toggleAccountingDetails(): void {
    this.showAccountingDetails.update((open) => !open);
  }

  protected onDateTimeChange(value: string): void {
    this.formModel.update((current) => ({ ...current, date: value }));
  }

  protected onAccountingMonthChange(value: string): void {
    this.formModel.update((current) => ({ ...current, accountingMonth: value }));
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

    const payload = this.adminExpenseService.buildPayloadFromForm({
      category: model.category,
      description: model.description,
      amount,
      date: model.date,
      accountingMonth: model.accountingMonth,
      payrollPeriod: model.payrollPeriod,
      paymentMethod: model.paymentMethod,
    });

    const viewMonthStr = formatYearMonth(this.viewMonth());
    const files = this.selectedFiles();
    const editing = this.editingExpense();

    this.saving.set(true);

    const request$ = editing
      ? this.adminExpenseService.updateExpense(
          editing.id,
          payload,
          files.length > 0 ? files : null,
          viewMonthStr,
        )
      : this.adminExpenseService.registerExpense(
          payload,
          files.length > 0 ? files : null,
          viewMonthStr,
        );

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.toastService.show(
          'success',
          editing ? 'Gasto actualizado.' : 'Gasto registrado.',
        );
        this.saved.emit();
      },
      error: () => {
        this.saving.set(false);
        this.toastService.show('error', 'No se pudo guardar el gasto.');
      },
    });
  }
}

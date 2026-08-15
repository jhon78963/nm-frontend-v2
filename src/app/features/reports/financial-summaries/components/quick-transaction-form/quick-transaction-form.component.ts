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
import { NgClass } from '@angular/common';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { MoneyInputComponent } from '../../../../../shared/ui/money-input/money-input.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import { FinancialSummaryService } from '../../data-access/financial-summary.service';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  QuickCategory,
  QuickTransactionFormModel,
  QuickTransactionType,
} from '../../models/financial-summary.model';

const EMPTY_FORM: QuickTransactionFormModel = {
  amount: null,
  categoryId: null,
};

@Component({
  selector: 'app-quick-transaction-form',
  imports: [FormField, NgClass, ButtonComponent, TableActionButtonComponent, MoneyInputComponent],
  templateUrl: './quick-transaction-form.component.html',
})
export class QuickTransactionFormComponent {
  private readonly financialSummaryService = inject(FinancialSummaryService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly transactionType = input.required<QuickTransactionType>();

  readonly saved = output<void>();
  readonly closed = output<void>();

  protected readonly saving = signal(false);
  protected readonly formModel = signal<QuickTransactionFormModel>({ ...EMPTY_FORM });

  protected readonly title = computed(() =>
    this.transactionType() === 'INCOME'
      ? 'Registrar ingreso rápido'
      : 'Registrar gasto rápido',
  );

  protected readonly titleAccentClass = computed(() =>
    this.transactionType() === 'INCOME' ? 'text-emerald-600' : 'text-red-600',
  );

  protected readonly categories = computed(() =>
    this.transactionType() === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES,
  );

  protected readonly selectedCategory = computed(() => {
    const categoryId = this.formModel().categoryId;
    if (categoryId == null) {
      return null;
    }

    return this.categories().find((category) => category.id === categoryId) ?? null;
  });

  protected readonly transactionForm = form(this.formModel, (schema) => {
    required(schema.amount, { message: 'El monto es obligatorio.' });
    required(schema.categoryId, { message: 'Selecciona una categoría.' });
  });

  protected readonly amountError = computed(() =>
    fieldErrorMessage(this.transactionForm.amount, {
      required: 'El monto es obligatorio.',
    }),
  );

  protected readonly canSubmit = computed(() => {
    const model = this.formModel();
    return (
      model.amount != null &&
      model.amount > 0 &&
      model.categoryId != null &&
      !this.saving()
    );
  });

  constructor() {
    effect(() => {
      this.transactionType();
      this.formModel.set({ ...EMPTY_FORM });
    });
  }

  protected onClose(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  protected selectCategory(category: QuickCategory): void {
    this.formModel.update((current) => ({
      ...current,
      categoryId: category.id,
    }));
  }

  protected isCategorySelected(category: QuickCategory): boolean {
    return this.formModel().categoryId === category.id;
  }

  protected onSubmit(): void {
    if (!this.canSubmit()) {
      return;
    }

    const model = this.formModel();
    const amount = model.amount;
    const category = this.selectedCategory();

    if (amount == null || amount <= 0 || !category) {
      return;
    }

    this.saving.set(true);

    this.financialSummaryService
      .registerQuickMovement({
        type: this.transactionType(),
        amount,
        category,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toastService.show('success', 'Movimiento registrado correctamente.');
          this.saved.emit();
        },
        error: () => {
          this.saving.set(false);
          this.toastService.show('error', 'No se pudo registrar el movimiento.');
        },
      });
  }
}

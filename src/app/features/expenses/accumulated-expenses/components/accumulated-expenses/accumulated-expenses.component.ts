import { DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../auth/data-access/auth.service';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { VoucherPreviewDialogComponent } from '../../../admin-expenses/components/voucher-preview-dialog/voucher-preview-dialog.component';
import {
  formatMonthLabel,
  formatPaymentDate,
  formatYearMonth,
  paymentMethodBadgeClass,
} from '../../data-access/accumulated-expense.adapter';
import { AccumulatedExpenseService } from '../../data-access/accumulated-expense.service';
import { AccumulatedExpense } from '../../models/accumulated-expense.model';
import { AccountSetupPanelComponent } from '../account-setup-panel/account-setup-panel.component';
import { AccumulatedExpenseFormComponent } from '../accumulated-expense-form/accumulated-expense-form.component';
import { MonthEndTransferPanelComponent } from '../month-end-transfer-panel/month-end-transfer-panel.component';

@Component({
  selector: 'app-accumulated-expenses',
  imports: [
    DecimalPipe,
    AccountSetupPanelComponent,
    MonthEndTransferPanelComponent,
    AccumulatedExpenseFormComponent,
    VoucherPreviewDialogComponent,
  ],
  templateUrl: './accumulated-expenses.component.html',
})
export class AccumulatedExpensesComponent implements OnInit {
  private readonly accumulatedService = inject(AccumulatedExpenseService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly accountLoading = signal(false);
  protected readonly selectedMonth = signal(new Date());

  protected readonly formOpen = signal(false);
  protected readonly editingExpense = signal<AccumulatedExpense | null>(null);

  protected readonly previewOpen = signal(false);
  protected readonly previewPaths = signal<string[]>([]);

  protected readonly report = this.accumulatedService.report;
  protected readonly account = this.accumulatedService.account;

  protected readonly canStore = computed(() =>
    this.authService.hasPermission('cashflow.store'),
  );

  protected readonly canUpdate = computed(() =>
    this.authService.hasPermission('cashflow.update'),
  );

  protected readonly canManage = computed(
    () => this.canStore() || this.canUpdate(),
  );

  protected readonly canSaveForm = computed(() =>
    this.editingExpense() ? this.canUpdate() : this.canStore(),
  );

  protected readonly formattedMonth = computed(() =>
    formatMonthLabel(this.selectedMonth()),
  );

  protected readonly isCurrentMonth = computed(() => {
    const now = new Date();
    const selected = this.selectedMonth();
    return (
      selected.getFullYear() === now.getFullYear() &&
      selected.getMonth() === now.getMonth()
    );
  });

  protected readonly expenses = computed(() => this.report().expenses);
  protected readonly totalMonthly = computed(() => this.report().totalMonthlyAccumulated);
  protected readonly expenseCount = computed(() => this.expenses().length);
  protected readonly isAccountInitialized = computed(() => this.account().isInitialized);

  ngOnInit(): void {
    this.loadAccountSettings();
    this.loadExpenses();
  }

  protected loadAccountSettings(): void {
    this.accountLoading.set(true);

    this.accumulatedService
      .loadAccountSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.accountLoading.set(false),
        error: () => {
          this.accountLoading.set(false);
          this.toastService.show('error', 'No se pudo cargar la configuración de la cuenta.');
        },
      });
  }

  protected loadExpenses(): void {
    this.loading.set(true);
    const monthStr = formatYearMonth(this.selectedMonth());

    this.accumulatedService
      .loadMonthlyReport(monthStr)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.loadAccountSettings();
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar los egresos del mes.');
        },
      });
  }

  protected changeMonth(delta: number): void {
    this.selectedMonth.update((date) => {
      const next = new Date(date);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
    this.loadExpenses();
  }

  protected goToCurrentMonth(): void {
    this.selectedMonth.set(new Date());
    this.loadExpenses();
  }

  protected openCreateForm(): void {
    this.editingExpense.set(null);
    this.formOpen.set(true);
  }

  protected openEditForm(expense: AccumulatedExpense): void {
    this.editingExpense.set(expense);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingExpense.set(null);
  }

  protected onFormSaved(): void {
    this.closeForm();
    this.loadExpenses();
  }

  protected onAccountSettingsChanged(): void {
    this.loadAccountSettings();
  }

  protected onTransferCompleted(): void {
    this.loadAccountSettings();
  }

  protected openVoucherPreview(expense: AccumulatedExpense): void {
    if (expense.voucherPaths.length === 0) {
      return;
    }
    this.previewPaths.set(expense.voucherPaths);
    this.previewOpen.set(true);
  }

  protected closeVoucherPreview(): void {
    this.previewOpen.set(false);
    this.previewPaths.set([]);
  }

  protected formatDate(value: string): string {
    return formatPaymentDate(value);
  }

  protected methodBadgeClass(method: string): string {
    return paymentMethodBadgeClass(method);
  }
}

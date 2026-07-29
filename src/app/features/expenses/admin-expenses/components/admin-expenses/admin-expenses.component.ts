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
import {
  formatMonthLabel,
  formatPaymentDate,
  formatYearMonth,
  getCategoryLabel,
  paymentMethodBadgeClass,
} from '../../data-access/admin-expense.adapter';
import { AdminExpenseService } from '../../data-access/admin-expense.service';
import { AdminExpense } from '../../models/admin-expense.model';
import { AdminExpenseFormComponent } from '../admin-expense-form/admin-expense-form.component';
import { VoucherPreviewDialogComponent } from '../voucher-preview-dialog/voucher-preview-dialog.component';

@Component({
  selector: 'app-admin-expenses',
  imports: [
    DecimalPipe,
    AdminExpenseFormComponent,
    VoucherPreviewDialogComponent,
  ],
  templateUrl: './admin-expenses.component.html',
})
export class AdminExpensesComponent implements OnInit {
  private readonly adminExpenseService = inject(AdminExpenseService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly selectedMonth = signal(new Date());

  protected readonly formOpen = signal(false);
  protected readonly editingExpense = signal<AdminExpense | null>(null);

  protected readonly previewOpen = signal(false);
  protected readonly previewPaths = signal<string[]>([]);

  protected readonly report = this.adminExpenseService.report;

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

  protected readonly totalMonthly = computed(() => this.report().totalMonthlyAdmin);

  protected readonly expenseCount = computed(() => this.expenses().length);

  ngOnInit(): void {
    this.loadExpenses();
  }

  protected loadExpenses(): void {
    this.loading.set(true);
    const monthStr = formatYearMonth(this.selectedMonth());

    this.adminExpenseService
      .loadMonthlyReport(monthStr)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loading.set(false),
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar los gastos del mes.');
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

  protected openEditForm(expense: AdminExpense): void {
    this.editingExpense.set(expense);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingExpense.set(null);
  }

  protected onFormSaved(): void {
    this.closeForm();
  }

  protected openVoucherPreview(expense: AdminExpense): void {
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

  protected categoryLabel(category: AdminExpense['category']): string {
    return getCategoryLabel(category);
  }

  protected methodBadgeClass(method: string): string {
    return paymentMethodBadgeClass(method);
  }
}

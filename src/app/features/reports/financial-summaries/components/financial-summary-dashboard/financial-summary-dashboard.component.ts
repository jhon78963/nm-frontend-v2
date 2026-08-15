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
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../auth/data-access/auth.service';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import {
  TableDataColumn,
  TableDataComponent,
  TableDataEmptyState,
  DtCellDirective,
  DtExpandCellComponent,
  DtRowDirective,
} from '../../../../../shared/ui/table-data/table-data.component';
import {
  categoryBadgeClass,
  formatGrowthLabel,
  formatPaymentMethod,
  growthBadgeClass,
} from '../../data-access/financial-summary.adapter';
import { FinancialSummaryService } from '../../data-access/financial-summary.service';
import { QuickTransactionType, RecentTransaction } from '../../models/financial-summary.model';
import { QuickTransactionFormComponent } from '../quick-transaction-form/quick-transaction-form.component';

@Component({
  selector: 'app-financial-summary-dashboard',
  imports: [DecimalPipe, RouterLink, QuickTransactionFormComponent, TableDataComponent, DtCellDirective, DtExpandCellComponent, DtRowDirective],
  providers: [FinancialSummaryService],
  templateUrl: './financial-summary-dashboard.component.html',
})
export class FinancialSummaryDashboardComponent implements OnInit {
  private readonly financialSummaryService = inject(FinancialSummaryService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly formOpen = signal(false);
  protected readonly formType = signal<QuickTransactionType>('INCOME');

  protected readonly summary = this.financialSummaryService.summary;

  protected readonly cards = computed(() => this.summary().cards);
  protected readonly transactions = computed(() => this.summary().recentTransactions);

  protected readonly canManageCashflow = computed(() =>
    this.authService.hasPermission('cashflow.store'),
  );

  protected readonly growthLabel = computed(() =>
    formatGrowthLabel(this.cards().salesIncome.growth),
  );

  protected readonly growthClass = computed(() =>
    growthBadgeClass(this.cards().salesIncome.growth),
  );

  protected readonly tableColumns: TableDataColumn<RecentTransaction>[] = [
    { key: 'concept', label: 'Concepto', mobilePrimary: true },
    { key: 'category', label: 'Categoría' },
    { key: 'date', label: 'Fecha', className: 'hidden sm:table-cell' },
    { key: 'method', label: 'Método', className: 'hidden md:table-cell' },
    { key: 'amount', label: 'Monto', align: 'right' },
  ];

  protected readonly emptyState = computed<TableDataEmptyState>(() => ({
    title: 'Sin movimientos recientes',
    description: 'No hay ventas POS ni movimientos de caja registrados.',
    actionLabel: this.canManageCashflow() ? 'Registrar primer ingreso' : undefined,
  }));

  ngOnInit(): void {
    this.loadSummary();
  }

  protected loadSummary(): void {
    this.loading.set(true);

    this.financialSummaryService
      .loadSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loading.set(false),
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar el resumen financiero.');
        },
      });
  }

  protected openForm(type: QuickTransactionType): void {
    this.formType.set(type);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
  }

  protected onFormSaved(): void {
    this.closeForm();
  }

  protected categoryClass(category: string): string {
    return categoryBadgeClass(category);
  }

  protected paymentLabel(method: string): string {
    return formatPaymentMethod(method);
  }

  protected isCashMethod(method: string): boolean {
    return method.trim().toUpperCase() === 'CASH';
  }
}

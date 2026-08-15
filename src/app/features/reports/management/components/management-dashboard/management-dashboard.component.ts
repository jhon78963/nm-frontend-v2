import { DecimalPipe, NgClass } from '@angular/common';
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
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import {
  TableDataColumn,
  TableDataComponent,
} from '../../../../../shared/ui/table-data/table-data.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import {
  buildLineChartGeometry,
  formatMonthLabel,
  monthDateRange,
  pointsToPolyline,
} from '../../data-access/report-dashboard.adapter';
import { ReportDashboardService } from '../../data-access/report-dashboard.service';
import { DashboardTab } from '../../models/report-dashboard.model';

interface MonthlyHistoryRow {
  sortMonth: string;
  dateLabel: string;
  cash: number;
  digital: number;
  monthlyTotal: number;
}

interface AccumulatedHistoryRow extends MonthlyHistoryRow {
  cashBalance: number;
  digitalBalance: number;
  totalBalance: number;
}

@Component({
  selector: 'app-management-dashboard',
  imports: [
    DecimalPipe,
    NgClass,
    RouterLink,
    ButtonComponent,
    TableActionButtonComponent,
    TableDataComponent,
  ],
  providers: [ReportDashboardService],
  templateUrl: './management-dashboard.component.html',
})
export class ManagementDashboardComponent implements OnInit {
  private readonly reportDashboardService = inject(ReportDashboardService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly selectedMonth = signal(new Date());
  protected readonly activeTab = signal<DashboardTab>('summary');

  protected readonly salesHistoryColumns: TableDataColumn<MonthlyHistoryRow>[] = [
    { key: 'dateLabel', label: 'Fecha' },
    { key: 'cash', label: 'Efectivo', align: 'right' },
    { key: 'digital', label: 'Bancos / Digital', align: 'right' },
    { key: 'monthlyTotal', label: 'Total mensual', align: 'right', className: 'bg-indigo-50/50 font-bold' },
  ];

  protected readonly accumulatedColumns: TableDataColumn<AccumulatedHistoryRow>[] = [
    { key: 'dateLabel', label: 'Fecha' },
    { key: 'cash', label: 'Efectivo', align: 'right' },
    { key: 'digital', label: 'Bancos / Digital', align: 'right' },
    { key: 'monthlyTotal', label: 'Total mensual', align: 'right', className: 'bg-orange-50/50 font-bold' },
    { key: 'cashBalance', label: 'Saldo efectivo', align: 'right' },
    { key: 'digitalBalance', label: 'Saldo digital', align: 'right' },
    { key: 'totalBalance', label: 'Saldo total', align: 'right', className: 'bg-orange-100/60 font-bold' },
  ];

  protected readonly salesHistoryEmptyState = {
    title: 'Sin registros históricos',
    description: 'No hay registros históricos disponibles.',
  };

  protected readonly accumulatedEmptyState = {
    title: 'Sin histórico acumulado',
    description: 'Configura los saldos iniciales en Gastos → Egresos Cuenta Acumulada para ver el histórico.',
  };

  protected readonly dashboard = this.reportDashboardService.dashboard;

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

  protected readonly totals = computed(() => this.dashboard().totals);
  protected readonly financials = computed(() => this.dashboard().financials);
  protected readonly topProducts = computed(() => this.dashboard().topProducts);
  protected readonly leastProducts = computed(() => this.dashboard().leastProducts);
  protected readonly allTimeMonthlyReport = computed(
    () => this.dashboard().allTimeMonthlyReport,
  );
  protected readonly accumulatedRows = computed(
    () => this.dashboard().accumulatedAccountMonthlyReport,
  );
  protected readonly accumulatedSummary = computed(
    () => this.dashboard().accumulatedAccountSummary,
  );

  protected readonly totalHistoricalCash = computed(() =>
    this.allTimeMonthlyReport().reduce((acc, row) => acc + row.cash, 0),
  );

  protected readonly totalHistoricalDigital = computed(() =>
    this.allTimeMonthlyReport().reduce((acc, row) => acc + row.digital, 0),
  );

  protected readonly totalHistoricalMonthly = computed(() =>
    this.allTimeMonthlyReport().reduce((acc, row) => acc + row.monthlyTotal, 0),
  );

  protected readonly accumulatedTotalCash = computed(() =>
    this.accumulatedRows().reduce((acc, row) => acc + row.cash, 0),
  );

  protected readonly accumulatedTotalDigital = computed(() =>
    this.accumulatedRows().reduce((acc, row) => acc + row.digital, 0),
  );

  protected readonly accumulatedTotalMonthly = computed(() =>
    this.accumulatedRows().reduce((acc, row) => acc + row.monthlyTotal, 0),
  );

  protected readonly chartGeometry = computed(() =>
    buildLineChartGeometry(this.financials().chartData),
  );

  protected readonly salesPolyline = computed(() =>
    pointsToPolyline(this.chartGeometry().salesPoints),
  );

  protected readonly expensesPolyline = computed(() =>
    pointsToPolyline(this.chartGeometry().expensePoints),
  );

  protected readonly netUtilityClass = computed(() =>
    this.financials().netUtility >= 0 ? 'text-emerald-600' : 'text-red-600',
  );

  ngOnInit(): void {
    this.loadDashboard();
  }

  protected loadDashboard(): void {
    this.loading.set(true);
    const { start, end } = monthDateRange(this.selectedMonth());

    this.reportDashboardService
      .loadDashboard(start, end)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loading.set(false),
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar el reporte gerencial.');
        },
      });
  }

  protected changeMonth(delta: number): void {
    this.selectedMonth.update((date) => {
      const next = new Date(date);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
    this.loadDashboard();
  }

  protected goToCurrentMonth(): void {
    this.selectedMonth.set(new Date());
    this.loadDashboard();
  }

  protected selectTab(tab: DashboardTab): void {
    this.activeTab.set(tab);
  }

  protected isTabActive(tab: DashboardTab): boolean {
    return this.activeTab() === tab;
  }
}

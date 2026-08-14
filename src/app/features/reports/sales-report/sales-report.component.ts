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
import { AuthService } from '../../auth/data-access/auth.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { TabPanelDirective } from '../../../shared/ui/tab-view/tab-panel.directive';
import { TabViewComponent } from '../../../shared/ui/tab-view/tab-view.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import {
  currentMonthValue,
  todayIsoDate,
} from '../data-access/sales-report.adapter';
import { SalesReportService } from '../data-access/sales-report.service';
import {
  DailySalesReport,
  MonthlySalesReport,
} from '../models/sales-report.model';
import { SalesDailyTabComponent } from './components/sales-daily-tab/sales-daily-tab.component';
import { SalesMonthlyTabComponent } from './components/sales-monthly-tab/sales-monthly-tab.component';

@Component({
  selector: 'app-sales-report',
  imports: [
    RouterLink,
    ButtonComponent,
    TabViewComponent,
    TabPanelDirective,
    SalesDailyTabComponent,
    SalesMonthlyTabComponent,
  ],
  providers: [SalesReportService],
  templateUrl: './sales-report.component.html',
})
export class SalesReportComponent implements OnInit {
  private readonly salesReportService = inject(SalesReportService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeTab = signal<'daily' | 'monthly'>('daily');
  protected readonly selectedDate = signal(todayIsoDate());
  protected readonly selectedMonth = signal(currentMonthValue());
  protected readonly selectedWarehouseId = signal<number | null>(null);
  protected readonly dailyReport = signal<DailySalesReport | null>(null);
  protected readonly monthlyReport = signal<MonthlySalesReport | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isExporting = signal(false);

  protected readonly reportTabs = [
    { id: 'daily', label: 'Diario' },
    { id: 'monthly', label: 'Mensual' },
  ];

  protected readonly canSelectWarehouse = computed(() =>
    (this.authService.currentUser()?.roles ?? []).includes('Super Admin'),
  );

  protected readonly selectedMonthParts = computed(() => {
    const [year, month] = this.selectedMonth().split('-');
    return {
      year: Number(year),
      month: Number(month),
    };
  });

  ngOnInit(): void {
    this.loadActiveReport();
  }

  protected onTabChange(tabId: string): void {
    if (tabId === 'daily' || tabId === 'monthly') {
      this.activeTab.set(tabId);
      this.loadActiveReport();
    }
  }

  protected onDailyDateChange(date: string): void {
    this.selectedDate.set(date);
    this.loadDailyReport();
  }

  protected onMonthlyChange(month: string): void {
    this.selectedMonth.set(month);
    this.loadMonthlyReport();
  }

  protected exportPdf(): void {
    if (this.isExporting()) {
      return;
    }

    this.isExporting.set(true);
    this.toastService.show('info', 'Generando PDF...');

    const warehouseId = this.selectedWarehouseId() ?? undefined;
    const request$ =
      this.activeTab() === 'daily'
        ? this.salesReportService.exportDailyPdf({
            date: this.selectedDate(),
            warehouseId,
          })
        : this.salesReportService.exportMonthlyPdf({
            ...this.selectedMonthParts(),
            warehouseId,
          });

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isExporting.set(false);
        this.toastService.show('success', 'PDF listo');
      },
      error: (err: unknown) => {
        this.isExporting.set(false);
        this.toastService.show(
          'error',
          typeof err === 'string'
            ? err
            : 'No se pudo exportar el PDF. El servidor aún no expone este endpoint.',
        );
      },
    });
  }

  private loadActiveReport(): void {
    if (this.activeTab() === 'daily') {
      this.loadDailyReport();
      return;
    }

    this.loadMonthlyReport();
  }

  private loadDailyReport(): void {
    this.isLoading.set(true);

    this.salesReportService
      .getDailyReport({
        date: this.selectedDate(),
        warehouseId: this.selectedWarehouseId() ?? undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          this.dailyReport.set(report);
          this.isLoading.set(false);
        },
        error: (err: unknown) => {
          this.dailyReport.set(null);
          this.isLoading.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo cargar el reporte diario.',
          );
        },
      });
  }

  private loadMonthlyReport(): void {
    this.isLoading.set(true);
    const parts = this.selectedMonthParts();

    this.salesReportService
      .getMonthlyReport({
        month: parts.month,
        year: parts.year,
        warehouseId: this.selectedWarehouseId() ?? undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          this.monthlyReport.set(report);
          this.isLoading.set(false);
        },
        error: (err: unknown) => {
          this.monthlyReport.set(null);
          this.isLoading.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo cargar el reporte mensual.',
          );
        },
      });
  }
}

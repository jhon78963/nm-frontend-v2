import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { downloadFile } from '../../../core/utils/file-download.util';
import { ExportButtonComponent } from '../../../shared/ui/export-button/export-button.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { DateInputComponent } from '../../../shared/ui/date-input/date-input.component';
import { TableActionButtonComponent } from '../../../shared/ui/table-action-button/table-action-button.component';
import {
  TableDataColumn,
  TableDataComponent,
} from '../../../shared/ui/table-data/table-data.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import {
  firstDayOfMonthIsoDate,
  mapDailyTransactionsToProducts,
  todayIsoDate,
} from '../data-access/sales-report.adapter';
import { SalesReportService } from '../data-access/sales-report.service';
import { PeriodSalesReport } from '../models/sales-report.model';

interface PeriodSalesRow {
  dateIso: string;
  date: string;
  dayOfWeek: string;
  quantity: number;
  total: number;
  cash: number;
  yape: number;
  card: number;
  products: PeriodSalesReport['rows'][number]['products'];
}

interface PeriodProductRow {
  name: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

@Component({
  selector: 'app-sales-period-report',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    DateInputComponent,
    ExportButtonComponent,
    TableActionButtonComponent,
    TableDataComponent,
  ],
  providers: [SalesReportService],
  templateUrl: './sales-period-report.component.html',
})
export class SalesPeriodReportComponent implements OnInit {
  private readonly salesReportService = inject(SalesReportService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly dateFilterForm = new FormGroup({
    from: new FormControl(firstDayOfMonthIsoDate(), { nonNullable: true }),
    to: new FormControl(todayIsoDate(), { nonNullable: true }),
  });

  protected readonly dateRange = signal({
    from: firstDayOfMonthIsoDate(),
    to: todayIsoDate(),
  });
  protected readonly selectedWarehouseId = signal<string | null>(null);
  protected readonly report = signal<PeriodSalesReport | null>(null);
  protected readonly expandedRows = signal<Set<string>>(new Set());
  protected readonly loadingRows = signal<Set<string>>(new Set());
  protected readonly isLoading = signal(false);
  protected readonly isExporting = signal(false);

  protected readonly periodColumns: TableDataColumn<PeriodSalesRow>[] = [
    { key: 'expand', label: '', width: '3rem' },
    { key: 'date', label: 'Fecha' },
    { key: 'quantity', label: 'Cantidad', align: 'right' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'cash', label: 'Efectivo', align: 'right' },
    { key: 'yape', label: 'Yape', align: 'right' },
    { key: 'card', label: 'Tarjeta', align: 'right' },
  ];

  protected readonly productDetailColumns: TableDataColumn<PeriodProductRow>[] = [
    { key: 'name', label: 'Producto' },
    { key: 'size', label: 'Talla' },
    { key: 'color', label: 'Color' },
    { key: 'quantity', label: 'Cantidad', align: 'right' },
    { key: 'unitPrice', label: 'P. Unitario', align: 'right' },
    { key: 'subtotal', label: 'Subtotal', align: 'right' },
  ];

  protected readonly summaryCards = computed(() => {
    const data = this.report();
    if (!data) {
      return null;
    }

    return [
      { label: 'Total del periodo', value: data.totals.total, tone: 'blue' },
      { label: 'Efectivo', value: data.totals.cash, tone: 'green' },
      { label: 'Yape / Plin', value: data.totals.yape, tone: 'purple' },
      { label: 'Tarjeta', value: data.totals.card, tone: 'orange' },
    ] as const;
  });

  protected readonly moneyFormatter = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  ngOnInit(): void {
    this.dateFilterForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ from, to }) => {
        if (from && to) {
          this.dateRange.set({ from, to });
        }
      });

    this.loadReport();
  }

  protected formatMoney(value: number): string {
    return `S/ ${this.moneyFormatter.format(value)}`;
  }

  protected setCurrentMonthRange(): void {
    this.dateFilterForm.setValue({
      from: firstDayOfMonthIsoDate(),
      to: todayIsoDate(),
    });
    this.loadReport();
  }

  protected loadReport(): void {
    const { from, to } = this.dateRange();

    if (from > to) {
      this.toastService.show('info', 'La fecha inicial no puede ser mayor que la final.');
      return;
    }

    this.isLoading.set(true);
    this.expandedRows.set(new Set());

    this.salesReportService
      .getPeriodReport({
        from,
        to,
        warehouseId: this.selectedWarehouseId() ?? undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.report.set(result);
          this.isLoading.set(false);
        },
        error: (err: unknown) => {
          this.report.set(null);
          this.isLoading.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo cargar el reporte del periodo.',
          );
        },
      });
  }

  protected exportPdf(): void {
    if (this.isExporting()) {
      return;
    }

    const { from, to } = this.dateRange();
    this.isExporting.set(true);
    const loadingToastId = this.toastService.loading('Generando archivo...');

    this.salesReportService
      .exportPeriodPdf({
        from,
        to,
        warehouseId: this.selectedWarehouseId() ?? undefined,
      })
      .pipe(
        finalize(() => this.isExporting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob) => {
          this.toastService.dismiss(loadingToastId);
          downloadFile(blob, {
            filename: 'reporte-ventas-periodo',
            extension: 'pdf',
            appendDate: true,
          });
          this.toastService.show('success', 'Archivo descargado', 3_000);
        },
        error: () => {
          this.toastService.dismiss(loadingToastId);
          this.toastService.show(
            'error',
            'Error al generar el archivo. Intenta nuevamente.',
            5_000,
          );
        },
      });
  }

  protected isExpanded(dateIso: string): boolean {
    return this.expandedRows().has(dateIso);
  }

  protected isRowLoading(dateIso: string): boolean {
    return this.loadingRows().has(dateIso);
  }

  protected toggleRow(dateIso: string): void {
    const expanded = new Set(this.expandedRows());

    if (expanded.has(dateIso)) {
      expanded.delete(dateIso);
      this.expandedRows.set(expanded);
      return;
    }

    expanded.add(dateIso);
    this.expandedRows.set(expanded);

    const row = this.report()?.rows.find((item) => item.dateIso === dateIso);
    if (!row || row.products.length > 0) {
      return;
    }

    this.loadRowProducts(dateIso);
  }

  private loadRowProducts(dateIso: string): void {
    this.loadingRows.update((rows) => new Set(rows).add(dateIso));

    this.salesReportService
      .getDailyReport({ date: dateIso })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (daily) => {
          this.report.update((current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              rows: current.rows.map((row) =>
                row.dateIso === dateIso
                  ? {
                      ...row,
                      products: mapDailyTransactionsToProducts(daily.transactions),
                    }
                  : row,
              ),
            };
          });

          this.loadingRows.update((rows) => {
            const next = new Set(rows);
            next.delete(dateIso);
            return next;
          });
        },
        error: () => {
          this.loadingRows.update((rows) => {
            const next = new Set(rows);
            next.delete(dateIso);
            return next;
          });
          this.toastService.show('error', 'No se pudo cargar el detalle del día.');
        },
      });
  }
}

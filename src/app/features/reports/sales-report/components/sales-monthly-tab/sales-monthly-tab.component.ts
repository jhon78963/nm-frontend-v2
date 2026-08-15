import { Component, computed, DestroyRef, effect, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DateInputComponent } from '../../../../../shared/ui/date-input/date-input.component';
import {
  TableDataColumn,
  TableDataComponent,
} from '../../../../../shared/ui/table-data/table-data.component';
import { MonthlySalesReport } from '../../../models/sales-report.model';

interface MonthlySalesRow {
  day: number;
  date: string;
  dayOfWeek: string;
  quantity: number;
  total: number;
  cash: number;
  yape: number;
  card: number;
}

@Component({
  selector: 'app-sales-monthly-tab',
  imports: [ReactiveFormsModule, DateInputComponent, TableDataComponent],
  templateUrl: './sales-monthly-tab.component.html',
})
export class SalesMonthlyTabComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly report = input<MonthlySalesReport | null>(null);
  readonly loading = input(false);
  readonly selectedMonth = input.required<string>();

  readonly selectedMonthChange = output<string>();

  protected readonly monthControl = new FormControl('', { nonNullable: true });

  private readonly syncMonthControl = effect(() => {
    const month = this.selectedMonth();
    if (this.monthControl.value !== month) {
      this.monthControl.setValue(month, { emitEvent: false });
    }
  });

  constructor() {
    this.monthControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (value) {
          this.selectedMonthChange.emit(value);
        }
      });
  }

  protected readonly tableColumns: TableDataColumn<MonthlySalesRow>[] = [
    { key: 'day', label: 'Día' },
    { key: 'date', label: 'Fecha' },
    { key: 'quantity', label: 'Cantidad', align: 'right' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'cash', label: 'Efectivo', align: 'right' },
    { key: 'yape', label: 'Yape', align: 'right' },
    { key: 'card', label: 'Tarjeta', align: 'right' },
  ];

  protected readonly moneyFormatter = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  protected readonly maxChartAmount = computed(() => {
    const amounts = this.report()?.chartAmounts ?? [];
    return amounts.length > 0 ? Math.max(...amounts) : 0;
  });

  protected formatMoney(value: number): string {
    return `S/ ${this.moneyFormatter.format(value)}`;
  }

  protected barHeight(amount: number): string {
    const max = this.maxChartAmount();
    if (max <= 0) {
      return '0%';
    }

    return `${Math.max(4, (amount / max) * 100)}%`;
  }

}

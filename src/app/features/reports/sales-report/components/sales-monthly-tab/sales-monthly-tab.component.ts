import { Component, computed, input, output } from '@angular/core';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../../../shared/ui/data-table/data-table.component';
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
  imports: [DataTableComponent],
  templateUrl: './sales-monthly-tab.component.html',
})
export class SalesMonthlyTabComponent {
  readonly report = input<MonthlySalesReport | null>(null);
  readonly loading = input(false);
  readonly selectedMonth = input.required<string>();

  readonly selectedMonthChange = output<string>();

  protected readonly tableColumns: DataTableColumn<MonthlySalesRow>[] = [
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

  protected onMonthChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.selectedMonthChange.emit(value);
    }
  }
}

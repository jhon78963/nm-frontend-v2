import { Component, computed, input, output } from '@angular/core';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../../../shared/ui/data-table/data-table.component';
import { DailySalesReport, SalesDailyTransaction } from '../../../models/sales-report.model';

interface HourlySalesRow {
  hour: string;
  quantity: number;
  total: number;
  cash: number;
  yape: number;
  card: number;
}


@Component({
  selector: 'app-sales-daily-tab',
  imports: [DataTableComponent],
  templateUrl: './sales-daily-tab.component.html',
})
export class SalesDailyTabComponent {
  readonly report = input<DailySalesReport | null>(null);
  readonly loading = input(false);
  readonly selectedDate = input.required<string>();

  readonly selectedDateChange = output<string>();

  protected readonly hourlyColumns: DataTableColumn<HourlySalesRow>[] = [
    { key: 'hour', label: 'Hora' },
    { key: 'quantity', label: 'Cantidad', align: 'right' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'cash', label: 'Efectivo', align: 'right' },
    { key: 'yape', label: 'Yape', align: 'right' },
    { key: 'card', label: 'Tarjeta', align: 'right' },
  ];

  protected readonly transactionColumns: DataTableColumn<SalesDailyTransaction>[] = [
    { key: 'time', label: 'Hora' },
    { key: 'source', label: 'Tipo' },
    { key: 'detail', label: 'Detalle' },
    { key: 'customer', label: 'Cliente' },
    { key: 'totalAmount', label: 'Total', align: 'right' },
  ];

  protected readonly hourlyRows = computed(() => {
    const rows = this.report()?.rows ?? [];
    return rows.filter((row) => row.quantity > 0 || row.total > 0);
  });

  protected readonly moneyFormatter = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  protected formatMoney(value: number): string {
    return `S/ ${this.moneyFormatter.format(value)}`;
  }

  protected onDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.selectedDateChange.emit(value);
    }
  }
}

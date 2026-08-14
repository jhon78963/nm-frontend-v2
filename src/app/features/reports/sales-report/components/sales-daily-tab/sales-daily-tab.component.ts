import { Component, input, output } from '@angular/core';
import { DailySalesReport } from '../../../models/sales-report.model';

@Component({
  selector: 'app-sales-daily-tab',
  templateUrl: './sales-daily-tab.component.html',
})
export class SalesDailyTabComponent {
  readonly report = input<DailySalesReport | null>(null);
  readonly loading = input(false);
  readonly selectedDate = input.required<string>();

  readonly selectedDateChange = output<string>();

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

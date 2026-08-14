import { Component, computed, input, output } from '@angular/core';
import { MonthlySalesReport } from '../../../models/sales-report.model';

@Component({
  selector: 'app-sales-monthly-tab',
  templateUrl: './sales-monthly-tab.component.html',
})
export class SalesMonthlyTabComponent {
  readonly report = input<MonthlySalesReport | null>(null);
  readonly loading = input(false);
  readonly selectedMonth = input.required<string>();

  readonly selectedMonthChange = output<string>();

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

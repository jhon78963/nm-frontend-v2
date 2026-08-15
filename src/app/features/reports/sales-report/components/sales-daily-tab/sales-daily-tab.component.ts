import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DateInputComponent } from '../../../../../shared/ui/date-input/date-input.component';
import {
  TableDataColumn,
  TableDataComponent,
} from '../../../../../shared/ui/table-data/table-data.component';
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
  imports: [ReactiveFormsModule, DateInputComponent, TableDataComponent],
  templateUrl: './sales-daily-tab.component.html',
})
export class SalesDailyTabComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly report = input<DailySalesReport | null>(null);
  readonly loading = input(false);
  readonly selectedDate = input.required<string>();

  readonly selectedDateChange = output<string>();

  protected readonly dateControl = new FormControl('', { nonNullable: true });

  protected readonly hourlyColumns: TableDataColumn<HourlySalesRow>[] = [
    { key: 'hour', label: 'Hora' },
    { key: 'quantity', label: 'Cantidad', align: 'right' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'cash', label: 'Efectivo', align: 'right' },
    { key: 'yape', label: 'Yape', align: 'right' },
    { key: 'card', label: 'Tarjeta', align: 'right' },
  ];

  protected readonly transactionColumns: TableDataColumn<SalesDailyTransaction>[] = [
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

  constructor() {
    effect(() => {
      const date = this.selectedDate();
      if (this.dateControl.value !== date) {
        this.dateControl.setValue(date, { emitEvent: false });
      }
    });

    this.dateControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (value) {
          this.selectedDateChange.emit(value);
        }
      });
  }

  protected formatMoney(value: number): string {
    return `S/ ${this.moneyFormatter.format(value)}`;
  }
}

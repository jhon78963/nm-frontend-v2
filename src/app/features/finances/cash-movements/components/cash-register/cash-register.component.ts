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
import { AuthService } from '../../../../auth/data-access/auth.service';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import {
  TableDataColumn,
  TableDataComponent,
} from '../../../../../shared/ui/table-data/table-data.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import {
  applyPaymentFiltersToSales,
  formatViewDate,
  matchesPaymentFilter,
} from '../../data-access/cash-movement.adapter';
import { CashMovementService } from '../../data-access/cash-movement.service';
import { MovementFormComponent } from '../movement-form/movement-form.component';
import {
  CashMovementItem,
  DEFAULT_PAYMENT_FILTERS,
  MovementType,
  PaymentMethodFilter,
} from '../../models/cash-movement.model';

type ListSection = 'sales' | 'incomes' | 'expenses';

type CashRegisterDisplayRow =
  | { kind: 'section'; label: string; rowClass: string; labelClass: string }
  | {
      kind: 'movement';
      item: CashMovementItem;
      movementKind: ListSection;
    }
  | { kind: 'empty'; message: string };

@Component({
  selector: 'app-cash-register',
  imports: [
    DecimalPipe,
    NgClass,
    ConfirmDialogComponent,
    ButtonComponent,
    TableActionButtonComponent,
    MovementFormComponent,
    TableDataComponent,
  ],
  templateUrl: './cash-register.component.html',
})
export class CashRegisterComponent implements OnInit {
  private readonly cashMovementService = inject(CashMovementService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly currentDate = signal(new Date());
  protected readonly paymentFilters = signal<PaymentMethodFilter>({
    ...DEFAULT_PAYMENT_FILTERS,
  });

  protected readonly formOpen = signal(false);
  protected readonly formType = signal<MovementType>('INCOME');
  protected readonly editingItem = signal<CashMovementItem | null>(null);

  protected readonly deleteTarget = signal<CashMovementItem | null>(null);
  protected readonly deleteType = signal<MovementType>('INCOME');
  protected readonly deleting = signal(false);

  protected readonly report = this.cashMovementService.report;

  protected readonly isAdmin = computed(() => {
    const user = this.authService.currentUser();
    const roles = user?.roles ?? [user?.role ?? ''];
    return roles.some((role) => role === 'Super Admin' || role === 'Admin');
  });

  protected readonly canStore = computed(() =>
    this.authService.hasPermission('cashflow.store'),
  );

  protected readonly isToday = computed(() => {
    const today = new Date();
    const viewed = this.currentDate();
    return (
      viewed.getFullYear() === today.getFullYear() &&
      viewed.getMonth() === today.getMonth() &&
      viewed.getDate() === today.getDate()
    );
  });

  protected readonly formattedViewDate = computed(() =>
    formatViewDate(this.currentDate()),
  );

  protected readonly filteredSales = computed(() =>
    this.filterList('sales'),
  );

  protected readonly filteredIncomes = computed(() =>
    this.filterList('incomes'),
  );

  protected readonly filteredExpenses = computed(() =>
    this.filterList('expenses'),
  );

  protected readonly filteredTotalIncomes = computed(() => {
    const sales = this.filteredSales().reduce((sum, item) => sum + item.amount, 0);
    const incomes = this.filteredIncomes().reduce((sum, item) => sum + item.amount, 0);
    return sales + incomes;
  });

  protected readonly filteredTotalExpenses = computed(() =>
    this.filteredExpenses().reduce((sum, item) => sum + item.amount, 0),
  );

  protected readonly filteredFinalBalance = computed(
    () => this.filteredTotalIncomes() - this.filteredTotalExpenses(),
  );

  protected readonly deleteLabel = computed(() => {
    const item = this.deleteTarget();
    if (!item) return '';
    const kind = this.deleteType() === 'INCOME' ? 'ingreso' : 'gasto';
    return `¿Eliminar este ${kind} (S/ ${item.amount.toFixed(2)})? Esta acción no se puede deshacer.`;
  });

  protected readonly movementTableColumns = computed<TableDataColumn<CashRegisterDisplayRow>[]>(() => {
    const cols: TableDataColumn<CashRegisterDisplayRow>[] = [
      { key: 'time', label: 'Hora', width: '5rem' },
      { key: 'type', label: '', width: '2.5rem', align: 'center' },
      { key: 'description', label: 'Descripción' },
      { key: 'method', label: 'Método', align: 'center', width: '7rem' },
      { key: 'amount', label: 'Monto', align: 'right', width: '7rem' },
    ];
    if (this.isAdmin()) {
      cols.push({ key: 'actions', label: 'Acciones', align: 'center', width: '6rem' });
    }
    return cols;
  });

  protected readonly displayRows = computed((): CashRegisterDisplayRow[] => {
    const rows: CashRegisterDisplayRow[] = [];

    const appendSection = (
      label: string,
      rowClass: string,
      labelClass: string,
      items: CashMovementItem[],
      movementKind: ListSection,
      emptyMessage: string,
    ): void => {
      rows.push({ kind: 'section', label, rowClass, labelClass });
      if (items.length === 0) {
        rows.push({ kind: 'empty', message: emptyMessage });
        return;
      }
      for (const item of items) {
        rows.push({ kind: 'movement', item, movementKind });
      }
    };

    appendSection(
      'Ventas del día',
      'bg-indigo-50/50',
      'text-indigo-700',
      this.filteredSales(),
      'sales',
      'Sin ventas registradas',
    );
    appendSection(
      'Otros ingresos',
      'bg-emerald-50/50',
      'text-emerald-700',
      this.filteredIncomes(),
      'incomes',
      'Sin ingresos extra',
    );
    appendSection(
      'Gastos',
      'bg-red-50/50',
      'text-red-700',
      this.filteredExpenses(),
      'expenses',
      'Sin gastos registrados',
    );

    return rows;
  });

  ngOnInit(): void {
    this.loadReport();
  }

  protected loadReport(): void {
    this.loading.set(true);
    const dateStr = this.formatIsoDate(this.currentDate());

    this.cashMovementService
      .loadDailyReport(dateStr)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loading.set(false),
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar el reporte de caja.');
        },
      });
  }

  protected changeDate(days: number): void {
    this.currentDate.update((date) => {
      const next = new Date(date);
      next.setDate(next.getDate() + days);
      return next;
    });
    this.loadReport();
  }

  protected goToToday(): void {
    this.currentDate.set(new Date());
    this.loadReport();
  }

  protected toggleFilter(key: keyof PaymentMethodFilter): void {
    this.paymentFilters.update((filters) => ({
      ...filters,
      [key]: !filters[key],
    }));
  }

  protected openForm(type: MovementType, item: CashMovementItem | null = null): void {
    this.formType.set(type);
    this.editingItem.set(item);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingItem.set(null);
  }

  protected onFormSaved(): void {
    this.closeForm();
  }

  protected confirmDelete(item: CashMovementItem, type: MovementType): void {
    this.deleteTarget.set(item);
    this.deleteType.set(type);
  }

  protected cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  protected executeDelete(): void {
    const item = this.deleteTarget();
    if (!item) return;

    this.deleting.set(true);
    const dateStr = this.formatIsoDate(this.currentDate());

    this.cashMovementService
      .deleteMovement(item.id, dateStr)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteTarget.set(null);
          if (this.editingItem()?.id === item.id) {
            this.closeForm();
          }
          this.toastService.show('success', 'Movimiento eliminado.');
        },
        error: () => {
          this.deleting.set(false);
          this.toastService.show('error', 'No se pudo eliminar el movimiento.');
        },
      });
  }

  protected methodBadgeClass(method: string): string {
    const normalized = method.toUpperCase();
    if (normalized.includes('YAPE') || normalized.includes('PLIN')) {
      return 'bg-purple-50 text-purple-700 ring-purple-200';
    }
    if (normalized.includes('CARD') || normalized.includes('TARJETA')) {
      return 'bg-blue-50 text-blue-700 ring-blue-200';
    }
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }

  private filterList(section: ListSection): CashMovementItem[] {
    const filters = this.paymentFilters();
    const list = this.report().lists[section] ?? [];

    if (section === 'sales') {
      return applyPaymentFiltersToSales(list, filters);
    }

    return list.filter((item) => matchesPaymentFilter(item.method, filters));
  }

  private formatIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

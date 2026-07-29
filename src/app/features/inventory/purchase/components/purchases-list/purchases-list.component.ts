import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmDialogComponent } from '../../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import {
  DataTableComponent,
  DataTableColumn,
  DataTableEmptyState,
  DataTablePagination,
} from '../../../../../shared/ui/data-table/data-table.component';
import { SelectComponent, SelectOption } from '../../../../../shared/ui/select/select.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { TableActionsComponent } from '../../../../../shared/ui/table-actions/table-actions.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { ProductLookupService } from '../../../products/data-access/product-lookup.service';
import { Warehouse } from '../../../products/models/product.model';
import { PurchaseService } from '../../data-access/purchase.service';
import { PurchaseRow } from '../../models/purchase.model';

@Component({
  selector: 'app-purchases-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ConfirmDialogComponent,
    DataTableComponent,
    SelectComponent,
    TableActionButtonComponent,
    TableActionsComponent,
  ],
  templateUrl: './purchases-list.component.html',
})
export class PurchasesListComponent implements OnInit {
  private readonly purchaseService = inject(PurchaseService);
  private readonly lookupService = inject(ProductLookupService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);
  protected readonly router = inject(Router);

  protected readonly purchases = signal<PurchaseRow[]>([]);
  protected readonly warehouses = signal<Warehouse[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly limit = signal(10);

  protected readonly cancelConfirmId = signal<number | null>(null);
  protected readonly cancelling = signal(false);

  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    warehouseId: new FormControl<number | ''>('', { nonNullable: true }),
    status: new FormControl<string | ''>('', { nonNullable: true }),
  });

  protected readonly currentSearch = signal('');
  protected readonly currentWarehouseId = signal<number | null>(null);
  protected readonly currentStatus = signal<string | null>(null);

  protected readonly statusOptions: SelectOption<string>[] = [
    { label: 'Activas', value: 'ACTIVE' },
    { label: 'Anuladas', value: 'CANCELLED' },
  ];

  protected readonly warehouseOptions = computed<SelectOption<number>[]>(() =>
    this.warehouses().map((w) => ({ label: w.name, value: w.id })),
  );

  protected readonly cancelTargetLabel = computed(() => {
    const id = this.cancelConfirmId();
    if (id === null) return '';
    const row = this.purchases().find((p) => p.id === id);
    return row ? `#${row.id} · ${row.supplierName}` : '';
  });

  protected readonly paginationPages = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [1];
    if (current > 3) pages.push('...');
    for (
      let i = Math.max(2, current - 1);
      i <= Math.min(total - 1, current + 1);
      i++
    ) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  protected readonly paginationData = computed<DataTablePagination | null>(() => {
    if (this.totalPages() <= 1) return null;
    return {
      currentPage: this.page(),
      totalPages: this.totalPages(),
      pageSize: this.limit(),
      totalItems: this.total(),
      pages: this.paginationPages(),
    };
  });

  protected readonly emptyState = computed<DataTableEmptyState>(() => ({
    icon: undefined as never,
    title: 'Aún no hay compras registradas',
    description: 'Registra tu primera compra para actualizar inventario y cuenta acumulada.',
    actionLabel: 'Nueva compra',
  }));

  protected readonly tableColumns = signal<DataTableColumn<PurchaseRow>[]>([
    { key: 'id', label: '#', align: 'left', width: '16' },
    { key: 'date', label: 'Fecha doc.', align: 'left' },
    { key: 'supplier', label: 'Proveedor', align: 'left' },
    { key: 'warehouse', label: 'Almacén', align: 'left' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'status', label: 'Estado', align: 'center' },
    { key: 'actions', label: 'Acciones', align: 'right', width: '120px' },
  ]);

  ngOnInit(): void {
    this.loadWarehouses();
    this.loadPurchases();

    this.filterForm.controls.search.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.currentSearch.set(value);
        this.page.set(1);
        this.loadPurchases();
      });

    this.filterForm.controls.warehouseId.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.currentWarehouseId.set(
          value === '' || value === null ? null : Number(value),
        );
        this.page.set(1);
        this.loadPurchases();
      });

    this.filterForm.controls.status.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.currentStatus.set(value === '' ? null : value);
        this.page.set(1);
        this.loadPurchases();
      });
  }

  protected loadWarehouses(): void {
    this.lookupService
      .getWarehouses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => this.warehouses.set(rows),
        error: () => this.toastService.show('error', 'No se pudieron cargar los almacenes.'),
      });
  }

  protected loadPurchases(): void {
    this.loading.set(true);
    this.purchaseService
      .getAll({
        limit: this.limit(),
        page: this.page(),
        search: this.currentSearch(),
        warehouseId: this.currentWarehouseId(),
        status: this.currentStatus(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.purchases.set(res.data);
          this.total.set(res.paginate.total);
          this.totalPages.set(res.paginate.pages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar el listado de compras.');
        },
      });
  }

  protected goToPage(p: number | '...'): void {
    if (p === '...' || p === this.page()) return;
    this.page.set(p);
    this.loadPurchases();
  }

  protected clearFilters(): void {
    this.filterForm.reset({ search: '', warehouseId: '', status: '' });
  }

  protected clearSearch(): void {
    this.filterForm.controls.search.setValue('');
  }

  protected openCancelConfirm(id: number): void {
    this.cancelConfirmId.set(id);
  }

  protected cancelCancelConfirm(): void {
    this.cancelConfirmId.set(null);
  }

  protected confirmCancel(): void {
    const id = this.cancelConfirmId();
    if (id === null) return;

    this.cancelling.set(true);
    this.purchaseService
      .cancel(id, 'Anulación desde listado de compras')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancelConfirmId.set(null);
          this.cancelling.set(false);
          this.toastService.show('success', 'Compra anulada correctamente.');
          this.loadPurchases();
        },
        error: (err: unknown) => {
          this.cancelling.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo anular la compra.',
          );
        },
      });
  }

  protected viewDetail(id: number): void {
    void this.router.navigate(['/inventories/purchase', id]);
  }

  protected formatMoney(value: number, currency = 'PEN'): string {
    const formatted = new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return currency === 'PEN' ? `S/ ${formatted}` : `${formatted} ${currency}`;
  }

  protected formatDate(value: string | null): string {
    if (!value) return '—';
    const parts = value.slice(0, 10).split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  protected statusLabel(status: string): string {
    if (status === 'ACTIVE') return 'Activa';
    if (status === 'CANCELLED') return 'Anulada';
    return status;
  }

  protected statusClass(status: string): string {
    if (status === 'ACTIVE') {
      return 'inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200';
    }
    if (status === 'CANCELLED') {
      return 'inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200';
    }
    return 'inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200';
  }
}

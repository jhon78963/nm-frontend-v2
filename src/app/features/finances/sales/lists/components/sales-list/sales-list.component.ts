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
import { AuthService } from '../../../../../auth/data-access/auth.service';
import { ConfirmDialogComponent } from '../../../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import {
  TableDataComponent,
  TableDataColumn,
  TableDataEmptyState,
  TableDataPagination,
  DtCellDirective,
  DtExpandCellComponent,
  DtRowDirective,
} from '../../../../../../shared/ui/table-data/table-data.component';
import { TableActionButtonComponent } from '../../../../../../shared/ui/table-action-button/table-action-button.component';
import { TableActionsComponent } from '../../../../../../shared/ui/table-actions/table-actions.component';
import { ToastService } from '../../../../../../shared/ui/toast/toast.service';
import { SaleService } from '../../data-access/sale.service';
import { Sale, SunatStatus } from '../../models/sale.model';
import { SaleFormComponent } from '../sale-form/sale-form.component';
import { SaleExchangeComponent } from '../sale-exchange/sale-exchange.component';
import { ExchangeResponse } from '../../models/sale.model';

@Component({
  selector: 'app-sales-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    SaleFormComponent,
    SaleExchangeComponent,
    ConfirmDialogComponent,
    TableDataComponent,
    DtCellDirective,
    DtExpandCellComponent,
    DtRowDirective,
    TableActionButtonComponent,
    TableActionsComponent,
  ],
  templateUrl: './sales-list.component.html',
})
export class SalesListComponent implements OnInit {
  private readonly saleService = inject(SaleService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);
  protected readonly router = inject(Router);

  protected readonly sales = signal<Sale[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly limit = signal(10);

  protected readonly formDialogOpen = signal(false);
  protected readonly editingSaleId = signal<number | null>(null);
  protected readonly formReadOnly = signal(false);

  protected readonly cancelConfirmId = signal<number | null>(null);
  protected readonly cancelling = signal(false);

  protected readonly exchangeSaleId = signal<number | null>(null);

  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  protected readonly currentSearch = signal('');

  protected readonly cancelTargetLabel = computed(() => {
    const id = this.cancelConfirmId();
    if (id === null) return '';
    const sale = this.sales().find((item) => item.id === id);
    return sale ? `${sale.code} · ${sale.customer || 'Sin cliente'}` : '';
  });

  protected readonly showsCurrentMonthHint = computed(() => {
    const roles = this.authService.currentUser()?.roles ?? [
      this.authService.currentUser()?.role ?? '',
    ];
    const privileged = roles.some(
      (role) => role === 'Super Admin' || role === 'Admin',
    );
    const storeSeller = roles.some(
      (role) => role === 'Vendedora' || role === 'Vendedor',
    );
    return storeSeller && !privileged;
  });

  protected readonly currentMonthLabel = new Intl.DateTimeFormat('es-PE', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

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

  protected readonly paginationData = computed<TableDataPagination | null>(() => {
    if (this.totalPages() <= 1) return null;
    return {
      currentPage: this.page(),
      totalPages: this.totalPages(),
      pageSize: this.limit(),
      totalItems: this.total(),
      pages: this.paginationPages(),
    };
  });

  protected readonly emptyState = computed<TableDataEmptyState>(() => ({
    icon: undefined as never,
    title: 'Aún no hay ventas registradas',
    description: 'Registra la primera venta desde el punto de venta (POS).',
    actionLabel: 'Ir al POS',
  }));

  protected readonly tableColumns = signal<TableDataColumn<Sale>[]>([
    { key: 'code', label: 'Venta', align: 'left', mobilePrimary: true },
    { key: 'customer', label: 'Cliente', align: 'left' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'status', label: 'Estado', align: 'center' },
    { key: 'invoice', label: 'Comprobante', align: 'left' },
    { key: 'sunat', label: 'SUNAT', align: 'center' },
    { key: 'actions', label: 'Acciones', align: 'right', width: '120px' },
  ]);

  ngOnInit(): void {
    this.restoreFilters();
    this.loadSales();

    this.filterForm.controls.search.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.currentSearch.set(value);
        this.page.set(1);
        this.loadSales();
      });
  }

  protected goToPos(): void {
    void this.router.navigate(['/finances/pos']);
  }

  protected loadSales(): void {
    this.loading.set(true);
    this.saleService
      .getAll({
        limit: this.limit(),
        page: this.page(),
        search: this.currentSearch(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.sales.set(res.data);
          this.total.set(res.paginate.total);
          this.totalPages.set(res.paginate.pages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar la lista de ventas.');
        },
      });
  }

  protected goToPage(p: number | '...'): void {
    if (p === '...' || p === this.page()) return;
    this.page.set(p);
    this.loadSales();
  }

  protected clearFilters(): void {
    this.filterForm.controls.search.setValue('');
    this.page.set(1);
    this.limit.set(10);
    this.currentSearch.set('');
    this.saleService.clearFilterState();
    this.loadSales();
  }

  protected clearSearch(): void {
    this.filterForm.controls.search.setValue('');
  }

  protected openEdit(id: number): void {
    this.editingSaleId.set(id);
    this.formReadOnly.set(false);
    this.formDialogOpen.set(true);
  }

  protected openView(id: number): void {
    this.editingSaleId.set(id);
    this.formReadOnly.set(true);
    this.formDialogOpen.set(true);
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
    this.saleService
      .cancel(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancelConfirmId.set(null);
          this.cancelling.set(false);
          this.toastService.show('success', 'La venta ha sido anulada.');
          if (this.sales().length === 1 && this.page() > 1) {
            this.page.update((p) => p - 1);
          }
          this.loadSales();
        },
        error: (err: unknown) => {
          this.cancelling.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo anular la venta.',
          );
        },
      });
  }

  protected previewTicket(id: number): void {
    void this.saleService.openTicketPreview(id).catch(() => {
      this.toastService.show(
        'error',
        'No se pudo abrir el ticket. Permite ventanas emergentes e intenta de nuevo.',
      );
    });
  }

  protected onFormSaved(message: string): void {
    this.formDialogOpen.set(false);
    this.toastService.show('success', message);
    this.loadSales();
  }

  protected onFormClosed(): void {
    this.formDialogOpen.set(false);
  }

  protected openExchange(id: number): void {
    this.exchangeSaleId.set(id);
  }

  protected closeExchange(): void {
    this.exchangeSaleId.set(null);
  }

  protected onExchangeCompleted(response: ExchangeResponse): void {
    this.exchangeSaleId.set(null);
    this.toastService.show('success', response.message || 'Canje registrado correctamente.');
    this.loadSales();
  }

  protected canExchange(sale: Sale): boolean {
    return (
      sale.status === 'ACTIVE' &&
      this.authService.hasAnyPermission(['sale.exchange', 'sale.update'])
    );
  }

  protected canEdit(sale: Sale): boolean {
    return (
      sale.status !== 'CANCELED' && this.authService.hasPermission('sale.update')
    );
  }

  protected canViewOnly(sale: Sale): boolean {
    if (sale.status === 'CANCELED') {
      return this.authService.hasAnyPermission(['sale.update', 'sale.get']);
    }
    return (
      !this.authService.hasPermission('sale.update') &&
      this.authService.hasAnyPermission(['sale.getAll', 'sale.get'])
    );
  }

  protected canCancel(sale: Sale): boolean {
    return (
      sale.status !== 'CANCELED' && this.authService.hasPermission('sale.delete')
    );
  }

  protected formatMoney(value: number): string {
    const formatted = new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `S/ ${formatted}`;
  }

  protected formatDate(value: string | null): string {
    if (!value) return '—';
    const normalized = value.slice(0, 10);
    const parts = normalized.split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  protected statusLabel(status: string): string {
    if (status === 'ACTIVE') return 'Activa';
    if (status === 'CANCELED') return 'Anulada';
    return status;
  }

  protected statusClass(status: string): string {
    if (status === 'ACTIVE') {
      return 'inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200';
    }
    if (status === 'CANCELED') {
      return 'inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200';
    }
    return 'inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200';
  }

  protected sunatLabel(status: SunatStatus | null | undefined): string {
    switch (status) {
      case 'ACCEPTED':
        return 'Aceptado';
      case 'PENDING':
        return 'Pendiente';
      case 'SENT':
        return 'Enviado';
      case 'REJECTED':
        return 'Rechazado';
      case 'VOIDED':
        return 'Anulado';
      default:
        return '—';
    }
  }

  protected sunatClass(status: SunatStatus | null | undefined): string {
    switch (status) {
      case 'ACCEPTED':
        return 'inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200';
      case 'PENDING':
        return 'inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200';
      case 'SENT':
        return 'inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200';
      case 'REJECTED':
        return 'inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200';
      case 'VOIDED':
        return 'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 ring-1 ring-inset ring-gray-200';
      default:
        return 'inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-200';
    }
  }

  private restoreFilters(): void {
    const saved = this.saleService.getFilterState();
    if (!saved) return;

    this.limit.set(saved.limit);
    this.page.set(saved.page);
    this.currentSearch.set(saved.search);
    if (saved.search) {
      this.filterForm.controls.search.setValue(saved.search, {
        emitEvent: false,
      });
    }
  }
}

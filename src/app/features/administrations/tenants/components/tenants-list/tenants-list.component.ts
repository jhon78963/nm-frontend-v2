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
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmDialogComponent } from '../../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import {
  DataTableComponent,
  DataTableColumn,
  DataTableEmptyState,
  DataTablePagination,
  DtCellDirective,
  DtExpandCellComponent,
  DtRowDirective,
} from '../../../../../shared/ui/data-table/data-table.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { TableActionsComponent } from '../../../../../shared/ui/table-actions/table-actions.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { TABLE_FILTER_KEYS } from '../../../../../core/table-filters/table-filter-keys';
import { TableFilterStorageService } from '../../../../../core/table-filters/table-filter-storage.service';
import {
  buildSearchPageFilterState,
  persistSearchPageFilters,
  restoreSearchPageFilters,
} from '../../../../../core/table-filters/table-filter-state.util';
import { TenantService } from '../../data-access/tenant.service';
import { Tenant } from '../../models/tenant.model';
import { TenantFormComponent } from '../tenant-form/tenant-form.component';

const FILTER_STORAGE_KEY = TABLE_FILTER_KEYS.tenants;

@Component({
  selector: 'app-tenants-list',
  imports: [
    ReactiveFormsModule,
    TenantFormComponent,
    ConfirmDialogComponent,
    DataTableComponent,
    DtCellDirective,
    DtExpandCellComponent,
    DtRowDirective,
    TableActionButtonComponent,
    TableActionsComponent,
  ],
  templateUrl: './tenants-list.component.html',
})
export class TenantsListComponent implements OnInit {
  private readonly tenantService = inject(TenantService);
  private readonly filterStorage = inject(TableFilterStorageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly tenants = signal<Tenant[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly limit = signal(10);

  protected readonly formDialogOpen = signal(false);
  protected readonly editingTenantId = signal<number | null>(null);

  protected readonly deleteConfirmId = signal<number | null>(null);
  protected readonly deleting = signal(false);

  protected readonly searchForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  protected readonly currentSearch = signal('');

  protected readonly deleteTargetLabel = computed(() => {
    const id = this.deleteConfirmId();
    if (id === null) return '';
    const tenant = this.tenants().find((t) => t.id === id);
    return tenant?.name ?? '';
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
    title: 'Aún no hay clientes registrados',
    description: 'Registra el primer cliente para comenzar a operar.',
    actionLabel: 'Nuevo cliente',
  }));

  protected readonly tableColumns = signal<DataTableColumn<Tenant>[]>([
    { key: 'tenant', label: 'Cliente', align: 'left', mobilePrimary: true },
    { key: 'ruc', label: 'RUC', align: 'left' },
    { key: 'contact', label: 'Contacto', align: 'left' },
    { key: 'status', label: 'Estado', align: 'left' },
    { key: 'actions', label: 'Acciones', align: 'right', width: '100px' },
  ]);

  ngOnInit(): void {
    this.restoreFilters();
    this.loadTenants();

    this.searchForm.controls.search.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.currentSearch.set(value);
        this.page.set(1);
        this.persistFilters();
        this.loadTenants();
      });
  }

  protected loadTenants(): void {
    this.loading.set(true);
    this.tenantService
      .getAll({
        limit: this.limit(),
        page: this.page(),
        search: this.currentSearch(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.tenants.set(res.data);
          this.total.set(res.paginate.total);
          this.totalPages.set(res.paginate.pages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar la lista de clientes.');
        },
      });
  }

  protected goToPage(p: number | '...'): void {
    if (p === '...' || p === this.page()) return;
    this.page.set(p);
    this.persistFilters();
    this.loadTenants();
  }

  protected openCreate(): void {
    this.editingTenantId.set(null);
    this.formDialogOpen.set(true);
  }

  protected openEdit(id: number): void {
    this.editingTenantId.set(id);
    this.formDialogOpen.set(true);
  }

  protected openDeleteConfirm(id: number): void {
    this.deleteConfirmId.set(id);
  }

  protected cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  protected confirmDelete(): void {
    const id = this.deleteConfirmId();
    if (id === null) return;

    this.deleting.set(true);
    this.tenantService
      .delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteConfirmId.set(null);
          this.deleting.set(false);
          this.toastService.show('success', 'Cliente eliminado correctamente.');
          if (this.tenants().length === 1 && this.page() > 1) {
            this.page.update((p) => p - 1);
          }
          this.loadTenants();
        },
        error: (err: unknown) => {
          this.deleting.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string'
              ? err
              : 'No se pudo eliminar el cliente. Verifica que no tenga tiendas ni usuarios asociados.',
          );
        },
      });
  }

  protected onFormSaved(message: string): void {
    this.formDialogOpen.set(false);
    this.toastService.show('success', message);
    this.loadTenants();
  }

  protected onFormClosed(): void {
    this.formDialogOpen.set(false);
  }

  protected clearSearch(): void {
    this.searchForm.controls.search.setValue('');
  }

  protected displayName(tenant: Tenant): string {
    return tenant.setting?.tradeName?.trim() || tenant.name;
  }

  protected contactLine(tenant: Tenant): string {
    const setting = tenant.setting;
    if (!setting) return '—';
    if (setting.phone?.trim()) return setting.phone.trim();
    if (setting.email?.trim()) return setting.email.trim();
    return '—';
  }

  protected locationLine(tenant: Tenant): string {
    const setting = tenant.setting;
    if (!setting) return '';
    const parts = [setting.district, setting.province].filter(Boolean);
    return parts.join(', ');
  }

  private restoreFilters(): void {
    restoreSearchPageFilters(this.filterStorage, FILTER_STORAGE_KEY, {
      page: this.page,
      limit: this.limit,
      currentSearch: this.currentSearch,
      searchControl: this.searchForm.controls.search,
    });
  }

  private persistFilters(): void {
    persistSearchPageFilters(
      this.filterStorage,
      FILTER_STORAGE_KEY,
      buildSearchPageFilterState(
        this.page(),
        this.limit(),
        this.currentSearch(),
      ),
    );
  }
}

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
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { TableActionsComponent } from '../../../../../shared/ui/table-actions/table-actions.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { WarehouseLookupService } from '../../data-access/warehouse-lookup.service';
import { WarehouseService } from '../../data-access/warehouse.service';
import { TenantLookupOption, Warehouse } from '../../models/warehouse.model';
import { WarehouseFormComponent } from '../warehouse-form/warehouse-form.component';

@Component({
  selector: 'app-warehouses-list',
  imports: [
    ReactiveFormsModule,
    WarehouseFormComponent,
    ConfirmDialogComponent,
    TableActionButtonComponent,
    TableActionsComponent,
  ],
  templateUrl: './warehouses-list.component.html',
})
export class WarehousesListComponent implements OnInit {
  private readonly warehouseService = inject(WarehouseService);
  private readonly lookupService = inject(WarehouseLookupService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly warehouses = signal<Warehouse[]>([]);
  protected readonly tenants = signal<TenantLookupOption[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly limit = signal(10);

  protected readonly formDialogOpen = signal(false);
  protected readonly editingWarehouseId = signal<number | null>(null);

  protected readonly deleteConfirmId = signal<number | null>(null);
  protected readonly deleting = signal(false);

  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    tenantId: new FormControl<number | ''>('', { nonNullable: true }),
  });

  protected readonly currentSearch = signal('');
  protected readonly currentTenantId = signal<number | null>(null);

  protected readonly tenantNameById = computed(() => {
    const map = new Map<number, string>();
    for (const tenant of this.tenants()) {
      map.set(tenant.id, tenant.name);
    }
    return map;
  });

  protected readonly deleteTargetLabel = computed(() => {
    const id = this.deleteConfirmId();
    if (id === null) return '';
    const warehouse = this.warehouses().find((w) => w.id === id);
    return warehouse?.name ?? '';
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

  ngOnInit(): void {
    this.loadTenants();
    this.loadWarehouses();

    this.filterForm.controls.search.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.currentSearch.set(value);
        this.page.set(1);
        this.loadWarehouses();
      });

    this.filterForm.controls.tenantId.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const tenantId =
          value === '' || value === null
            ? null
            : typeof value === 'number'
              ? value
              : Number(value);
        this.currentTenantId.set(
          tenantId !== null && Number.isFinite(tenantId) ? tenantId : null,
        );
        this.page.set(1);
        this.loadWarehouses();
      });
  }

  protected loadTenants(): void {
    this.lookupService
      .getTenants()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tenants) => this.tenants.set(tenants),
        error: () => {
          this.toastService.show('error', 'No se pudo cargar la lista de clientes.');
        },
      });
  }

  protected loadWarehouses(): void {
    this.loading.set(true);
    this.warehouseService
      .getAll({
        limit: this.limit(),
        page: this.page(),
        search: this.currentSearch(),
        tenantId: this.currentTenantId(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.warehouses.set(res.data);
          this.total.set(res.paginate.total);
          this.totalPages.set(res.paginate.pages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar la lista de tiendas.');
        },
      });
  }

  protected goToPage(p: number | '...'): void {
    if (p === '...' || p === this.page()) return;
    this.page.set(p);
    this.loadWarehouses();
  }

  protected openCreate(): void {
    this.editingWarehouseId.set(null);
    this.formDialogOpen.set(true);
  }

  protected openEdit(id: number): void {
    this.editingWarehouseId.set(id);
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
    this.warehouseService
      .delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteConfirmId.set(null);
          this.deleting.set(false);
          this.toastService.show('success', 'Tienda eliminada correctamente.');
          if (this.warehouses().length === 1 && this.page() > 1) {
            this.page.update((p) => p - 1);
          }
          this.loadWarehouses();
        },
        error: (err: unknown) => {
          this.deleting.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string'
              ? err
              : 'No se pudo eliminar la tienda. Debe estar vacía de productos y usuarios dependientes.',
          );
        },
      });
  }

  protected onFormSaved(message: string): void {
    this.formDialogOpen.set(false);
    this.toastService.show('success', message);
    this.loadWarehouses();
  }

  protected onFormClosed(): void {
    this.formDialogOpen.set(false);
  }

  protected clearSearch(): void {
    this.filterForm.controls.search.setValue('');
  }

  protected clearFilters(): void {
    this.filterForm.reset({ search: '', tenantId: '' });
  }

  protected tenantLabel(warehouse: Warehouse): string {
    if (warehouse.tenantId === null) return 'Sin cliente';
    return this.tenantNameById().get(warehouse.tenantId) ?? `Cliente #${warehouse.tenantId}`;
  }

  protected hasActiveFilters(): boolean {
    return this.currentSearch().length > 0 || this.currentTenantId() !== null;
  }
}

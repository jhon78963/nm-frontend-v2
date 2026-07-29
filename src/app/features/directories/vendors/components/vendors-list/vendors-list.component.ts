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
  DataTablePagination,
  DataTableEmptyState,
} from '../../../../../shared/ui/data-table/data-table.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { TableActionsComponent } from '../../../../../shared/ui/table-actions/table-actions.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { VendorService } from '../../data-access/vendor.service';
import { Vendor } from '../../models/vendor.model';
import { VendorFormComponent } from '../vendor-form/vendor-form.component';

@Component({
  selector: 'app-vendors-list',
  imports: [
    ReactiveFormsModule,
    VendorFormComponent,
    ConfirmDialogComponent,
    DataTableComponent,
    TableActionButtonComponent,
    TableActionsComponent,
  ],
  templateUrl: './vendors-list.component.html',
})
export class VendorsListComponent implements OnInit {
  private readonly vendorService = inject(VendorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly vendors = signal<Vendor[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly limit = signal(10);

  protected readonly formDialogOpen = signal(false);
  protected readonly editingVendorId = signal<number | null>(null);

  protected readonly deleteConfirmId = signal<number | null>(null);
  protected readonly deleting = signal(false);

  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  protected readonly currentSearch = signal('');

  protected readonly deleteTargetLabel = computed(() => {
    const id = this.deleteConfirmId();
    if (id === null) return '';
    return this.vendors().find((v) => v.id === id)?.name ?? '';
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
    title: 'Aún no hay proveedores registrados',
    description: 'Agrega proveedores para gestionar compras e inventario.',
    actionLabel: 'Nuevo proveedor',
  }));

  protected readonly tableColumns = signal<DataTableColumn<Vendor>[]>([
    { key: 'id', label: '#', align: 'left', width: '16' },
    { key: 'vendor', label: 'Proveedor', align: 'left' },
    { key: 'phone', label: 'Celular', align: 'left' },
    { key: 'address', label: 'Dirección', align: 'left' },
    { key: 'local', label: 'Galería', align: 'left' },
    { key: 'actions', label: 'Acciones', align: 'right', width: '100px' },
  ]);

  ngOnInit(): void {
    this.loadVendors();

    this.filterForm.controls.search.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.currentSearch.set(value);
        this.page.set(1);
        this.loadVendors();
      });
  }

  protected loadVendors(): void {
    this.loading.set(true);
    this.vendorService
      .getAll({
        limit: this.limit(),
        page: this.page(),
        search: this.currentSearch(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.vendors.set(res.data);
          this.total.set(res.paginate.total);
          this.totalPages.set(res.paginate.pages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar la lista de proveedores.');
        },
      });
  }

  protected goToPage(p: number | '...'): void {
    if (p === '...' || p === this.page()) return;
    this.page.set(p);
    this.loadVendors();
  }

  protected openCreate(): void {
    this.editingVendorId.set(null);
    this.formDialogOpen.set(true);
  }

  protected openEdit(id: number): void {
    this.editingVendorId.set(id);
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
    this.vendorService
      .delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteConfirmId.set(null);
          this.deleting.set(false);
          this.toastService.show('success', 'Proveedor eliminado correctamente.');
          if (this.vendors().length === 1 && this.page() > 1) {
            this.page.update((p) => p - 1);
          }
          this.loadVendors();
        },
        error: (err: unknown) => {
          this.deleting.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo eliminar el proveedor.',
          );
        },
      });
  }

  protected onFormSaved(message: string): void {
    this.formDialogOpen.set(false);
    this.toastService.show('success', message);
    this.loadVendors();
  }

  protected onFormClosed(): void {
    this.formDialogOpen.set(false);
  }

  protected clearSearch(): void {
    this.filterForm.controls.search.setValue('');
  }

  protected displayValue(value: string): string {
    return value.trim() ? value : '—';
  }

  protected vendorInitial(vendor: Vendor): string {
    return vendor.name.charAt(0).toUpperCase();
  }
}

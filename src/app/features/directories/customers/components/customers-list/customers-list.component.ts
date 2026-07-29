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
import { CustomerService } from '../../data-access/customer.service';
import { Customer } from '../../models/customer.model';
import { CustomerFormComponent } from '../customer-form/customer-form.component';

@Component({
  selector: 'app-customers-list',
  imports: [
    ReactiveFormsModule,
    CustomerFormComponent,
    ConfirmDialogComponent,
    DataTableComponent,
    TableActionButtonComponent,
    TableActionsComponent,
  ],
  templateUrl: './customers-list.component.html',
})
export class CustomersListComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly customers = signal<Customer[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly limit = signal(10);

  protected readonly formDialogOpen = signal(false);
  protected readonly editingCustomerId = signal<number | null>(null);

  protected readonly deleteConfirmId = signal<number | null>(null);
  protected readonly deleting = signal(false);

  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  protected readonly currentSearch = signal('');

  protected readonly deleteTargetLabel = computed(() => {
    const id = this.deleteConfirmId();
    if (id === null) return '';
    const customer = this.customers().find((c) => c.id === id);
    return customer ? `${customer.name} ${customer.surname}` : '';
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
    description: 'Crea el primer cliente para usarlo en ventas y POS.',
    actionLabel: 'Nuevo cliente',
  }));

  protected readonly tableColumns = signal<DataTableColumn<Customer>[]>([
    { key: 'customer', label: 'Cliente', align: 'left' },
    { key: 'dni', label: 'DNI', align: 'left' },
    { key: 'actions', label: 'Acciones', align: 'right', width: '100px' },
  ]);

  ngOnInit(): void {
    this.loadCustomers();

    this.filterForm.controls.search.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.currentSearch.set(value);
        this.page.set(1);
        this.loadCustomers();
      });
  }

  protected loadCustomers(): void {
    this.loading.set(true);
    this.customerService
      .getAll({
        limit: this.limit(),
        page: this.page(),
        search: this.currentSearch(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.customers.set(res.data);
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
    this.loadCustomers();
  }

  protected openCreate(): void {
    this.editingCustomerId.set(null);
    this.formDialogOpen.set(true);
  }

  protected openEdit(id: number): void {
    this.editingCustomerId.set(id);
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
    this.customerService
      .delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteConfirmId.set(null);
          this.deleting.set(false);
          this.toastService.show('success', 'Cliente eliminado correctamente.');
          if (this.customers().length === 1 && this.page() > 1) {
            this.page.update((p) => p - 1);
          }
          this.loadCustomers();
        },
        error: (err: unknown) => {
          this.deleting.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo eliminar el cliente.',
          );
        },
      });
  }

  protected onFormSaved(message: string): void {
    this.formDialogOpen.set(false);
    this.toastService.show('success', message);
    this.loadCustomers();
  }

  protected onFormClosed(): void {
    this.formDialogOpen.set(false);
  }

  protected clearSearch(): void {
    this.filterForm.controls.search.setValue('');
  }

  protected customerInitials(customer: Customer): string {
    const n = customer.name.charAt(0).toUpperCase();
    const s = customer.surname.charAt(0).toUpperCase();
    return `${n}${s}`;
  }
}

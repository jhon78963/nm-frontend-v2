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
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { SelectComponent, SelectOption } from '../../../../../shared/ui/select/select.component';
import {
  TableDataComponent,
  TableDataColumn,
  TableDataEmptyState,
  TableDataPagination,
  DtCellDirective,
  DtExpandCellComponent,
  DtRowDirective,
} from '../../../../../shared/ui/table-data/table-data.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { TableActionsComponent } from '../../../../../shared/ui/table-actions/table-actions.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { TABLE_FILTER_KEYS } from '../../../../../core/table-filters/table-filter-keys';
import { TableFilterStorageService } from '../../../../../core/table-filters/table-filter-storage.service';
import {
  isSearchPageFilterState,
  patchFormControl,
  SearchPageFilterState,
} from '../../../../../core/table-filters/table-filter-state.util';
import { UserLookupService } from '../../data-access/user-lookup.service';
import { UserService } from '../../data-access/user.service';
import { TenantOption, User, WarehouseOption } from '../../models/user.model';
import { UserFormComponent } from '../user-form/user-form.component';
import { UserPasswordResetComponent } from '../user-password-reset/user-password-reset.component';

const FILTER_STORAGE_KEY = TABLE_FILTER_KEYS.users;

interface UserFilterState extends SearchPageFilterState {
  tenantId: number | null;
  warehouseId: number | null;
}

function isUserFilterState(value: unknown): value is UserFilterState {
  if (!isSearchPageFilterState(value)) {
    return false;
  }

  const state = value as UserFilterState;
  const tenantOk = state.tenantId === null || typeof state.tenantId === 'number';
  const warehouseOk =
    state.warehouseId === null || typeof state.warehouseId === 'number';
  return tenantOk && warehouseOk;
}

@Component({
  selector: 'app-users-list',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    UserFormComponent,
    UserPasswordResetComponent,
    ConfirmDialogComponent,
    TableDataComponent,
    DtCellDirective,
    DtExpandCellComponent,
    DtRowDirective,
    TableActionButtonComponent,
    TableActionsComponent,
  ],
  templateUrl: './users-list.component.html',
})
export class UsersListComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly lookupService = inject(UserLookupService);
  private readonly filterStorage = inject(TableFilterStorageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly users = signal<User[]>([]);
  protected readonly tenants = signal<TenantOption[]>([]);
  protected readonly warehouses = signal<WarehouseOption[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly limit = signal(10);

  protected readonly formDialogOpen = signal(false);
  protected readonly editingUserId = signal<number | null>(null);

  protected readonly passwordResetOpen = signal(false);
  protected readonly passwordResetUser = signal<User | null>(null);

  protected readonly disableConfirmId = signal<number | null>(null);
  protected readonly disabling = signal(false);

  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    tenantId: new FormControl<number | ''>('', { nonNullable: true }),
    warehouseId: new FormControl<number | ''>('', { nonNullable: true }),
  });

  protected readonly currentSearch = signal('');
  protected readonly currentTenantId = signal<number | null>(null);
  protected readonly currentWarehouseId = signal<number | null>(null);

  protected readonly tenantOptions = computed<SelectOption<number>[]>(() =>
    this.tenants().map((tenant) => ({ label: tenant.name, value: tenant.id })),
  );

  protected readonly warehouseOptions = computed<SelectOption<number>[]>(() => {
    const tenantId = this.currentTenantId();
    const warehouses =
      tenantId === null
        ? this.warehouses()
        : this.warehouses().filter((warehouse) => warehouse.tenantId === tenantId);

    return warehouses.map((warehouse) => ({
      label: warehouse.name,
      value: warehouse.id,
    }));
  });

  protected readonly disableTargetLabel = computed(() => {
    const id = this.disableConfirmId();
    if (id === null) return '';
    const user = this.users().find((u) => u.id === id);
    return user ? `${user.username} (${user.name} ${user.surname})` : '';
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

  protected readonly emptyState = computed<TableDataEmptyState>(() => {
    if (this.hasActiveFilters()) {
      return {
        icon: undefined as never,
        title: 'Sin resultados con los filtros actuales',
        description: 'Prueba con otro término, cliente o tienda.',
        actionLabel: 'Limpiar filtros',
      };
    }
    return {
      icon: undefined as never,
      title: 'Aún no hay usuarios registrados',
      description: 'Crea el primero haciendo clic en «Nuevo usuario».',
      actionLabel: 'Nuevo usuario',
    };
  });

  protected readonly tableColumns = signal<TableDataColumn<User>[]>([
    { key: 'user', label: 'Usuario', align: 'left', mobilePrimary: true },
    { key: 'fullName', label: 'Nombre completo', align: 'left' },
    { key: 'role', label: 'Rol', align: 'left' },
    { key: 'tenant', label: 'Cliente', align: 'left' },
    { key: 'warehouse', label: 'Tienda', align: 'left' },
    { key: 'status', label: 'Estado', align: 'left' },
    { key: 'actions', label: 'Acciones', align: 'right', width: '120px' },
  ]);

  ngOnInit(): void {
    this.restoreFilters();
    this.loadLookups();
    this.loadUsers();

    this.filterForm.controls.search.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.currentSearch.set(value);
        this.page.set(1);
        this.persistFilters();
        this.loadUsers();
      });

    this.filterForm.controls.tenantId.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const tenantId = this.toOptionalId(value);
        this.currentTenantId.set(tenantId);

        const warehouseId = this.currentWarehouseId();
        if (
          warehouseId !== null &&
          !this.warehouses().some(
            (warehouse) =>
              warehouse.id === warehouseId &&
              (tenantId === null || warehouse.tenantId === tenantId),
          )
        ) {
          this.filterForm.controls.warehouseId.setValue('', { emitEvent: false });
          this.currentWarehouseId.set(null);
        }

        this.page.set(1);
        this.persistFilters();
        this.loadUsers();
      });

    this.filterForm.controls.warehouseId.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.currentWarehouseId.set(this.toOptionalId(value));
        this.page.set(1);
        this.persistFilters();
        this.loadUsers();
      });
  }

  protected loadUsers(): void {
    this.loading.set(true);
    this.userService
      .getAll({
        limit: this.limit(),
        page: this.page(),
        search: this.currentSearch(),
        tenantId: this.currentTenantId(),
        warehouseId: this.currentWarehouseId(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.users.set(res.data);
          this.total.set(res.paginate.total);
          this.totalPages.set(res.paginate.pages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar la lista de usuarios.');
        },
      });
  }

  protected goToPage(p: number | '...'): void {
    if (p === '...' || p === this.page()) return;
    this.page.set(p);
    this.persistFilters();
    this.loadUsers();
  }

  protected openCreate(): void {
    this.editingUserId.set(null);
    this.formDialogOpen.set(true);
  }

  protected openEdit(id: number): void {
    this.editingUserId.set(id);
    this.formDialogOpen.set(true);
  }

  protected openPasswordReset(user: User): void {
    this.passwordResetUser.set(user);
    this.passwordResetOpen.set(true);
  }

  protected openDisableConfirm(id: number): void {
    this.disableConfirmId.set(id);
  }

  protected cancelDisable(): void {
    this.disableConfirmId.set(null);
  }

  protected confirmDisable(): void {
    const id = this.disableConfirmId();
    if (id === null) return;

    this.disabling.set(true);
    this.userService
      .delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.disableConfirmId.set(null);
          this.disabling.set(false);
          this.toastService.show('success', 'Usuario deshabilitado correctamente.');
          this.loadUsers();
        },
        error: () => {
          this.disabling.set(false);
          this.disableConfirmId.set(null);
          this.toastService.show('error', 'No se pudo deshabilitar el usuario.');
        },
      });
  }

  protected onFormSaved(message: string): void {
    this.formDialogOpen.set(false);
    this.toastService.show('success', message);
    this.loadUsers();
  }

  protected onFormClosed(): void {
    this.formDialogOpen.set(false);
  }

  protected onPasswordResetSaved(message: string): void {
    this.passwordResetOpen.set(false);
    this.passwordResetUser.set(null);
    this.toastService.show('success', message);
  }

  protected onPasswordResetClosed(): void {
    this.passwordResetOpen.set(false);
    this.passwordResetUser.set(null);
  }

  protected clearSearch(): void {
    this.filterForm.controls.search.setValue('');
  }

  protected clearFilters(): void {
    this.filterForm.reset(
      { search: '', tenantId: '', warehouseId: '' },
      { emitEvent: false },
    );
    this.currentSearch.set('');
    this.currentTenantId.set(null);
    this.currentWarehouseId.set(null);
    this.page.set(1);
    this.filterStorage.remove(FILTER_STORAGE_KEY);
    this.loadUsers();
  }

  protected fullName(user: User): string {
    return `${user.name} ${user.surname}`.trim();
  }

  protected tenantLabel(user: User): string {
    if (user.tenantName?.trim()) {
      return user.tenantName;
    }
    if (user.tenantId) {
      return `Cliente #${user.tenantId}`;
    }
    return 'Sin cliente';
  }

  protected warehouseLabel(user: User): string {
    if (user.warehouseName?.trim()) {
      return user.warehouseName;
    }
    if (user.warehouseId) {
      return `Tienda #${user.warehouseId}`;
    }
    return 'Sin tienda';
  }

  protected hasActiveFilters(): boolean {
    return (
      this.currentSearch().length > 0 ||
      this.currentTenantId() !== null ||
      this.currentWarehouseId() !== null
    );
  }

  protected onEmptyAction(): void {
    if (this.hasActiveFilters()) {
      this.clearFilters();
    } else {
      this.openCreate();
    }
  }

  private loadLookups(): void {
    this.lookupService
      .getTenants()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tenants) => this.tenants.set(tenants),
        error: () => {
          this.toastService.show('error', 'No se pudo cargar la lista de clientes.');
        },
      });

    this.lookupService
      .getWarehouses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (warehouses) => this.warehouses.set(warehouses),
        error: () => {
          this.toastService.show('error', 'No se pudo cargar la lista de tiendas.');
        },
      });
  }

  private restoreFilters(): void {
    const saved = this.filterStorage.load(FILTER_STORAGE_KEY, isUserFilterState);
    if (!saved) {
      return;
    }

    this.limit.set(saved.limit);
    this.page.set(saved.page);
    this.currentSearch.set(saved.search);
    this.currentTenantId.set(saved.tenantId);
    this.currentWarehouseId.set(saved.warehouseId);

    if (saved.search) {
      this.filterForm.controls.search.setValue(saved.search, {
        emitEvent: false,
      });
    }

    patchFormControl(this.filterForm.controls.tenantId, saved.tenantId ?? '');
    patchFormControl(
      this.filterForm.controls.warehouseId,
      saved.warehouseId ?? '',
    );
  }

  private persistFilters(): void {
    this.filterStorage.save(FILTER_STORAGE_KEY, {
      limit: this.limit(),
      page: this.page(),
      search: this.currentSearch(),
      tenantId: this.currentTenantId(),
      warehouseId: this.currentWarehouseId(),
    });
  }

  private toOptionalId(value: number | '' | null): number | null {
    if (value === '' || value === null) {
      return null;
    }
    const id = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
}

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
import { debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { isSuperAdmin } from '../../../../../core/auth/permission.util';
import {
  DataTableComponent,
  DataTableColumn,
  DataTableEmptyState,
  DataTablePagination,
} from '../../../../../shared/ui/data-table/data-table.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { AuthService } from '../../../../auth/data-access/auth.service';
import { UserService } from '../../../users/data-access/user.service';
import { User, UserListResponse } from '../../../users/models/user.model';
import { WarehouseService } from '../../../warehouses/data-access/warehouse.service';
import { ActionLogService } from '../../data-access/action-log.service';
import { ActionLog } from '../../models/action-log.model';
import {
  ACTION_LOG_DATE_PRESETS,
  ActionLogDatePreset,
  buildActionLogDateRange,
  isDateRangeValid,
} from '../../utils/action-log-date.util';
import {
  ACTION_LOG_FILTER_GROUPS,
  encodeActionFilter,
  getActionLogLabel,
  getActionLogToneClass,
} from '../../utils/action-log-labels.util';

@Component({
  selector: 'app-action-logs-list',
  imports: [ReactiveFormsModule, DataTableComponent],
  providers: [ActionLogService, WarehouseService, UserService],
  templateUrl: './action-logs-list.component.html',
})
export class ActionLogsListComponent implements OnInit {
  private readonly actionLogService = inject(ActionLogService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly logs = signal<ActionLog[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly limit = signal(20);
  protected readonly expandedLogId = signal<number | null>(null);
  protected readonly warehouseNames = signal<Map<number, string>>(new Map());
  protected readonly userOptions = signal<User[]>([]);
  protected readonly activeDatePreset = signal<ActionLogDatePreset | null>(null);
  protected readonly dateRangeError = signal<string | null>(null);

  protected readonly canViewAllUsers = computed(() =>
    isSuperAdmin(this.authService.currentUser()),
  );

  protected readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    actionFilter: new FormControl('', { nonNullable: true }),
    userId: new FormControl('', { nonNullable: true }),
    startDate: new FormControl('', { nonNullable: true }),
    endDate: new FormControl('', { nonNullable: true }),
  });

  protected readonly currentSearch = signal('');
  protected readonly currentActionFilter = signal('');
  protected readonly currentUserId = signal<number | null>(null);
  protected readonly currentStartDate = signal('');
  protected readonly currentEndDate = signal('');

  protected readonly actionFilterGroups = ACTION_LOG_FILTER_GROUPS;
  protected readonly datePresets = ACTION_LOG_DATE_PRESETS;
  protected readonly getActionLogLabel = getActionLogLabel;
  protected readonly getActionLogToneClass = getActionLogToneClass;

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
    title: 'Sin registros de auditoría',
    description:
      'Las acciones críticas del sistema aparecerán aquí cuando se realicen.',
  }));

  protected readonly hasActiveFilters = computed(
    () =>
      Boolean(this.currentSearch()) ||
      Boolean(this.currentActionFilter()) ||
      this.currentUserId() != null ||
      Boolean(this.currentStartDate()) ||
      Boolean(this.currentEndDate()),
  );

  protected readonly emptyFilterLabel = computed(() => {
    if (this.currentSearch()) return this.currentSearch();
    if (this.hasActiveFilters()) return 'filtros seleccionados';
    return '';
  });

  protected readonly tableColumns = signal<DataTableColumn<ActionLog>[]>([
    { key: 'creationTime', label: 'Fecha y hora', align: 'left', width: '168px' },
    { key: 'action', label: 'Acción', align: 'left', width: '180px' },
    { key: 'description', label: 'Detalle', align: 'left' },
    { key: 'user', label: 'Usuario', align: 'left', width: '200px' },
    { key: 'ipAddress', label: 'IP', align: 'left', width: '120px' },
  ]);

  ngOnInit(): void {
    this.loadContext();

    this.filtersForm.controls.search.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.currentSearch.set(value);
        this.resetPageAndLoad();
      });

    this.filtersForm.controls.actionFilter.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.currentActionFilter.set(value);
        this.resetPageAndLoad();
      });

    this.filtersForm.controls.userId.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const parsed = value ? Number(value) : null;
        this.currentUserId.set(parsed && parsed > 0 ? parsed : null);
        this.resetPageAndLoad();
      });

    this.filtersForm.controls.startDate.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.activeDatePreset.set(null);
        this.currentStartDate.set(value);
        this.tryLoadWithDateValidation();
      });

    this.filtersForm.controls.endDate.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.activeDatePreset.set(null);
        this.currentEndDate.set(value);
        this.tryLoadWithDateValidation();
      });
  }

  protected loadContext(): void {
    this.loading.set(true);

    const warehouses$ = this.warehouseService.getAll({ limit: 200, page: 1 });
    const logs$ = this.actionLogService.getAll(this.buildQueryParams());

    if (this.canViewAllUsers()) {
      forkJoin({
        warehouses: warehouses$,
        logs: logs$,
        users: this.userService.getAll({ limit: 200, page: 1 }),
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (result) => this.applyLoadedContext(result),
          error: () => this.handleLoadError(),
        });
      return;
    }

    forkJoin({ warehouses: warehouses$, logs: logs$ })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) =>
          this.applyLoadedContext({ ...result, users: null }),
        error: () => this.handleLoadError(),
      });
  }

  protected loadLogs(): void {
    this.loading.set(true);
    this.actionLogService
      .getAll(this.buildQueryParams())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.logs.set(res.data);
          this.total.set(res.paginate.total);
          this.totalPages.set(res.paginate.pages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show(
            'error',
            'No se pudo cargar el historial de acciones.',
          );
        },
      });
  }

  protected goToPage(p: number | '...'): void {
    if (p === '...' || p === this.page()) return;
    this.page.set(p);
    this.expandedLogId.set(null);
    this.loadLogs();
  }

  protected clearSearch(): void {
    this.filtersForm.controls.search.setValue('');
  }

  protected clearFilters(): void {
    this.activeDatePreset.set(null);
    this.dateRangeError.set(null);
    this.filtersForm.setValue({
      search: '',
      actionFilter: '',
      userId: '',
      startDate: '',
      endDate: '',
    });
  }

  protected applyDatePreset(preset: ActionLogDatePreset): void {
    const range = buildActionLogDateRange(preset);
    this.activeDatePreset.set(preset);
    this.dateRangeError.set(null);
    this.filtersForm.patchValue(
      {
        startDate: range.startDate,
        endDate: range.endDate,
      },
      { emitEvent: false },
    );
    this.currentStartDate.set(range.startDate);
    this.currentEndDate.set(range.endDate);
    this.resetPageAndLoad();
  }

  protected isDatePresetActive(preset: ActionLogDatePreset): boolean {
    return this.activeDatePreset() === preset;
  }

  protected toggleDetails(log: ActionLog): void {
    const hasExtra = this.hasExtraDetails(log);
    if (!hasExtra) return;

    this.expandedLogId.update((current) =>
      current === log.id ? null : log.id,
    );
  }

  protected isExpanded(logId: number): boolean {
    return this.expandedLogId() === logId;
  }

  protected hasExtraDetails(log: ActionLog): boolean {
    return Boolean(log.metadata) || Boolean(log.team) || log.warehouseId != null;
  }

  protected formatDateTime(value: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  protected userDisplayName(log: ActionLog): string {
    return log.user?.name?.trim() || log.userName?.trim() || 'Sistema';
  }

  protected userInitials(log: ActionLog): string {
    const name = this.userDisplayName(log);
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  protected warehouseLabel(warehouseId: number | null): string {
    if (warehouseId == null) return '—';
    return this.warehouseNames().get(warehouseId) ?? `Tienda #${warehouseId}`;
  }

  protected formatMetadata(metadata: Record<string, unknown> | null): string {
    if (!metadata) return '';
    try {
      return JSON.stringify(metadata, null, 2);
    } catch {
      return String(metadata);
    }
  }

  protected descriptionText(log: ActionLog): string {
    return log.description?.trim() || '—';
  }

  protected userOptionLabel(user: User): string {
    const name = [user.name, user.surname].filter(Boolean).join(' ').trim();
    if (name && user.email) {
      return `${name} (${user.email})`;
    }
    return name || user.username || user.email || `Usuario #${user.id}`;
  }

  private applyLoadedContext(result: {
    warehouses: { data: { id: number; name: string }[] };
    logs: { data: ActionLog[]; paginate: { total: number; pages: number } };
    users: UserListResponse | null;
  }): void {
    const names = new Map<number, string>();
    for (const warehouse of result.warehouses.data) {
      names.set(warehouse.id, warehouse.name);
    }
    this.warehouseNames.set(names);
    this.userOptions.set(result.users?.data ?? []);
    this.logs.set(result.logs.data);
    this.total.set(result.logs.paginate.total);
    this.totalPages.set(result.logs.paginate.pages);
    this.loading.set(false);
  }

  private handleLoadError(): void {
    this.loading.set(false);
    this.toastService.show(
      'error',
      'No se pudo cargar el historial de acciones.',
    );
  }

  private resetPageAndLoad(): void {
    this.page.set(1);
    this.expandedLogId.set(null);
    this.loadLogs();
  }

  private tryLoadWithDateValidation(): void {
    const startDate = this.filtersForm.controls.startDate.value;
    const endDate = this.filtersForm.controls.endDate.value;

    if (!isDateRangeValid(startDate, endDate)) {
      this.dateRangeError.set('La fecha final no puede ser anterior a la inicial.');
      return;
    }

    this.dateRangeError.set(null);
    this.resetPageAndLoad();
  }

  private buildQueryParams(): {
    limit: number;
    page: number;
    search?: string;
    action?: string;
    actionGroup?: string;
    startDate?: string;
    endDate?: string;
    userId?: number | null;
  } {
    const actionParts = encodeActionFilter(this.currentActionFilter());

    return {
      limit: this.limit(),
      page: this.page(),
      search: this.currentSearch(),
      ...actionParts,
      startDate: this.currentStartDate(),
      endDate: this.currentEndDate(),
      userId: this.canViewAllUsers() ? this.currentUserId() : null,
    };
  }
}

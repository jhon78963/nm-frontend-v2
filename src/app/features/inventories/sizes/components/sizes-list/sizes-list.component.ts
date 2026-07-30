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
} from '../../../../../shared/ui/data-table/data-table.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { TableActionsComponent } from '../../../../../shared/ui/table-actions/table-actions.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { SizeLookupService } from '../../data-access/size-lookup.service';
import { SizeService } from '../../data-access/size.service';
import { Size, SizeFilterState, SizeType } from '../../models/size.model';
import { SizeFormComponent } from '../size-form/size-form.component';

const FILTER_STORAGE_KEY = 'sizes_filter_state_v2';

const SIZE_TYPE_BADGE_CLASSES = [
  'bg-violet-50 text-violet-700 ring-violet-200',
  'bg-sky-50 text-sky-700 ring-sky-200',
  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'bg-amber-50 text-amber-800 ring-amber-200',
  'bg-rose-50 text-rose-700 ring-rose-200',
  'bg-indigo-50 text-indigo-700 ring-indigo-200',
] as const;

@Component({
  selector: 'app-sizes-list',
  imports: [
    ReactiveFormsModule,
    SizeFormComponent,
    ConfirmDialogComponent,
    DataTableComponent,
    TableActionButtonComponent,
    TableActionsComponent,
  ],
  templateUrl: './sizes-list.component.html',
})
export class SizesListComponent implements OnInit {
  private readonly sizeService = inject(SizeService);
  private readonly lookupService = inject(SizeLookupService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly sizes = signal<Size[]>([]);
  protected readonly sizeTypes = signal<SizeType[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly limit = signal(10);

  protected readonly formDialogOpen = signal(false);
  protected readonly editingSizeId = signal<number | null>(null);

  protected readonly deleteConfirmId = signal<number | null>(null);
  protected readonly deleting = signal(false);

  protected readonly selectedSizeTypeIds = signal<number[]>([]);

  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  protected readonly currentSearch = signal('');

  protected readonly sizeTypeLabelById = computed(() => {
    const map = new Map<number, string>();
    for (const type of this.sizeTypes()) {
      map.set(type.id, type.description);
    }
    return map;
  });

  protected readonly deleteTargetLabel = computed(() => {
    const id = this.deleteConfirmId();
    if (id === null) return '';
    const size = this.sizes().find((item) => item.id === id);
    return size?.description ?? '';
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

  protected readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.currentSearch().length > 0) count += 1;
    if (this.selectedSizeTypeIds().length > 0) count += 1;
    return count;
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

  protected readonly emptyState = computed<DataTableEmptyState>(() => {
    if (this.hasActiveFilters()) {
      return {
        icon: undefined as never,
        title: 'Sin resultados con los filtros actuales',
        description: 'Prueba con otro término o tipo de talla.',
        actionLabel: 'Limpiar filtros',
      };
    }
    return {
      icon: undefined as never,
      title: 'Aún no hay tallas registradas',
      description: 'Crea la primera talla para usarla en productos y POS.',
      actionLabel: 'Nueva talla',
    };
  });

  protected readonly tableColumns = signal<DataTableColumn<Size>[]>([
    { key: 'id', label: '#', align: 'left', width: '64px', className: 'w-16' },
    { key: 'size', label: 'Talla', align: 'left' },
    { key: 'type', label: 'Tipo', align: 'left' },
    { key: 'actions', label: 'Acciones', align: 'right', width: '100px' },
  ]);

  ngOnInit(): void {
    this.restoreFilters();
    this.loadSizeTypes();
    this.loadSizes();

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
        this.loadSizes();
      });
  }

  protected loadSizeTypes(): void {
    this.lookupService
      .getSizeTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => this.sizeTypes.set(types),
        error: () => {
          this.toastService.show('error', 'No se pudo cargar los tipos de talla.');
        },
      });
  }

  protected loadSizes(): void {
    this.loading.set(true);
    this.sizeService
      .getAll({
        limit: this.limit(),
        page: this.page(),
        search: this.currentSearch(),
        sizeTypeIds: this.selectedSizeTypeIds(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.sizes.set(res.data);
          this.total.set(res.paginate.total);
          this.totalPages.set(res.paginate.pages);
          this.loading.set(false);
          this.persistFilters();
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar la lista de tallas.');
        },
      });
  }

  protected goToPage(p: number | '...'): void {
    if (p === '...' || p === this.page()) return;
    this.page.set(p);
    this.persistFilters();
    this.loadSizes();
  }

  protected openCreate(): void {
    this.editingSizeId.set(null);
    this.formDialogOpen.set(true);
  }

  protected openEdit(id: number): void {
    this.editingSizeId.set(id);
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
    this.sizeService
      .delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteConfirmId.set(null);
          this.deleting.set(false);
          this.toastService.show('success', 'Talla eliminada correctamente.');
          if (this.sizes().length === 1 && this.page() > 1) {
            this.page.update((p) => p - 1);
          }
          this.loadSizes();
        },
        error: (err: unknown) => {
          this.deleting.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string'
              ? err
              : 'No se pudo eliminar la talla. Puede estar en uso en productos.',
          );
        },
      });
  }

  protected onFormSaved(message: string): void {
    this.formDialogOpen.set(false);
    this.toastService.show('success', message);
    this.loadSizes();
  }

  protected onFormClosed(): void {
    this.formDialogOpen.set(false);
  }

  protected clearSearch(): void {
    this.filterForm.controls.search.setValue('');
  }

  protected clearFilters(): void {
    this.filterForm.controls.search.setValue('');
    this.selectedSizeTypeIds.set([]);
    this.page.set(1);
    this.persistFilters();
    this.loadSizes();
  }

  protected toggleSizeType(id: number): void {
    const current = this.selectedSizeTypeIds();
    const next = current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id];

    this.selectedSizeTypeIds.set(next);
    this.page.set(1);
    this.persistFilters();
    this.loadSizes();
  }

  protected isSizeTypeSelected(id: number): boolean {
    return this.selectedSizeTypeIds().includes(id);
  }

  protected hasActiveFilters(): boolean {
    return (
      this.currentSearch().length > 0 || this.selectedSizeTypeIds().length > 0
    );
  }

  protected sizeTypeBadgeClass(typeLabel: string): string {
    const types = this.sizeTypes();
    const index = types.findIndex((type) => type.description === typeLabel);
    const paletteIndex =
      index >= 0 ? index % SIZE_TYPE_BADGE_CLASSES.length : 0;
    return `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${SIZE_TYPE_BADGE_CLASSES[paletteIndex]}`;
  }

  protected sizeInitial(description: string): string {
    const trimmed = description.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
  }

  protected onEmptyAction(): void {
    if (this.hasActiveFilters()) {
      this.clearFilters();
    } else {
      this.openCreate();
    }
  }

  private restoreFilters(): void {
    const saved = this.readFilterState();
    if (!saved) return;

    this.limit.set(saved.limit);
    this.page.set(saved.page);
    this.currentSearch.set(saved.search);
    this.selectedSizeTypeIds.set(saved.sizeTypeIds);

    if (saved.search) {
      this.filterForm.controls.search.setValue(saved.search, {
        emitEvent: false,
      });
    }
  }

  private persistFilters(): void {
    const state: SizeFilterState = {
      limit: this.limit(),
      page: this.page(),
      search: this.currentSearch(),
      sizeTypeIds: this.selectedSizeTypeIds(),
    };

    try {
      sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // sessionStorage may be unavailable in private mode
    }
  }

  private readFilterState(): SizeFilterState | null {
    try {
      const raw = sessionStorage.getItem(FILTER_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SizeFilterState;
      if (
        typeof parsed.limit !== 'number' ||
        typeof parsed.page !== 'number' ||
        typeof parsed.search !== 'string' ||
        !Array.isArray(parsed.sizeTypeIds)
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}

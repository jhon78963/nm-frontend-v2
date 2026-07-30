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
import { normalizeColorHash } from '../../data-access/color.adapter';
import { ColorService } from '../../data-access/color.service';
import { Color, ColorFilterState } from '../../models/color.model';
import { ColorFormComponent } from '../color-form/color-form.component';

const FILTER_STORAGE_KEY = 'colors_filter_state_v2';

@Component({
  selector: 'app-colors-list',
  imports: [
    ReactiveFormsModule,
    ColorFormComponent,
    ConfirmDialogComponent,
    DataTableComponent,
    TableActionButtonComponent,
    TableActionsComponent,
  ],
  templateUrl: './colors-list.component.html',
})
export class ColorsListComponent implements OnInit {
  private readonly colorService = inject(ColorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly colors = signal<Color[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly limit = signal(10);

  protected readonly formDialogOpen = signal(false);
  protected readonly editingColorId = signal<number | null>(null);

  protected readonly deleteConfirmId = signal<number | null>(null);
  protected readonly deleting = signal(false);

  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  protected readonly currentSearch = signal('');

  protected readonly deleteTargetLabel = computed(() => {
    const id = this.deleteConfirmId();
    if (id === null) return '';
    const color = this.colors().find((item) => item.id === id);
    return color?.description ?? '';
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
    title: 'Aún no hay colores registrados',
    description: 'Crea el primer color para usarlo en productos y variantes.',
    actionLabel: 'Nuevo color',
  }));

  protected readonly tableColumns = signal<DataTableColumn<Color>[]>([
    { key: 'id', label: '#', align: 'left', width: '64px', className: 'w-16' },
    { key: 'color', label: 'Color', align: 'left' },
    { key: 'sample', label: 'Muestra', align: 'left' },
    { key: 'hex', label: 'Hex', align: 'left' },
    { key: 'actions', label: 'Acciones', align: 'right', width: '100px' },
  ]);

  ngOnInit(): void {
    this.restoreFilters();
    this.loadColors();

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
        this.loadColors();
      });
  }

  protected loadColors(): void {
    this.loading.set(true);
    this.colorService
      .getAll({
        limit: this.limit(),
        page: this.page(),
        search: this.currentSearch(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.colors.set(res.data);
          this.total.set(res.paginate.total);
          this.totalPages.set(res.paginate.pages);
          this.loading.set(false);
          this.persistFilters();
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar la lista de colores.');
        },
      });
  }

  protected goToPage(p: number | '...'): void {
    if (p === '...' || p === this.page()) return;
    this.page.set(p);
    this.persistFilters();
    this.loadColors();
  }

  protected openCreate(): void {
    this.editingColorId.set(null);
    this.formDialogOpen.set(true);
  }

  protected openEdit(id: number): void {
    this.editingColorId.set(id);
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
    this.colorService
      .delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteConfirmId.set(null);
          this.deleting.set(false);
          this.toastService.show('success', 'Color eliminado correctamente.');
          if (this.colors().length === 1 && this.page() > 1) {
            this.page.update((p) => p - 1);
          }
          this.loadColors();
        },
        error: (err: unknown) => {
          this.deleting.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string'
              ? err
              : 'No se pudo eliminar el color. Puede estar en uso en productos.',
          );
        },
      });
  }

  protected onFormSaved(message: string): void {
    this.formDialogOpen.set(false);
    this.toastService.show('success', message);
    this.loadColors();
  }

  protected onFormClosed(): void {
    this.formDialogOpen.set(false);
  }

  protected clearSearch(): void {
    this.filterForm.controls.search.setValue('');
  }

  protected clearFilters(): void {
    this.filterForm.controls.search.setValue('');
    this.page.set(1);
    this.persistFilters();
    this.loadColors();
  }

  protected hasActiveFilters(): boolean {
    return this.currentSearch().length > 0;
  }

  protected displayHash(hash: string): string {
    return normalizeColorHash(hash);
  }

  private restoreFilters(): void {
    const saved = this.readFilterState();
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

  private persistFilters(): void {
    const state: ColorFilterState = {
      limit: this.limit(),
      page: this.page(),
      search: this.currentSearch(),
    };

    try {
      sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // sessionStorage may be unavailable in private mode
    }
  }

  private readFilterState(): ColorFilterState | null {
    try {
      const raw = sessionStorage.getItem(FILTER_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ColorFilterState;
      if (
        typeof parsed.limit !== 'number' ||
        typeof parsed.page !== 'number' ||
        typeof parsed.search !== 'string'
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}

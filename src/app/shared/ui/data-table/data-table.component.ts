import {
  Component,
  computed,
  input,
  output,
  contentChild,
  TemplateRef,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export { DtCellDirective } from './dt-cell.directive';
export { DtExpandCellComponent } from './dt-expand-cell.component';
export { DtRowDirective } from './dt-row.directive';

export interface DataTableColumn<T = unknown> {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  template?: TemplateRef<{ $implicit: T; index: number }>;
  /** Columna principal visible en mobile (ej. Venta, Usuario, Nombre). */
  mobilePrimary?: boolean;
}

export interface DataTableEmptyState {
  icon?: TemplateRef<void>;
  title: string;
  description: string;
  actionLabel?: string;
}

export interface DataTablePagination {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  pages: (number | '...')[];
}

export type DataTableTheme =
  | 'sky'
  | 'violet'
  | 'amber'
  | 'indigo'
  | 'emerald'
  | 'rose';

@Component({
  selector: 'app-data-table',
  imports: [CommonModule],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-data-table',
    '[class.dt-mobile-enabled]': 'mobileLayoutEnabled()',
  },
})
export class DataTableComponent<T> {
  columns = input<DataTableColumn<T>[]>([]);
  data = input.required<T[]>();
  loading = input(false);
  emptyState = input<DataTableEmptyState | null>(null);
  emptyIcon = contentChild<TemplateRef<void>>('emptyIcon');
  emptySearch = input<string>('');
  pagination = input<DataTablePagination | null>(null);
  theme = input<DataTableTheme>('sky');
  minWidth = input('640px');
  rowHoverEffect = input(true);
  showRowActions = input(true);
  ariaLabel = input('Tabla de datos');
  /** Activa filas compactas en mobile (expandir para ver detalle y acciones). */
  mobileCompact = input(true);

  private readonly expandedRowIndex = signal<number | null>(null);

  protected readonly mobileLayoutEnabled = computed(() => {
    if (!this.mobileCompact()) return false;
    return this.columns().some((col) => col.mobilePrimary);
  });

  protected readonly primaryColumn = computed(() => {
    const cols = this.columns();
    return cols.find((col) => col.mobilePrimary) ?? cols[0] ?? null;
  });

  protected readonly mobileColspan = computed(() => {
    const expandCol = this.mobileLayoutEnabled() ? 1 : 0;
    return this.columns().length + expandCol;
  });

  rowTemplate = contentChild<TemplateRef<{ $implicit: T; index: number }>>(
    'rowTemplate',
  );
  actionsTemplate = contentChild<TemplateRef<{ $implicit: T; index: number }>>(
    'actionsTemplate',
  );

  emptyAction = output<void>();
  clearSearch = output<void>();
  pageChange = output<number>();

  protected onPageChange(page: number | '...'): void {
    if (page === '...') return;
    this.pageChange.emit(page);
  }

  protected onClearSearch(): void {
    this.clearSearch.emit();
  }

  protected onEmptyAction(): void {
    this.emptyAction.emit();
  }

  isRowExpanded(index: number): boolean {
    return this.expandedRowIndex() === index;
  }

  toggleRow(index: number): void {
    this.expandedRowIndex.update((current) => (current === index ? null : index));
  }

  isPrimaryColumnKey(key: string): boolean {
    const primary = this.primaryColumn();
    return primary?.key === key;
  }

  isActionsColumnKey(key: string): boolean {
    return key === 'actions';
  }

  isPrimaryColumn(col: DataTableColumn<T>): boolean {
    return this.isPrimaryColumnKey(col.key);
  }

  isColumnHeaderVisibleOnMobile(col: DataTableColumn<T>): boolean {
    return this.isPrimaryColumn(col);
  }

  getColumnLabel(key: string): string {
    return this.columns().find((col) => col.key === key)?.label ?? key;
  }
}

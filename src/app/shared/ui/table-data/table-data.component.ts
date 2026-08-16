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

export interface TableDataColumn<T = unknown> {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  template?: TemplateRef<{ $implicit: T; index: number }>;
  /** Columna principal visible en mobile (ej. Venta, Usuario, Nombre). */
  mobilePrimary?: boolean;
}

export interface TableDataEmptyState {
  icon?: TemplateRef<void>;
  title: string;
  description: string;
  actionLabel?: string;
}

export interface TableDataPagination {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  pages: (number | '...')[];
}

export type TableDataTheme =
  | 'sky'
  | 'violet'
  | 'amber'
  | 'indigo'
  | 'emerald'
  | 'rose';

export type TableDataVariant = 'card' | 'plain' | 'embedded';

@Component({
  selector: 'app-table-data',
  imports: [CommonModule],
  templateUrl: './table-data.component.html',
  styleUrl: './table-data.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-table-data',
    '[class.dt-mobile-enabled]': 'mobileLayoutEnabled()',
  },
})
export class TableDataComponent<T> {
  columns = input<TableDataColumn<T>[]>([]);
  data = input.required<T[]>();
  loading = input(false);
  emptyState = input<TableDataEmptyState | null>(null);
  emptyIcon = contentChild<TemplateRef<void>>('emptyIcon');
  emptySearch = input<string>('');
  pagination = input<TableDataPagination | null>(null);
  theme = input<TableDataTheme>('sky');
  variant = input<TableDataVariant>('card');
  minWidth = input('640px');
  rowHoverEffect = input(true);
  showRowActions = input(true);
  ariaLabel = input('Tabla de datos');
  /** Clases opcionales para la fila de encabezado (`thead tr`). */
  headerRowClass = input('');
  /** Encabezado fijo al hacer scroll en contenedores con overflow. */
  stickyHeader = input(false);
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

  protected readonly resolveRowTrack = computed(
    () => this.rowTrack() ?? ((_item: T, index: number) => index),
  );

  protected readonly mobileColspan = computed(() => {
    const expandCol = this.mobileLayoutEnabled() ? 1 : 0;
    return this.columns().length + expandCol;
  });

  /** Identidad estable por fila; evita recrear filas y glitches de layout en tablas. */
  rowTrack = input<((item: T, index: number) => unknown) | null>(null);

  rowTemplate = contentChild<TemplateRef<{ $implicit: T; index: number }>>(
    'rowTemplate',
  );
  actionsTemplate = contentChild<TemplateRef<{ $implicit: T; index: number }>>(
    'actionsTemplate',
  );
  footerTemplate = contentChild<TemplateRef<void>>('footerTemplate');
  headerTemplate = contentChild<TemplateRef<void>>('headerTemplate');

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

  isPrimaryColumn(col: TableDataColumn<T>): boolean {
    return this.isPrimaryColumnKey(col.key);
  }

  isColumnHeaderVisibleOnMobile(col: TableDataColumn<T>): boolean {
    return this.isPrimaryColumn(col);
  }

  getColumnLabel(key: string): string {
    return this.columns().find((col) => col.key === key)?.label ?? key;
  }
}

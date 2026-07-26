import { Component, input, output, contentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DataTableColumn<T = unknown> {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  template?: TemplateRef<{ $implicit: T; index: number }>;
}

export interface DataTableEmptyState {
  icon: TemplateRef<void>;
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
}

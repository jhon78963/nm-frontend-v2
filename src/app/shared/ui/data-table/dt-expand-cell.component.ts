import { Component, computed, inject, input } from '@angular/core';
import { DataTableComponent } from './data-table.component';

@Component({
  selector: 'td[appDtExpandCell]',
  host: {
    class: 'dt-expand px-2 py-4 align-middle md:hidden',
  },
  template: `
    <button
      type="button"
      class="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      [attr.aria-expanded]="expanded()"
      [attr.aria-label]="expanded() ? 'Ocultar detalle' : 'Ver más detalle'"
      (click)="toggle($event)"
    >
      <svg
        class="h-4 w-4 transition-transform duration-200"
        [class.rotate-90]="expanded()"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  `,
})
export class DtExpandCellComponent {
  readonly rowIndex = input.required<number>({ alias: 'appDtExpandCell' });

  private readonly table = inject(DataTableComponent);

  protected readonly expanded = computed(() =>
    this.table.isRowExpanded(this.rowIndex()),
  );

  protected toggle(event: Event): void {
    event.stopPropagation();
    this.table.toggleRow(this.rowIndex());
  }
}

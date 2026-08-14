import { Component, computed, input, output } from '@angular/core';

export type ExportFormat = 'pdf' | 'excel';

@Component({
  selector: 'app-export-button',
  template: `
    <button
      type="button"
      class="export-btn"
      [class.export-btn--excel]="format() === 'excel'"
      [class.export-btn--loading]="isLoading()"
      [disabled]="isDisabled()"
      [attr.aria-busy]="isLoading()"
      (click)="onClick($event)"
    >
      @if (isLoading()) {
        <svg class="export-btn__spinner" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle
            class="export-btn__spinner-track"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="export-btn__spinner-indicator"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      } @else if (format() === 'excel') {
        <svg class="export-btn__icon export-btn__icon--excel" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18M10 3v18M14 3v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
        </svg>
      } @else {
        <svg class="export-btn__icon export-btn__icon--pdf" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      }

      <span>{{ label() }}</span>
    </button>
  `,
  styleUrl: './export-button.component.scss',
})
export class ExportButtonComponent {
  readonly label = input('Exportar');
  readonly format = input<ExportFormat>('pdf');
  readonly disabled = input(false);
  readonly isLoading = input(false);

  readonly clicked = output<void>();

  protected readonly isDisabled = computed(
    () => this.disabled() || this.isLoading(),
  );

  protected onClick(event: MouseEvent): void {
    if (this.isDisabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.clicked.emit();
  }
}

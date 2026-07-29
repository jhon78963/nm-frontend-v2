import { Component, computed, input, output } from '@angular/core';
import { TooltipComponent } from '../tooltip/tooltip.component';

export type TableActionTone =
  | 'neutral'
  | 'sky'
  | 'indigo'
  | 'violet'
  | 'amber'
  | 'emerald'
  | 'rose'
  | 'danger'
  | 'warning';

@Component({
  selector: 'app-table-action-button',
  imports: [TooltipComponent],
  templateUrl: './table-action-button.component.html',
  styleUrl: './table-action-button.component.scss',
})
export class TableActionButtonComponent {
  readonly label = input.required<string>();
  readonly ariaLabel = input<string>();
  readonly tone = input<TableActionTone>('neutral');
  readonly disabled = input(false);

  readonly clicked = output<MouseEvent>();

  protected readonly buttonClass = computed(() => `table-action-btn table-action-btn-${this.tone()}`);

  protected onClick(event: MouseEvent): void {
    if (this.disabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.clicked.emit(event);
  }
}

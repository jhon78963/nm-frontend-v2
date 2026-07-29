import { Component, computed, input } from '@angular/core';

export type TooltipPosition = 'top' | 'bottom';

@Component({
  selector: 'app-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrl: './tooltip.component.scss',
})
export class TooltipComponent {
  readonly label = input.required<string>();
  readonly position = input<TooltipPosition>('bottom');

  protected readonly hostClass = computed(() =>
    this.position() === 'top' ? 'tooltip-host tooltip-host-top' : 'tooltip-host tooltip-host-bottom',
  );
}

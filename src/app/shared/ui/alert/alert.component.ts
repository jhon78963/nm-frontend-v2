import { Component, input } from '@angular/core';

export type AlertVariant = 'error' | 'success' | 'info' | 'warning';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.scss',
})
export class AlertComponent {
  readonly variant = input<AlertVariant>('error');
  readonly title = input<string>();
  readonly message = input.required<string>();
}

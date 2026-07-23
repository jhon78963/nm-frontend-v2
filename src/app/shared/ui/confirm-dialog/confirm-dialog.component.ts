import { Component, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-confirm-dialog',
  imports: [ButtonComponent],
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input('Confirmar acción');
  readonly message = input('');
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly loading = input(false);
  readonly variant = input<'danger' | 'primary'>('danger');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected onConfirm(): void {
    if (!this.loading()) {
      this.confirmed.emit();
    }
  }

  protected onCancel(): void {
    if (!this.loading()) {
      this.cancelled.emit();
    }
  }
}

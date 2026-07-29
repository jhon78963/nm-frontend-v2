import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { ExpenseVoucherService } from '../../../data-access/expense-voucher.service';

@Component({
  selector: 'app-voucher-preview-dialog',
  templateUrl: './voucher-preview-dialog.component.html',
})
export class VoucherPreviewDialogComponent {
  private readonly voucherService = inject(ExpenseVoucherService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly open = input(false);
  readonly voucherPaths = input<string[]>([]);
  readonly initialIndex = input(0);

  readonly closed = output<void>();

  protected readonly currentIndex = signal(0);
  protected readonly previewUrl = signal('');
  protected readonly loading = signal(false);
  protected readonly isPdf = signal(false);

  private objectUrl: string | null = null;

  constructor() {
    effect(() => {
      if (!this.open()) {
        this.revokePreviewUrl();
        return;
      }

      const paths = this.voucherPaths();
      if (paths.length === 0) {
        return;
      }

      const index = Math.min(this.initialIndex(), paths.length - 1);
      this.loadPreviewAt(index);
    });
  }

  protected get paths(): string[] {
    return this.voucherPaths();
  }

  protected get hasMultiple(): boolean {
    return this.paths.length > 1;
  }

  protected onClose(): void {
    this.closed.emit();
  }

  protected onBackdropClick(): void {
    this.onClose();
  }

  protected prevPreview(): void {
    const index = this.currentIndex();
    if (index > 0) {
      this.loadPreviewAt(index - 1);
    }
  }

  protected nextPreview(): void {
    const index = this.currentIndex();
    if (index < this.paths.length - 1) {
      this.loadPreviewAt(index + 1);
    }
  }

  private loadPreviewAt(index: number): void {
    const path = this.paths[index];
    if (!path) {
      return;
    }

    this.revokePreviewUrl();
    this.currentIndex.set(index);
    this.isPdf.set(path.toLowerCase().endsWith('.pdf'));
    this.loading.set(true);

    this.voucherService
      .getVoucherPreview(path)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.objectUrl = URL.createObjectURL(blob);
          this.previewUrl.set(this.objectUrl);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar el comprobante.');
          this.onClose();
        },
      });
  }

  private revokePreviewUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.previewUrl.set('');
  }
}

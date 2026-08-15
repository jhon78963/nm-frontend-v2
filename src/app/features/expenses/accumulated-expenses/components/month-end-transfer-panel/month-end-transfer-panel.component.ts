import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { MoneyInputComponent } from '../../../../../shared/ui/money-input/money-input.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { AccumulatedExpenseService } from '../../data-access/accumulated-expense.service';
import { AccumulatedAccountSettings } from '../../models/accumulated-expense.model';
import {
  MonthEndTransferFormModel,
  MonthEndTransferPreview,
  MonthEndTransferRecord,
} from '../../models/month-end-transfer.model';

@Component({
  selector: 'app-month-end-transfer-panel',
  imports: [DecimalPipe, FormsModule, ButtonComponent, ConfirmDialogComponent, MoneyInputComponent],
  templateUrl: './month-end-transfer-panel.component.html',
})
export class MonthEndTransferPanelComponent {
  private readonly accumulatedService = inject(AccumulatedExpenseService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly viewMonth = input.required<Date>();
  readonly account = input.required<AccumulatedAccountSettings>();
  readonly visible = input(true);

  readonly transferCompleted = output<void>();

  protected readonly expanded = signal(false);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly confirmOpen = signal(false);

  protected readonly preview = signal<MonthEndTransferPreview | null>(null);
  protected readonly history = signal<MonthEndTransferRecord[]>([]);

  protected readonly transferModel = signal<MonthEndTransferFormModel>({
    cashAmount: 0,
    digitalAmount: 0,
    note: '',
  });

  protected readonly transferTotal = computed(() => {
    const model = this.transferModel();
    return Math.round((model.cashAmount + model.digitalAmount) * 100) / 100;
  });

  protected readonly balanceAfter = computed(() => {
    const current = this.account();
    const total = this.transferTotal();
    return {
      cash: Math.round((current.currentCash + this.transferModel().cashAmount) * 100) / 100,
      digital:
        Math.round((current.currentDigital + this.transferModel().digitalAmount) * 100) / 100,
      total: Math.round((current.currentTotal + total) * 100) / 100,
    };
  });

  protected readonly monthKey = computed(() => {
    const date = this.viewMonth();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${month}`;
  });

  constructor() {
    effect(() => {
      if (this.visible() && this.account().isInitialized) {
        this.loadPreview();
      }
    });

    effect(() => {
      if (this.visible() && this.account().isInitialized) {
        this.loadHistory();
      }
    });
  }

  protected toggleExpanded(): void {
    this.expanded.update((open) => !open);
  }

  protected loadPreview(): void {
    this.loading.set(true);

    this.accumulatedService
      .loadMonthEndTransferPreview(this.monthKey())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preview) => {
          this.preview.set(preview);
          if (!preview.alreadyTransferred) {
            this.transferModel.set({
              cashAmount: preview.suggested.cash,
              digitalAmount: preview.suggested.digital,
              note: '',
            });
          }
          this.loading.set(false);
        },
        error: () => {
          this.preview.set(null);
          this.loading.set(false);
        },
      });
  }

  protected loadHistory(): void {
    this.accumulatedService
      .listMonthEndTransfers(undefined, 6)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => this.history.set(rows),
        error: () => this.history.set([]),
      });
  }

  protected applySuggested(): void {
    const preview = this.preview();
    if (!preview) {
      return;
    }
    this.transferModel.set({
      cashAmount: preview.suggested.cash,
      digitalAmount: preview.suggested.digital,
      note: this.transferModel().note,
    });
  }

  protected onCashChange(value: number | null): void {
    this.transferModel.update((current) => ({
      ...current,
      cashAmount: value ?? 0,
    }));
  }

  protected onDigitalChange(value: number | null): void {
    this.transferModel.update((current) => ({
      ...current,
      digitalAmount: value ?? 0,
    }));
  }

  protected onNoteChange(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.transferModel.update((current) => ({ ...current, note: value }));
  }

  protected openConfirm(): void {
    if (this.transferTotal() <= 0) {
      this.toastService.show('info', 'Indica cuánto deseas traspasar en efectivo o digital.');
      return;
    }
    this.confirmOpen.set(true);
  }

  protected cancelConfirm(): void {
    this.confirmOpen.set(false);
  }

  protected submitTransfer(): void {
    const model = this.transferModel();
    this.submitting.set(true);

    this.accumulatedService
      .recordMonthEndTransfer({
        transfer_month: this.monthKey(),
        cash_amount: model.cashAmount,
        digital_amount: model.digitalAmount,
        note: model.note.trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.submitting.set(false);
          this.confirmOpen.set(false);
          this.preview.set(result.preview);
          this.transferModel.update((current) => ({ ...current, note: '' }));
          this.loadHistory();
          this.toastService.show(
            'success',
            `Traspaso registrado: S/ ${this.transferTotal().toFixed(2)} al fondo acumulado.`,
          );
          this.transferCompleted.emit();
        },
        error: (err: {
          error?: { errors?: Record<string, string[]>; message?: string };
        }) => {
          this.submitting.set(false);
          const detail =
            err?.error?.errors?.['transfer_month']?.[0] ??
            err?.error?.errors?.['cash_amount']?.[0] ??
            err?.error?.message ??
            'Revisa los montos e intenta de nuevo.';
          this.toastService.show('error', detail);
        },
      });
  }

  protected formatTransferDate(value: string | null): string {
    if (!value) {
      return '';
    }
    const parsed = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  }
}

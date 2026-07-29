import { DecimalPipe } from '@angular/common';
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
import {
  form,
  FormField,
} from '@angular/forms/signals';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { MoneyInputComponent } from '../../../../../shared/ui/money-input/money-input.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { formatYearMonth } from '../../data-access/accumulated-expense.adapter';
import { AccumulatedExpenseService } from '../../data-access/accumulated-expense.service';
import { AccumulatedAccountSettings } from '../../models/accumulated-expense.model';

interface InitFormModel {
  initialCash: number | null;
  initialDigital: number | null;
  trackingStartMonth: string;
}

interface BalanceFormModel {
  cashBalance: number | null;
  digitalBalance: number | null;
  trackingStartMonth: string;
}

@Component({
  selector: 'app-account-setup-panel',
  imports: [DecimalPipe, FormField, ButtonComponent, MoneyInputComponent],
  templateUrl: './account-setup-panel.component.html',
})
export class AccountSetupPanelComponent {
  private readonly accumulatedService = inject(AccumulatedExpenseService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly settings = input.required<AccumulatedAccountSettings>();
  readonly loading = input(false);

  readonly settingsChanged = output<void>();

  protected readonly expanded = signal(false);
  protected readonly saving = signal(false);

  protected readonly initModel = signal<InitFormModel>({
    initialCash: 0,
    initialDigital: 0,
    trackingStartMonth: `${new Date().getFullYear()}-01`,
  });

  protected readonly balanceModel = signal<BalanceFormModel>({
    cashBalance: 0,
    digitalBalance: 0,
    trackingStartMonth: `${new Date().getFullYear()}-01`,
  });

  protected readonly initForm = form(this.initModel);
  protected readonly balanceForm = form(this.balanceModel);

  protected readonly isInitialized = computed(() => this.settings().isInitialized);

  protected readonly currentBalance = computed(() => ({
    cash: this.settings().currentCash,
    digital: this.settings().currentDigital,
    total: this.settings().currentTotal,
  }));

  constructor() {
    effect(() => {
      this.settings();
      this.syncFormsFromSettings();
    });
  }

  protected syncFormsFromSettings(): void {
    const s = this.settings();
    const tracking = s.trackingStartMonth ?? `${new Date().getFullYear()}-01`;

    this.initModel.set({
      initialCash: s.initialCash,
      initialDigital: s.initialDigital,
      trackingStartMonth: tracking,
    });

    this.balanceModel.set({
      cashBalance: s.cashBalance,
      digitalBalance: s.digitalBalance,
      trackingStartMonth: tracking,
    });
  }

  protected toggleExpanded(): void {
    this.expanded.update((open) => !open);
    if (!this.expanded()) {
      return;
    }
    this.syncFormsFromSettings();
  }

  protected onInitTrackingMonthChange(value: string): void {
    this.initModel.update((current) => ({ ...current, trackingStartMonth: value }));
  }

  protected onBalanceTrackingMonthChange(value: string): void {
    this.balanceModel.update((current) => ({ ...current, trackingStartMonth: value }));
  }

  protected initializeAccount(): void {
    const model = this.initModel();
    const initialCash = model.initialCash ?? 0;
    const initialDigital = model.initialDigital ?? 0;

    this.saving.set(true);

    this.accumulatedService
      .initializeAccount({
        initial_cash: initialCash,
        initial_digital: initialDigital,
        tracking_start_month: model.trackingStartMonth,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toastService.show('success', 'Cuenta Acumulada inicializada correctamente.');
          this.settingsChanged.emit();
        },
        error: (err: { error?: { errors?: { initial_cash?: string[] } } }) => {
          this.saving.set(false);
          const detail =
            err?.error?.errors?.initial_cash?.[0] ?? 'No se pudo inicializar la cuenta.';
          this.toastService.show('error', detail);
        },
      });
  }

  protected saveBalanceSettings(): void {
    const model = this.balanceModel();

    this.saving.set(true);

    this.accumulatedService
      .updateAccountSettings({
        cash_balance: model.cashBalance ?? 0,
        digital_balance: model.digitalBalance ?? 0,
        tracking_start_month: model.trackingStartMonth,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toastService.show('success', 'Saldos de la Cuenta Acumulada actualizados.');
          this.settingsChanged.emit();
        },
        error: () => {
          this.saving.set(false);
          this.toastService.show('error', 'No se pudieron guardar los saldos.');
        },
      });
  }

  protected formatMonth(value: string): string {
    const [year, month] = value.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const formatted = new Intl.DateTimeFormat('es-PE', {
      month: 'long',
      year: 'numeric',
    }).format(date);
    return formatted.charAt(0).toLocaleUpperCase('es-PE') + formatted.slice(1);
  }

  protected defaultTrackingMonth(): string {
    return formatYearMonth(new Date(new Date().getFullYear(), 0, 1));
  }
}

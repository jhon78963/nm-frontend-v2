import {
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-money-input',
  templateUrl: './money-input.component.html',
  styleUrl: './money-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MoneyInputComponent),
      multi: true,
    },
  ],
})
export class MoneyInputComponent implements ControlValueAccessor {
  private static nextId = 0;

  private readonly numberFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  readonly label = input<string>();
  readonly errorMessage = input<string>();
  readonly currencySymbol = input('S/ ');

  protected readonly inputId = `app-money-input-${MoneyInputComponent.nextId++}`;
  protected readonly errorMessageId = `${this.inputId}-error`;

  protected readonly displayValue = signal('');
  protected readonly isDisabled = signal(false);

  protected readonly fieldClass = computed(() =>
    this.errorMessage() ? 'money-field money-field-error' : 'money-field',
  );

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: number | null): void {
    if (value == null || Number.isNaN(value)) {
      this.displayValue.set('');
      return;
    }

    this.displayValue.set(this.formatNumber(value));
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const cleaned = this.sanitizeNumericInput(target.value);

    if (target.value !== cleaned) {
      target.value = cleaned;
    }

    this.displayValue.set(cleaned);
    this.onChange(this.parseToNumber(cleaned));
  }

  protected onBlur(event: Event): void {
    const target = event.target as HTMLInputElement;
    const numericValue = this.parseToNumber(this.displayValue());

    if (numericValue === null) {
      target.value = '';
      this.displayValue.set('');
      this.onChange(null);
    } else {
      const formatted = this.formatNumber(numericValue);
      target.value = formatted;
      this.displayValue.set(formatted);
      this.onChange(numericValue);
    }

    this.onTouched();
  }

  protected onFocus(event: Event): void {
    const target = event.target as HTMLInputElement;
    const unformatted = target.value.replace(/,/g, '');

    target.value = unformatted;
    this.displayValue.set(unformatted);
  }

  private sanitizeNumericInput(value: string): string {
    let sanitized = value.replace(/[^\d.]/g, '');
    const dotIndex = sanitized.indexOf('.');

    if (dotIndex === -1) {
      return sanitized;
    }

    const beforeDot = sanitized.slice(0, dotIndex);
    const afterDot = sanitized.slice(dotIndex + 1).replace(/\./g, '');

    return `${beforeDot}.${afterDot}`;
  }

  private parseToNumber(value: string): number | null {
    const normalized = value.replace(/,/g, '').trim();

    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private formatNumber(value: number): string {
    return this.numberFormatter.format(value);
  }
}

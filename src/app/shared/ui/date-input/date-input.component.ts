import {
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-date-input',
  templateUrl: './date-input.component.html',
  styleUrl: './date-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateInputComponent),
      multi: true,
    },
  ],
})
export class DateInputComponent implements ControlValueAccessor {
  private static nextId = 0;

  readonly label = input<string>();
  readonly errorMessage = input<string>();
  readonly min = input<string>();
  readonly max = input<string>();

  protected readonly inputId = `app-date-input-${DateInputComponent.nextId++}`;
  protected readonly errorMessageId = `${this.inputId}-error`;

  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);

  protected readonly fieldClass = computed(() =>
    this.errorMessage() ? 'date-field date-field-error' : 'date-field',
  );

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | Date | null): void {
    if (value == null) {
      this.value.set('');
      return;
    }

    if (value instanceof Date) {
      this.value.set(this.toIsoDate(value));
      return;
    }

    this.value.set(value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected onDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
    this.onChange(target.value);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}

import {
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption<T = string | number> {
  label: string;
  value: T;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent<T extends string | number = string | number>
  implements ControlValueAccessor
{
  private static nextId = 0;

  readonly label = input<string>();
  readonly placeholder = input('Seleccionar…');
  readonly errorMessage = input<string>();
  readonly options = input<SelectOption<T>[]>([]);
  readonly disabled = input(false);

  protected readonly selectId = `app-select-${SelectComponent.nextId++}`;
  protected readonly errorMessageId = `${this.selectId}-error`;

  protected readonly value = signal<T | null>(null);
  protected readonly isDisabled = signal(false);

  protected readonly selectClass = computed(() =>
    this.errorMessage() ? 'select-field select-field-error' : 'select-field',
  );

  private onChange: (value: T | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: T | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected onSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const raw = target.value;

    if (raw === '') {
      this.value.set(null);
      this.onChange(null);
      return;
    }

    const option = this.options().find((item) => String(item.value) === raw);
    const nextValue = (option?.value ?? raw) as T;
    this.value.set(nextValue);
    this.onChange(nextValue);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  protected isFieldDisabled(): boolean {
    return this.disabled() || this.isDisabled();
  }
}

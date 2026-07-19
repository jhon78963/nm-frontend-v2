import {
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type InputType = 'text' | 'number' | 'password' | 'email';

@Component({
  selector: 'app-input',
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
})
export class InputComponent implements ControlValueAccessor {
  private static nextId = 0;

  readonly type = input<InputType>('text');
  readonly label = input<string>();
  readonly placeholder = input('');
  readonly errorMessage = input<string>();

  protected readonly inputId = `app-input-${InputComponent.nextId++}`;
  protected readonly errorMessageId = `${this.inputId}-error`;

  protected readonly showPassword = signal(false);
  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);

  protected readonly currentType = computed(() => {
    if (this.type() === 'password' && this.showPassword()) {
      return 'text';
    }

    return this.type();
  });

  protected readonly inputFieldClass = computed(() =>
    this.errorMessage() ? 'input-field input-field-error' : 'input-field',
  );

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | number | null): void {
    this.value.set(value == null ? '' : String(value));
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

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
    this.onChange(target.value);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  protected toggleShowPassword(): void {
    this.showPassword.update((visible) => !visible);
  }
}

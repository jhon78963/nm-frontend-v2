import { Component, computed, input, linkedSignal, output } from '@angular/core';

const PHONE_DIGITS = 9;

@Component({
  selector: 'app-phone-input',
  templateUrl: './phone-input.component.html',
  styleUrl: './phone-input.component.scss',
})
export class PhoneInputComponent {
  private static nextId = 0;

  readonly value = input('');
  readonly label = input('Teléfono');
  readonly placeholder = input('999 999 999');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly errorMessage = input('');

  readonly valueChange = output<string>();

  protected readonly inputId = `app-phone-${PhoneInputComponent.nextId++}`;
  protected readonly errorId = `${this.inputId}-error`;

  protected readonly displayValue = linkedSignal(() => this.formatDisplay(this.value()));

  protected readonly fieldClass = computed(() =>
    this.errorMessage() ? 'phone-field phone-field--error' : 'phone-field',
  );

  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, PHONE_DIGITS);
    const formatted = this.formatDisplay(digits);

    input.value = formatted;
    this.displayValue.set(formatted);
    this.valueChange.emit(digits);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (allowed.includes(event.key) || event.ctrlKey || event.metaKey) return;
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  private formatDisplay(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, PHONE_DIGITS);
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 9);
    return [p1, p2, p3].filter(Boolean).join(' ');
  }
}

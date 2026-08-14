import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'app-color-picker-input',
  templateUrl: './color-picker-input.component.html',
  styleUrl: './color-picker-input.component.scss',
})
export class ColorPickerInputComponent {
  private static nextId = 0;

  readonly value = input('#000000');
  readonly label = input('Color');
  readonly disabled = input(false);
  readonly errorMessage = input('');

  readonly valueChange = output<string>();

  protected readonly inputId = `app-color-picker-${ColorPickerInputComponent.nextId++}`;
  protected readonly pickerId = `${this.inputId}-picker`;
  protected readonly errorId = `${this.inputId}-error`;

  protected readonly pickerValue = linkedSignal(() => this.normalizeHex(this.value()));
  protected readonly textValue = linkedSignal(() => this.normalizeHex(this.value()));
  protected readonly isTextValid = signal(true);

  protected readonly fieldClass = computed(() =>
    this.errorMessage() ? 'color-text-field color-text-field--error' : 'color-text-field',
  );

  protected onPickerChange(event: Event): void {
    const hex = (event.target as HTMLInputElement).value;
    this.pickerValue.set(hex);
    this.textValue.set(hex);
    this.isTextValid.set(true);
    this.valueChange.emit(hex);
  }

  protected onTextInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.textValue.set(raw);

    const normalized = raw.startsWith('#') ? raw : `#${raw}`;
    if (HEX_REGEX.test(normalized)) {
      this.isTextValid.set(true);
      this.pickerValue.set(normalized);
      this.valueChange.emit(normalized);
    } else {
      this.isTextValid.set(false);
    }
  }

  private normalizeHex(hex: string): string {
    return HEX_REGEX.test(hex) ? hex : '#000000';
  }
}

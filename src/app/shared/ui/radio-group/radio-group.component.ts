import { Component, computed, input, output } from '@angular/core';

export interface RadioOption {
  value: unknown;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-radio-group',
  templateUrl: './radio-group.component.html',
  styleUrl: './radio-group.component.scss',
})
export class RadioGroupComponent {
  private static nextId = 0;

  readonly options = input.required<RadioOption[]>();
  readonly value = input<unknown>(null);
  readonly label = input('');
  readonly name = input.required<string>();
  readonly orientation = input<'horizontal' | 'vertical'>('vertical');
  readonly disabled = input(false);
  readonly errorMessage = input('');

  readonly valueChange = output<unknown>();

  protected readonly groupId = `app-radio-group-${RadioGroupComponent.nextId++}`;
  protected readonly labelId = `${this.groupId}-label`;
  protected readonly errorId = `${this.groupId}-error`;

  protected readonly listClass = computed(() =>
    this.orientation() === 'horizontal' ? 'radio-list radio-list--horizontal' : 'radio-list',
  );

  protected isChecked(option: RadioOption): boolean {
    return option.value === this.value();
  }

  protected isOptionDisabled(option: RadioOption): boolean {
    return this.disabled() || (option.disabled ?? false);
  }

  protected onSelect(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const option = this.options().find((o) => String(o.value) === raw);
    if (option) {
      this.valueChange.emit(option.value);
    }
  }
}

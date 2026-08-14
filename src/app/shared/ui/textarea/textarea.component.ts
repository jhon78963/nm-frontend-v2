import { Component, computed, input, linkedSignal, output } from '@angular/core';

@Component({
  selector: 'app-textarea',
  templateUrl: './textarea.component.html',
  styleUrl: './textarea.component.scss',
})
export class TextareaComponent {
  private static nextId = 0;

  readonly value = input('');
  readonly label = input('');
  readonly placeholder = input('');
  readonly rows = input(3);
  readonly maxLength = input<number | null>(null);
  readonly required = input(false);
  readonly disabled = input(false);
  readonly errorMessage = input('');
  readonly hint = input('');

  readonly valueChange = output<string>();

  protected readonly inputId = `app-textarea-${TextareaComponent.nextId++}`;
  protected readonly errorId = `${this.inputId}-error`;
  protected readonly hintId = `${this.inputId}-hint`;

  protected readonly internalValue = linkedSignal(() => this.value());

  protected readonly charCount = computed(() => this.internalValue().length);

  protected readonly fieldClass = computed(() =>
    this.errorMessage() ? 'textarea-field textarea-field--error' : 'textarea-field',
  );

  protected readonly describedBy = computed(() => {
    const parts: string[] = [];
    if (this.errorMessage()) parts.push(this.errorId);
    if (this.hint()) parts.push(this.hintId);
    return parts.length ? parts.join(' ') : null;
  });

  protected onInput(event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    this.internalValue.set(val);
    this.valueChange.emit(val);
  }
}

import { Component, computed, effect, ElementRef, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss',
})
export class CheckboxComponent {
  private static nextId = 0;

  readonly value = input(false);
  readonly label = input('');
  readonly indeterminate = input(false);
  readonly disabled = input(false);
  readonly errorMessage = input('');

  readonly valueChange = output<boolean>();

  protected readonly inputId = `app-checkbox-${CheckboxComponent.nextId++}`;
  protected readonly errorId = `${this.inputId}-error`;

  private readonly checkboxRef = viewChild<ElementRef<HTMLInputElement>>('checkboxEl');

  protected readonly wrapperClass = computed(() =>
    this.errorMessage() ? 'checkbox-wrapper checkbox-wrapper--error' : 'checkbox-wrapper',
  );

  private readonly _indeterminateEffect = effect(() => {
    const el = this.checkboxRef()?.nativeElement;
    if (el) {
      el.indeterminate = this.indeterminate();
    }
  });

  protected onChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.valueChange.emit(checked);
  }
}

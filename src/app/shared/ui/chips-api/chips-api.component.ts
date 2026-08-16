import { Component, computed, ElementRef, inject, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-chips-api',
  templateUrl: './chips-api.component.html',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class ChipsApiComponent {
  private static nextId = 0;

  private readonly elRef = inject(ElementRef);
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly placeholder = input('Agregar...');
  readonly label = input('');
  readonly minChars = input(2);
  readonly debounceMs = input(300);
  readonly displayFn = input<(item: unknown) => string>((item) => String(item));
  readonly disabled = input(false);
  readonly errorMessage = input('');
  readonly items = input<unknown[]>([]);
  readonly options = input<unknown[]>([]);
  readonly isLoading = input(false);

  readonly search = output<string>();
  readonly selected = output<unknown>();
  readonly removed = output<unknown>();

  protected readonly inputId = `app-chips-api-${ChipsApiComponent.nextId++}`;
  protected readonly listboxId = `${this.inputId}-listbox`;
  protected readonly errorId = `${this.inputId}-error`;

  protected readonly inputValue = signal('');
  protected readonly isOpen = signal(false);

  protected readonly showDropdown = computed(
    () => this.isOpen() && (this.isLoading() || this.options().length > 0 || this.inputValue().length >= this.minChars()),
  );

  protected readonly showNoResults = computed(
    () => !this.isLoading() && this.options().length === 0 && this.inputValue().length >= this.minChars(),
  );

  protected readonly fieldClass = computed(() =>
    this.errorMessage() ? 'chips-input chips-input--error' : 'chips-input',
  );

  protected displayItem(item: unknown): string {
    return this.displayFn()(item);
  }

  protected onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.inputValue.set(val);
    this.isOpen.set(val.length >= this.minChars());

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    if (val.length >= this.minChars()) {
      this.debounceTimer = setTimeout(() => {
        this.search.emit(val);
      }, this.debounceMs());
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.isOpen.set(false);
    } else if (event.key === 'Backspace' && this.inputValue() === '' && this.items().length > 0) {
      const last = this.items()[this.items().length - 1];
      this.removed.emit(last);
    } else if (event.key === 'ArrowDown' && this.showDropdown()) {
      event.preventDefault();
      const first = document.querySelector<HTMLElement>(`#${this.listboxId} [role="option"]`);
      first?.focus();
    }
  }

  protected selectOption(item: unknown): void {
    this.inputValue.set('');
    this.isOpen.set(false);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.selected.emit(item);
  }

  protected removeItem(item: unknown): void {
    this.removed.emit(item);
  }

  protected onOptionKeydown(event: KeyboardEvent, item: unknown): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectOption(item);
    } else if (event.key === 'Escape') {
      this.isOpen.set(false);
      document.getElementById(this.inputId)?.focus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      ((event.target as HTMLElement).nextElementSibling as HTMLElement | null)?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = (event.target as HTMLElement).previousElementSibling as HTMLElement | null;
      prev?.focus() ?? document.getElementById(this.inputId)?.focus();
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}

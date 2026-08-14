import { Component, computed, ElementRef, inject, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-autocomplete-api',
  templateUrl: './autocomplete-api.component.html',
  styleUrl: './autocomplete-api.component.scss',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class AutocompleteApiComponent {
  private static nextId = 0;

  private readonly elRef = inject(ElementRef);
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly placeholder = input('Buscar...');
  readonly label = input('');
  readonly minChars = input(2);
  readonly debounceMs = input(300);
  readonly displayFn = input<(item: unknown) => string>((item) => String(item));
  readonly disabled = input(false);
  readonly errorMessage = input('');
  readonly options = input<unknown[]>([]);
  readonly isLoading = input(false);

  readonly search = output<string>();
  readonly selected = output<unknown>();
  readonly cleared = output<void>();

  protected readonly inputId = `app-autocomplete-${AutocompleteApiComponent.nextId++}`;
  protected readonly listboxId = `${this.inputId}-listbox`;
  protected readonly errorId = `${this.inputId}-error`;

  protected readonly inputValue = signal('');
  protected readonly isOpen = signal(false);
  protected readonly hasSelection = signal(false);

  protected readonly showDropdown = computed(
    () => this.isOpen() && (this.isLoading() || this.options().length > 0 || this.inputValue().length >= this.minChars()),
  );

  protected readonly showNoResults = computed(
    () => !this.isLoading() && this.options().length === 0 && this.inputValue().length >= this.minChars(),
  );

  protected readonly fieldClass = computed(() =>
    this.errorMessage() ? 'ac-field ac-field--error' : 'ac-field',
  );

  protected onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.inputValue.set(val);
    this.hasSelection.set(false);
    this.isOpen.set(val.length >= this.minChars());

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    if (val.length >= this.minChars()) {
      this.debounceTimer = setTimeout(() => {
        this.search.emit(val);
      }, this.debounceMs());
    } else {
      if (val.length === 0) this.cleared.emit();
    }
  }

  protected selectOption(item: unknown): void {
    this.inputValue.set(this.displayFn()(item));
    this.hasSelection.set(true);
    this.isOpen.set(false);
    this.selected.emit(item);
  }

  protected clearInput(): void {
    this.inputValue.set('');
    this.hasSelection.set(false);
    this.isOpen.set(false);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.cleared.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.isOpen.set(false);
    } else if (event.key === 'ArrowDown' && this.showDropdown()) {
      event.preventDefault();
      const first = document.querySelector<HTMLElement>(`#${this.listboxId} [role="option"]`);
      first?.focus();
    }
  }

  protected onOptionKeydown(event: KeyboardEvent, item: unknown): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectOption(item);
    } else if (event.key === 'Escape') {
      this.isOpen.set(false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      (event.target as HTMLElement).nextElementSibling?.querySelector<HTMLElement>('[role="option"]') ??
        ((event.target as HTMLElement).nextElementSibling as HTMLElement)?.focus();
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

  protected displayItem(item: unknown): string {
    return this.displayFn()(item);
  }
}

import { Component, computed, ElementRef, inject, input, output, signal } from '@angular/core';

export interface MultiSelectOption {
  value: unknown;
  label: string;
}

@Component({
  selector: 'app-multi-select',
  templateUrl: './multi-select.component.html',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class MultiSelectComponent {
  private static nextId = 0;

  private readonly elRef = inject(ElementRef);

  readonly options = input.required<MultiSelectOption[]>();
  readonly value = input<unknown[]>([]);
  readonly placeholder = input('Seleccionar...');
  readonly label = input('');
  readonly disabled = input(false);
  readonly errorMessage = input('');

  readonly valueChange = output<unknown[]>();

  protected readonly triggerId = `app-multi-select-${MultiSelectComponent.nextId++}`;
  protected readonly listboxId = `${this.triggerId}-listbox`;
  protected readonly errorId = `${this.triggerId}-error`;

  protected readonly isOpen = signal(false);
  protected readonly searchQuery = signal('');

  protected readonly filteredOptions = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return q ? this.options().filter((o) => o.label.toLowerCase().includes(q)) : this.options();
  });

  protected readonly selectedLabels = computed(() =>
    this.options().filter((o) => this.value().includes(o.value)),
  );

  protected readonly triggerClass = computed(() => {
    let cls = 'ms-trigger';
    if (this.isOpen()) cls += ' ms-trigger--open';
    if (this.errorMessage()) cls += ' ms-trigger--error';
    if (this.disabled()) cls += ' ms-trigger--disabled';
    return cls;
  });

  protected toggleDropdown(): void {
    if (this.disabled()) return;
    this.isOpen.update((v) => !v);
    if (!this.isOpen()) this.searchQuery.set('');
  }

  protected isSelected(option: MultiSelectOption): boolean {
    return this.value().includes(option.value);
  }

  protected toggleOption(option: MultiSelectOption): void {
    const current = this.value();
    const next = this.isSelected(option)
      ? current.filter((v) => v !== option.value)
      : [...current, option.value];
    this.valueChange.emit(next);
  }

  protected removeChip(value: unknown, event: Event): void {
    event.stopPropagation();
    this.valueChange.emit(this.value().filter((v) => v !== value));
  }

  protected onSearchKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.isOpen.set(false);
      this.searchQuery.set('');
    }
  }

  protected onTriggerKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleDropdown();
    } else if (event.key === 'Escape') {
      this.isOpen.set(false);
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
      this.searchQuery.set('');
    }
  }
}

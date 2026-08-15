import {
  Directive,
  effect,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { DataTableComponent } from './data-table.component';

@Directive({
  selector: 'tr[appDtRow]',
})
export class DtRowDirective {
  readonly rowIndex = input.required<number>({ alias: 'dtRowIndex' });

  private readonly host = inject(ElementRef<HTMLTableRowElement>);
  private readonly table = inject(DataTableComponent);

  constructor() {
    this.host.nativeElement.classList.add('dt-row');

    effect(() => {
      const expanded = this.table.isRowExpanded(this.rowIndex());
      this.host.nativeElement.classList.toggle('dt-expanded', expanded);
    });
  }
}

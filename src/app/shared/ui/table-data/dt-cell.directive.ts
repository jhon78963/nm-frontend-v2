import {
  Directive,
  ElementRef,
  inject,
  input,
  OnInit,
  Renderer2,
} from '@angular/core';
import { TableDataComponent } from './table-data.component';

@Directive({
  selector: 'td[dtCell]',
})
export class DtCellDirective implements OnInit {
  readonly dtCell = input.required<string>({ alias: 'dtCell' });

  private readonly host = inject(ElementRef<HTMLTableCellElement>);
  private readonly renderer = inject(Renderer2);
  private readonly table = inject(TableDataComponent);

  ngOnInit(): void {
    const key = this.dtCell();
    const element = this.host.nativeElement;

    this.renderer.addClass(element, 'dt-cell');

    if (this.table.isPrimaryColumnKey(key)) {
      this.renderer.addClass(element, 'dt-primary');
      element.dataset['dtLabel'] = this.table.getColumnLabel(key);
      return;
    }

    if (this.table.isActionsColumnKey(key)) {
      this.renderer.addClass(element, 'dt-actions');
      element.dataset['dtLabel'] = 'Acciones';
      return;
    }

    this.renderer.addClass(element, 'dt-detail');
    element.dataset['dtLabel'] = this.table.getColumnLabel(key);
  }
}

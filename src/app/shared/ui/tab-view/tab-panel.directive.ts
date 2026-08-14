import { Directive, inject, input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[appTabPanel]',
})
export class TabPanelDirective {
  readonly tabId = input.required<string>();
  readonly template = inject(TemplateRef);
}

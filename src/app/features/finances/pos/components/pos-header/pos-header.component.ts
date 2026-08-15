import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { PosService } from '../../data-access/pos.service';

@Component({
  selector: 'app-pos-header',
  imports: [ReactiveFormsModule, InputComponent, TableActionButtonComponent],
  templateUrl: './pos-header.component.html',
})
export class PosHeaderComponent {
  protected readonly posService = inject(PosService);
  protected readonly dniControl = new FormControl('', { nonNullable: true });
  protected readonly isSearching = signal(false);

  private readonly dniInputHost = viewChild<ElementRef<HTMLElement>>('dniInputHost');

  protected async search(): Promise<void> {
    const dni = this.dniControl.value.trim();
    if (!dni || this.isSearching()) return;
    this.isSearching.set(true);
    await this.posService.searchCustomerByDni(dni);
    this.isSearching.set(false);
  }

  protected reset(): void {
    this.posService.currentCustomer.set(null);
    this.dniControl.setValue('');
    setTimeout(() => this.dniInputHost()?.nativeElement.querySelector('input')?.focus(), 0);
  }
}

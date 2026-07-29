import { Component, inject, signal } from '@angular/core';
import { PosService } from '../../data-access/pos.service';

@Component({
  selector: 'app-pos-header',
  templateUrl: './pos-header.component.html',
})
export class PosHeaderComponent {
  protected readonly posService = inject(PosService);
  protected readonly dniQuery = signal('');
  protected readonly isSearching = signal(false);

  protected onDniInput(event: Event): void {
    this.dniQuery.set((event.target as HTMLInputElement).value);
  }

  protected async search(): Promise<void> {
    const dni = this.dniQuery().trim();
    if (!dni || this.isSearching()) return;
    this.isSearching.set(true);
    await this.posService.searchCustomerByDni(dni);
    this.isSearching.set(false);
  }

  protected reset(): void {
    this.posService.currentCustomer.set(null);
    this.dniQuery.set('');
  }
}

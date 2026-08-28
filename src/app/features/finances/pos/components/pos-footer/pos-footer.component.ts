import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { PosService } from '../../data-access/pos.service';
import { DocumentType, PaymentEntry, PaymentMethodId } from '../../models/pos.model';

interface PaymentMethodState {
  id: PaymentMethodId;
  label: string;
  active: boolean;
  amount: number | null;
}

@Component({
  selector: 'app-pos-footer',
  imports: [DecimalPipe],
  templateUrl: './pos-footer.component.html',
  styleUrl: './pos-footer.component.scss',
})
export class PosFooterComponent {
  readonly hasNoWarehouse = input(false);

  protected readonly posService = inject(PosService);

  protected readonly docTypes = computed(() => {
    const fiscalEnabled = this.posService.fiscalConfig().electronicInvoicingEnabled;

    return [
      { label: 'Ticket', value: 'TICKET_INTERNO' as DocumentType, disabled: false },
      { label: 'Boleta', value: 'BOLETA' as DocumentType, disabled: !fiscalEnabled },
      { label: 'Factura', value: 'FACTURA' as DocumentType, disabled: !fiscalEnabled },
    ];
  });

  protected readonly methods = signal<PaymentMethodState[]>([
    { id: 'CASH', label: 'Efectivo', active: true, amount: null },
    { id: 'YAPE', label: 'Yape / Plin', active: false, amount: null },
    { id: 'CARD', label: 'Tarjeta', active: false, amount: null },
  ]);

  protected readonly activeMethods = computed(() => this.methods().filter((m) => m.active));
  protected readonly totalToPay = computed(() => this.posService.grandTotal());
  protected readonly currentSum = computed(() =>
    this.activeMethods().reduce((acc, m) => acc + (m.amount ?? 0), 0),
  );
  protected readonly remaining = computed(() => {
    if (this.activeMethods().length <= 1) return 0;
    return Math.max(0, this.totalToPay() - this.currentSum());
  });
  protected readonly isHybrid = computed(() => this.activeMethods().length > 1);
  protected readonly isCheckoutDisabled = computed(
    () =>
      this.hasNoWarehouse() ||
      this.posService.isLoading() ||
      (this.isHybrid() && this.remaining() > 0.1),
  );

  protected readonly paymentError = signal<string | null>(null);

  // Reset payment methods when cart is cleared; keep ticket when fiscal is off
  private readonly _cartWatcher = effect(
    () => {
      if (this.posService.cart().length === 0) {
        this.resetMethods();
      }
    },
    { allowSignalWrites: true },
  );

  private readonly _fiscalWatcher = effect(
    () => {
      const fiscalEnabled = this.posService.fiscalConfig().electronicInvoicingEnabled;
      if (!fiscalEnabled && this.posService.documentType() !== 'TICKET_INTERNO') {
        this.posService.documentType.set('TICKET_INTERNO');
      }
    },
    { allowSignalWrites: true },
  );

  protected selectDocType(value: DocumentType): void {
    const option = this.docTypes().find((o) => o.value === value);
    if (option?.disabled) return;
    this.posService.documentType.set(value);
  }

  protected resetMethods(): void {
    this.methods.update((list) => list.map((m) => ({ ...m, active: m.id === 'CASH', amount: null })));
    this.paymentError.set(null);
  }

  protected toggleMethod(id: PaymentMethodId): void {
    this.methods.update((list) =>
      list.map((m) => {
        if (m.id !== id) return m;
        const activeCount = list.filter((x) => x.active).length;
        // Prevent deactivating the last active method
        if (m.active && activeCount === 1) return m;
        return { ...m, active: !m.active, amount: null };
      }),
    );
    this.paymentError.set(null);
  }

  protected updateAmount(id: PaymentMethodId, event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.methods.update((list) => list.map((m) => (m.id === id ? { ...m, amount: value } : m)));
    this.paymentError.set(null);
  }

  protected handleCheckout(): void {
    if (this.hasNoWarehouse()) return;
    if (this.posService.isLoading()) return;

    const active = this.activeMethods();
    const total = this.totalToPay();

    if (this.posService.cart().length === 0) {
      this.posService.showToast('El carrito está vacío');
      return;
    }

    if (total <= 0) {
      void this.posService.processCheckoutWithPayments([
        { method: active[0]?.id ?? 'CASH', amount: 0 },
      ]);
      return;
    }

    let finalPayments: PaymentEntry[];

    if (active.length === 1) {
      finalPayments = [{ method: active[0].id, amount: total }];
    } else {
      if (Math.abs(this.currentSum() - total) > 0.1) {
        this.paymentError.set(`Los montos no cuadran. Faltan S/ ${this.remaining().toFixed(2)}`);
        return;
      }
      finalPayments = active.map((m) => ({ method: m.id, amount: m.amount ?? 0 }));
    }

    this.paymentError.set(null);
    void this.posService.processCheckoutWithPayments(finalPayments);
  }
}

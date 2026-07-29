import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CartItem,
  CheckoutResponse,
  Customer,
  DocumentType,
  ModalState,
  PaymentEntry,
  Product,
} from '../models/pos.model';
import {
  loadHtmlIntoIframe,
  prepareReceiptHtmlForPrint,
} from '../utils/receipt-print.util';

const DEFAULT_SERIE: Record<Exclude<DocumentType, 'TICKET_INTERNO'>, string> = {
  BOLETA: 'B001',
  FACTURA: 'F001',
};

@Service()
export class PosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/pos`;

  // ── State ─────────────────────────────────────────────────────────────────

  readonly cart = signal<CartItem[]>([]);
  readonly currentCustomer = signal<Customer | null>(null);
  readonly modalState = signal<ModalState>({
    isOpen: false,
    product: null,
    isEditing: false,
  });
  readonly toastMessage = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly documentType = signal<DocumentType>('TICKET_INTERNO');
  readonly lastSaleIdForReprint = signal<number | null>(null);

  readonly serie = computed<string>(() => {
    const type = this.documentType();
    return type === 'TICKET_INTERNO' ? '' : (DEFAULT_SERIE[type] ?? '');
  });

  readonly grandTotal = computed(() =>
    this.cart().reduce((acc, item) => acc + item.total, 0),
  );

  readonly totalItems = computed(() =>
    this.cart().reduce((acc, item) => acc + item.quantity, 0),
  );

  // ── API ───────────────────────────────────────────────────────────────────

  async searchProductBySku(sku: string): Promise<Product | undefined> {
    this.isLoading.set(true);
    try {
      return await firstValueFrom(
        this.http.get<Product>(`${this.base}/products`, {
          params: new HttpParams().set('sku', sku),
        }),
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        switch (error.status) {
          case 404:
            this.showToast('Producto no encontrado');
            break;
          case 403: {
            const raw = error.error?.message ?? error.error?.error;
            const msg = Array.isArray(raw) ? raw[0] : raw;
            this.showToast(
              (typeof msg === 'string' && msg.trim() ? msg : null) ??
                'Sin permisos o almacén asignado',
            );
            break;
          }
          default:
            this.showToast('Error al buscar el producto');
        }
      } else {
        this.showToast('Error de red o conexión');
      }
      return undefined;
    } finally {
      this.isLoading.set(false);
    }
  }

  async searchCustomerByDni(dni: string): Promise<boolean> {
    this.isLoading.set(true);
    try {
      const customer = await firstValueFrom(
        this.http.get<Customer>(`${this.base}/customers`, {
          params: new HttpParams().set('dni', dni),
        }),
      );
      this.currentCustomer.set(customer);
      this.showToast('Cliente encontrado');
      return true;
    } catch {
      this.showToast('Cliente no encontrado');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async processCheckoutWithPayments(payments: PaymentEntry[]): Promise<void> {
    if (this.cart().length === 0) {
      this.showToast('El carrito está vacío');
      return;
    }
    if (!payments.length) {
      this.showToast('Debe registrar al menos un método de pago');
      return;
    }

    this.isLoading.set(true);

    const payload = {
      document_type: this.documentType(),
      serie: this.serie() || undefined,
      customer: { id: this.currentCustomer()?.id },
      total: this.grandTotal(),
      payments,
      items: this.cart().map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        size: item.size,
        color: {
          product_size_id: item.color.product_size_id,
          color_id: item.color.color_id,
          colorName: item.color.colorName,
          hex: item.color.hex,
          inventory: item.color.inventory,
        },
      })),
    };

    try {
      const response = await firstValueFrom(
        this.http.post<CheckoutResponse>(`${this.base}/checkout`, payload),
      );

      if (response?.success) {
        this.clearCart();
        this.lastSaleIdForReprint.set(response.sale_id ?? null);
        this.showToast(`Venta #${response.sale_id} registrada`, 4_000);
        if (this.isMobileBrowser()) {
          this.showToast('Toca «Imprimir ticket» para el comprobante.', 6_000);
        } else if (response.sale_id) {
          await this.printTicket(response.sale_id);
        }
      } else {
        const raw = response?.message ?? response?.error;
        const msg = Array.isArray(raw) ? raw[0] : raw;
        this.showToast(
          typeof msg === 'string' && msg.trim() ? msg : 'La venta no pudo procesarse',
        );
      }
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse) {
        const raw = error.error?.message || error.error?.error;
        const msg = Array.isArray(raw) ? raw[0] : raw;
        if (typeof msg === 'string' && msg.trim()) {
          this.showToast(msg.trim());
          return;
        }
      }
      this.showToast('Error al procesar la venta');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Cart ──────────────────────────────────────────────────────────────────

  addItem(item: CartItem): void {
    this.cart.update((prev) => [...prev, item]);
    this.showToast('Producto agregado al carrito');
  }

  updateItem(updatedItem: CartItem): void {
    this.cart.update((items) =>
      items.map((i) => (i.cartId === updatedItem.cartId ? updatedItem : i)),
    );
    this.showToast('Ítem actualizado');
  }

  removeItem(cartId: number): void {
    this.cart.update((items) => items.filter((i) => i.cartId !== cartId));
  }

  updateQuantity(cartId: number, delta: number): void {
    this.cart.update((items) =>
      items.map((item) => {
        if (item.cartId !== cartId) return item;
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        const max = item.color.inventory?.available_quantity ?? 0;
        if (newQty > max) {
          this.showToast(`Stock máximo: ${max} unidades`);
          return item;
        }
        return { ...item, quantity: newQty, total: newQty * item.unitPrice };
      }),
    );
  }

  clearCart(): void {
    this.cart.set([]);
    this.currentCustomer.set(null);
    this.documentType.set('TICKET_INTERNO');
    this.modalState.set({ isOpen: false, product: null, isEditing: false });
    this.toastMessage.set(null);
    this.isLoading.set(false);
    this.lastSaleIdForReprint.set(null);
  }

  openAddModal(product: Product): void {
    this.modalState.set({ isOpen: true, product, isEditing: false });
  }

  openEditModal(item: CartItem): void {
    this.searchProductBySku(item.sku).then((prod) => {
      if (prod) {
        this.modalState.set({
          isOpen: true,
          product: prod,
          isEditing: true,
          editingCartItem: item,
        });
      }
    });
  }

  closeModal(): void {
    this.modalState.set({ isOpen: false, product: null, isEditing: false });
  }

  showToast(msg: string, durationMs = 2_500): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), durationMs);
  }

  // ── Print ─────────────────────────────────────────────────────────────────

  async printTicket(saleId: number, options?: { userGesture?: boolean }): Promise<void> {
    if (options?.userGesture) {
      await this.printTicketViaNewTab(saleId);
      return;
    }
    try {
      const html = await firstValueFrom(
        this.http.get(`${this.base}/sales/${saleId}/ticket`, { responseType: 'text' }),
      );
      await this.printViaFullscreenIframe(prepareReceiptHtmlForPrint(html, false));
    } catch {
      this.showToast('Venta registrada. Toca «Imprimir ticket» para reintentar.');
    }
  }

  async reprintLastTicket(): Promise<void> {
    const saleId = this.lastSaleIdForReprint();
    if (saleId != null) {
      await this.printTicket(saleId, { userGesture: true });
    }
  }

  private async printTicketViaNewTab(saleId: number): Promise<void> {
    const tab = window.open('', '_blank');
    if (!tab) {
      this.showToast('Permite ventanas emergentes o toca «Imprimir ticket» nuevamente.');
      return;
    }
    tab.document.open();
    tab.document.write('<!DOCTYPE html><html><body>Cargando ticket…</body></html>');
    tab.document.close();

    try {
      const html = await firstValueFrom(
        this.http.get(`${this.base}/sales/${saleId}/ticket`, { responseType: 'text' }),
      );
      const printDoc = prepareReceiptHtmlForPrint(html, true);
      tab.document.open();
      tab.document.write(printDoc);
      tab.document.close();
    } catch {
      tab.close();
      this.showToast('No se pudo cargar el ticket. Reintenta.');
    }
  }

  private isMobileBrowser(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }

  private printViaFullscreenIframe(fullHtml: string): Promise<void> {
    return new Promise((resolve) => {
      this.teardownPrintSession();

      const suppressedNodes: Array<{ node: HTMLElement; display: string }> = [];

      const suppressAppChrome = () => {
        Array.from(document.body.children).forEach((node) => {
          const el = node as HTMLElement;
          if (el.id === 'pos-ticket-print-frame') return;
          suppressedNodes.push({ node: el, display: el.style.display });
          el.style.setProperty('display', 'none', 'important');
        });
        document.body.style.setProperty('overflow', 'hidden', 'important');
        document.body.style.setProperty('background', '#ffffff', 'important');
        document.documentElement.style.setProperty('background', '#ffffff', 'important');
      };

      const restoreAppChrome = () => {
        suppressedNodes.forEach(({ node, display }) => {
          node.style.display = display;
        });
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('background');
        document.documentElement.style.removeProperty('background');
      };

      const iframe = document.createElement('iframe');
      iframe.id = 'pos-ticket-print-frame';
      iframe.setAttribute('title', 'Ticket de venta');
      iframe.setAttribute(
        'style',
        'position:fixed;inset:0;width:100%;height:100%;border:0;margin:0;padding:0;z-index:2147483647;background:#fff',
      );

      suppressAppChrome();
      document.body.appendChild(iframe);
      iframe.src = 'about:blank';

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        iframe.remove();
        restoreAppChrome();
        resolve();
      };

      iframe.onload = () => {
        const printWindow = loadHtmlIntoIframe(iframe, fullHtml);
        if (!printWindow) {
          this.showToast('Toca «Imprimir ticket» para reintentar.');
          finish();
          return;
        }
        printWindow.addEventListener('afterprint', finish, { once: true });
        requestAnimationFrame(() => {
          setTimeout(() => {
            try {
              printWindow.focus();
              printWindow.print();
            } catch {
              this.showToast('Toca «Imprimir ticket» para reintentar.');
              finish();
              return;
            }
            setTimeout(finish, 15_000);
          }, 500);
        });
      };
    });
  }

  private teardownPrintSession(): void {
    document.getElementById('pos-ticket-print-frame')?.remove();
    document.body.classList.remove('pos-printing-ticket');
  }
}

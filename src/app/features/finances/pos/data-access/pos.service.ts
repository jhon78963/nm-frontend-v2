import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../auth/data-access/auth.service';
import { adaptCheckoutToReceiptData } from './pos-receipt.adapter';
import { adaptPosSearchResponse } from './pos-product.adapter';
import {
  CartItem,
  CheckoutResponse,
  Customer,
  DocumentType,
  ModalState,
  PaymentEntry,
  PosFiscalConfig,
  Product,
  ReceiptData,
} from '../models/pos.model';
import { ReceiptPrinter } from '../utils/receipt-printer';

const DEFAULT_FISCAL_CONFIG: PosFiscalConfig = {
  tenantElectronicInvoicingEnabled: false,
  warehouseElectronicInvoicingEnabled: false,
  electronicInvoicingEnabled: false,
  series: { boleta: null, factura: null },
};

const AUTO_PRINT_STORAGE_KEY = 'pos-auto-print';
const DEFAULT_WAREHOUSE_NAME = 'Novedades Maritex';

@Service()
export class PosService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly base = `${environment.apiUrl}`;

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
  readonly fiscalConfig = signal<PosFiscalConfig>({ ...DEFAULT_FISCAL_CONFIG });
  readonly lastSaleIdForReprint = signal<string | null>(null);
  readonly receiptPreviewOpen = signal(false);
  readonly pendingReceiptData = signal<ReceiptData | null>(null);
  readonly pendingReceiptHtml = signal<string | null>(null);

  readonly serie = computed<string>(() => {
    const type = this.documentType();
    const config = this.fiscalConfig();
    if (type === 'BOLETA') return config.series.boleta ?? 'B001';
    if (type === 'FACTURA') return config.series.factura ?? 'F001';
    return '';
  });

  readonly grandTotal = computed(() =>
    this.cart().reduce((acc, item) => acc + item.total, 0),
  );

  readonly totalItems = computed(() =>
    this.cart().reduce((acc, item) => acc + item.quantity, 0),
  );

  // ── API ───────────────────────────────────────────────────────────────────

  async loadFiscalConfig(): Promise<void> {
    const warehouseId = this.authService.currentUser()?.warehouseId;
    if (!warehouseId) {
      this.fiscalConfig.set({ ...DEFAULT_FISCAL_CONFIG });
      return;
    }

    try {
      const raw = await firstValueFrom(
        this.http.get<unknown>(`${this.base}/pos/fiscal-config`),
      );
      this.fiscalConfig.set(this.adaptFiscalConfig(raw));
    } catch {
      this.fiscalConfig.set({ ...DEFAULT_FISCAL_CONFIG });
    }
  }

  async searchProductBySku(sku: string): Promise<Product | undefined> {
    this.isLoading.set(true);
    try {
      const raw = await firstValueFrom(
        this.http.get<unknown>(`${this.base}/products/pos-search`, {
          params: new HttpParams().set('q', sku),
        }),
      );
      const warehouseId = this.authService.currentUser()?.warehouseId ?? '';
      const product = adaptPosSearchResponse(raw, sku, warehouseId);
      if (!product) {
        this.showToast('Producto no encontrado');
        return undefined;
      }
      return product;
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
      const raw = await firstValueFrom(
        this.http.get<unknown>(`${this.base}/customers/pos-search`, {
          params: new HttpParams().set('q', dni),
        }),
      );
      const customer = this.adaptPosCustomer(raw);
      if (!customer) {
        this.showToast('Cliente no encontrado');
        return false;
      }
      this.currentCustomer.set(customer);
      this.showToast('Cliente encontrado');
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        const body = error.error as Record<string, unknown> | null;
        const code = typeof body?.['code'] === 'string' ? body['code'] : '';
        const message = typeof body?.['message'] === 'string' ? body['message'] : '';

        if (code === 'SUNAT_TIMEOUT' || code === 'SUNAT_UNAVAILABLE') {
          this.showToast(
            message || 'El servicio de SUNAT está inestable. Reintente en un momento.',
          );
          return false;
        }

        if (code === 'DOC_NOT_FOUND') {
          this.showToast(message || 'Cliente no encontrado');
          return false;
        }
      }

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

    const docType = this.documentType();
    const customer = this.currentCustomer();
    if (docType === 'FACTURA') {
      const docTypeValue = (customer?.document_type ?? '').toUpperCase();
      const docNumber = (customer?.document_number ?? customer?.dni ?? '').trim();
      if (!customer) {
        this.showToast('Para Factura debe buscar un cliente con RUC');
        return;
      }
      if (docTypeValue !== 'RUC' || docNumber.length !== 11) {
        this.showToast('El cliente debe tener un RUC válido de 11 dígitos');
        return;
      }
    } else if (docType === 'BOLETA' && customer) {
      const docTypeValue = (customer.document_type ?? '').toUpperCase();
      if (docTypeValue === 'RUC') {
        this.showToast('Cliente con RUC: use Factura en lugar de Boleta');
        return;
      }
    }

    this.isLoading.set(true);

    const checkoutSnapshot = {
      cart: [...this.cart()],
      customer: this.currentCustomer(),
      documentType: this.documentType(),
      payments,
    };

    const user = this.authService.currentUser();
    const warehouseId = user?.warehouseId ?? '';

    const docTypeRaw = this.documentType();
    const documentType =
      docTypeRaw === 'TICKET_INTERNO' ? 'TICKET' : docTypeRaw;

    const payload = {
      warehouseId,
      documentType,
      customerId: this.currentCustomer()?.id ?? undefined,
      payments: payments.map((p) => ({
        method: p.method,
        amount: p.amount,
      })),
      items: this.cart().map((item) => ({
        productSizeId: item.color.product_size_id,
        colorId: item.color.color_id || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    };

    try {
      const response = await firstValueFrom(
        this.http.post<{ sale: { id: string; code: string; totalAmount: number }; ticketUrl?: string }>(
          `${this.base}/checkout`,
          payload,
        ),
      );

      const saleId = response?.sale?.id ?? null;
      this.lastSaleIdForReprint.set(saleId);
      this.clearCart();
      this.showToast(`Venta #${response?.sale?.code ?? saleId} registrada`, 4_000);

      if (saleId != null) {
        const legacyResponse: CheckoutResponse = {
          success: true,
          sale_id: saleId,
          ticket_url: response.ticketUrl,
        };
        await this.handleSuccessfulCheckout(saleId, legacyResponse, checkoutSnapshot);
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

  removeItem(cartId: string): void {
    this.cart.update((items) => items.filter((i) => i.cartId !== cartId));
  }

  updateQuantity(cartId: string, delta: number): void {
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

  // ── Receipt preview & print ───────────────────────────────────────────────

  isAutoPrintEnabled(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(AUTO_PRINT_STORAGE_KEY) === 'true';
  }

  setAutoPrintEnabled(enabled: boolean): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(AUTO_PRINT_STORAGE_KEY, String(enabled));
  }

  closeReceiptPreview(): void {
    this.receiptPreviewOpen.set(false);
    this.pendingReceiptData.set(null);
    this.pendingReceiptHtml.set(null);
  }

  async reprintLastTicket(): Promise<void> {
    const saleId = this.lastSaleIdForReprint();
    if (saleId == null) return;

    if (this.isMobileBrowser()) {
      await this.printTicket(saleId, { userGesture: true });
      return;
    }

    try {
      const html = await this.fetchTicketHtml(saleId);
      const receiptData = this.buildFallbackReceiptData(saleId);
      this.pendingReceiptData.set(receiptData);
      this.pendingReceiptHtml.set(html);
      this.receiptPreviewOpen.set(true);
    } catch {
      this.showToast('No se pudo cargar el ticket. Reintenta.');
    }
  }

  async printTicket(saleId: string, options?: { userGesture?: boolean }): Promise<void> {
    try {
      const html = await this.fetchTicketHtml(saleId);
      if (options?.userGesture && this.isMobileBrowser()) {
        await this.printTicketViaNewTab(html);
        return;
      }
      ReceiptPrinter.printFromHtml(html, 'thermal-80mm');
    } catch {
      this.showToast('Venta registrada. Toca «Imprimir ticket» para reintentar.');
    }
  }

  private async handleSuccessfulCheckout(
    saleId: string,
    response: CheckoutResponse,
    snapshot: {
      cart: CartItem[];
      customer: Customer | null;
      documentType: DocumentType;
      payments: PaymentEntry[];
    },
  ): Promise<void> {
    const receiptData = adaptCheckoutToReceiptData({
      saleId,
      invoiceNumber: response.invoice_number,
      documentType: snapshot.documentType,
      cart: snapshot.cart,
      customer: snapshot.customer,
      payments: snapshot.payments,
      cashierName: this.resolveCashierName(),
      warehouseName: DEFAULT_WAREHOUSE_NAME,
      warehouseAddress: '',
      warehouseRuc: '',
    });

    const backendHtml = await this.fetchTicketHtml(saleId).catch(() => null);

    if (this.shouldAutoPrint()) {
      if (backendHtml) {
        ReceiptPrinter.printFromHtml(backendHtml, 'thermal-80mm');
      } else {
        ReceiptPrinter.print(receiptData, 'thermal-80mm');
      }
      return;
    }

    if (this.isMobileBrowser()) {
      this.showToast('Toca «Imprimir ticket» para el comprobante.', 6_000);
    }

    this.pendingReceiptData.set(receiptData);
    this.pendingReceiptHtml.set(backendHtml);
    this.receiptPreviewOpen.set(true);
  }

  private shouldAutoPrint(): boolean {
    return this.isAutoPrintEnabled() && !this.isMobileBrowser();
  }

  private resolveCashierName(): string {
    const user = this.authService.currentUser();
    if (!user) return 'Cajero';
    const fullName = `${user.name} ${user.surname}`.trim();
    return fullName || user.username;
  }

  private buildFallbackReceiptData(saleId: string): ReceiptData {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');

    return {
      receiptNumber: `TKT-${String(saleId).padStart(6, '0')}`,
      documentType: 'ticket',
      date: `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      cashierName: this.resolveCashierName(),
      warehouseName: DEFAULT_WAREHOUSE_NAME,
      warehouseAddress: '',
      warehouseRuc: '',
      customerName: null,
      customerDocument: null,
      items: [],
      subtotal: 0,
      igv: 0,
      total: 0,
      payments: [],
      change: 0,
    };
  }

  private fetchTicketHtml(saleId: string): Promise<string> {
    return firstValueFrom(
      this.http.get(`${this.base}/tickets/${saleId}`, { responseType: 'text' }),
    );
  }

  private async printTicketViaNewTab(html: string): Promise<void> {
    const tab = window.open('', '_blank');
    if (!tab) {
      this.showToast('Permite ventanas emergentes o toca «Imprimir ticket» nuevamente.');
      return;
    }

    tab.document.open();
    tab.document.write(
      ReceiptPrinter.wrapBackendHtml(html, 'thermal-80mm').replace(
        '</body>',
        `<script>window.addEventListener('load',function(){setTimeout(function(){window.focus();window.print();},400);});</script></body>`,
      ),
    );
    tab.document.close();
  }

  private isMobileBrowser(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }

  private adaptFiscalConfig(raw: unknown): PosFiscalConfig {
    const row = (raw ?? {}) as Record<string, unknown>;
    const series = (row['series'] ?? {}) as Record<string, unknown>;

    return {
      tenantElectronicInvoicingEnabled: Boolean(
        row['tenantElectronicInvoicingEnabled'] ?? row['tenant_electronic_invoicing_enabled'],
      ),
      warehouseElectronicInvoicingEnabled: Boolean(
        row['warehouseElectronicInvoicingEnabled'] ?? row['warehouse_electronic_invoicing_enabled'],
      ),
      electronicInvoicingEnabled: Boolean(
        row['electronicInvoicingEnabled'] ?? row['electronic_invoicing_enabled'],
      ),
      series: {
        boleta: typeof series['boleta'] === 'string' ? series['boleta'] : null,
        factura: typeof series['factura'] === 'string' ? series['factura'] : null,
      },
    };
  }

  private adaptPosCustomer(raw: unknown): Customer | null {
    if (!raw || typeof raw !== 'object') return null;

    const row = raw as Record<string, unknown>;
    const id = row['id'] != null ? String(row['id']) : '';
    const documentNumber = String(
      row['document_number'] ?? row['documentNumber'] ?? row['dni'] ?? '',
    ).trim();
    const documentType = String(
      row['document_type'] ?? row['documentType'] ?? 'DNI',
    ).trim();
    const name = String(row['name'] ?? '').trim();

    if (!id || !documentNumber || !name) return null;

    return {
      id,
      dni: documentNumber,
      name,
      document_type: documentType,
      document_number: documentNumber,
    };
  }
}

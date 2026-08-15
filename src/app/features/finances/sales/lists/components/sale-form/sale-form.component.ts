import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { AlertComponent } from '../../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { SelectOption } from '../../../../../../shared/ui/select/select.component';
import {
  formatDateTime,
  parseDatetimeLocalValue,
  toDatetimeLocalValue,
} from '../../../../cash-movements/data-access/cash-movement.adapter';
import { SaleService } from '../../data-access/sale.service';
import { normalizePaymentMethod } from '../../data-access/sale.adapter';
import {
  PaymentMethod,
  ProductVariantSelection,
  SaleDetail,
  SaleItem,
  SalePayment,
  SaleUpdatePayload,
} from '../../models/sale.model';
import { SaleProductSelectorComponent } from '../product-selector/product-selector.component';

interface ItemRow extends SaleItem {
  localId: string;
}

interface PaymentRow extends SalePayment {
  localId: string;
}

@Component({
  selector: 'app-sale-form',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    AlertComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    SaleProductSelectorComponent,
  ],
  templateUrl: './sale-form.component.html',
})
export class SaleFormComponent implements OnInit {
  private readonly saleService = inject(SaleService);
  private readonly destroyRef = inject(DestroyRef);

  readonly saleId = input.required<number | null>();
  readonly readOnly = input(false);

  readonly saved = output<string>();
  readonly closed = output<void>();

  protected readonly loadingData = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');

  protected readonly saleMeta = signal<Pick<
    SaleDetail,
    'id' | 'code' | 'status' | 'customer'
  > | null>(null);

  protected readonly items = signal<ItemRow[]>([]);
  protected readonly payments = signal<PaymentRow[]>([]);

  protected readonly productSelectorOpen = signal(false);
  protected readonly productSelectorMode = signal<'add' | 'replace'>('add');
  protected readonly replaceItemIndex = signal<number | null>(null);
  protected readonly removeItemIndex = signal<number | null>(null);

  protected readonly dateForm = new FormGroup({
    creationDateTime: new FormControl('', { nonNullable: true }),
  });

  protected readonly paymentMethodOptions: SelectOption<PaymentMethod>[] = [
    { label: 'Efectivo', value: 'CASH' },
    { label: 'Yape', value: 'YAPE' },
    { label: 'Tarjeta', value: 'CARD' },
  ];

  protected readonly isCanceled = computed(
    () => this.saleMeta()?.status === 'CANCELED',
  );

  protected readonly isEditable = computed(
    () => !this.readOnly() && !this.isCanceled(),
  );

  protected readonly calculatedTotal = computed(() =>
    this.items().reduce((acc, item) => acc + item.quantity * item.unitPrice, 0),
  );

  protected readonly calculatedPayments = computed(() =>
    this.payments().reduce((acc, pay) => acc + pay.amount, 0),
  );

  protected readonly paymentDifference = computed(
    () => this.calculatedTotal() - this.calculatedPayments(),
  );

  protected readonly isBalanced = computed(
    () => Math.abs(this.paymentDifference()) < 0.1,
  );

  protected readonly canSave = computed(
    () =>
      this.isEditable() &&
      this.items().length > 0 &&
      this.isBalanced() &&
      !this.saving(),
  );

  protected readonly panelTitle = computed(() => {
    if (this.readOnly() || this.isCanceled()) return 'Detalle de venta';
    return 'Editar venta';
  });

  ngOnInit(): void {
    const id = this.saleId();
    if (id == null) {
      this.loadError.set('Venta no encontrada.');
      this.loadingData.set(false);
      return;
    }

    this.saleService
      .getOne(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => this.hydrateForm(detail),
        error: () => {
          this.loadError.set('No se pudo cargar la venta.');
          this.loadingData.set(false);
        },
      });
  }

  protected close(): void {
    this.closed.emit();
  }

  protected openAddProduct(): void {
    this.productSelectorMode.set('add');
    this.replaceItemIndex.set(null);
    this.productSelectorOpen.set(true);
  }

  protected openReplaceProduct(index: number): void {
    this.productSelectorMode.set('replace');
    this.replaceItemIndex.set(index);
    this.productSelectorOpen.set(true);
  }

  protected closeProductSelector(): void {
    this.productSelectorOpen.set(false);
    this.replaceItemIndex.set(null);
  }

  protected onProductSelected(product: ProductVariantSelection): void {
    if (this.productSelectorMode() === 'replace') {
      const index = this.replaceItemIndex();
      if (index != null) {
        this.items.update((rows) =>
          rows.map((row, i) => {
            if (i !== index) return row;
            const quantity = row.quantity || 1;
            const unitPrice = product.salePrice;
            return {
              ...row,
              productSizeId: product.productSizeId,
              colorId: product.colorId,
              productName: product.name,
              unitPrice,
              quantity,
              subtotal: quantity * unitPrice,
              descriptionFull: `${product.name} (${product.sizeName} | ${product.colorName})`,
              isNew: false,
            };
          }),
        );
      }
    } else {
      const quantity = 1;
      const unitPrice = product.salePrice;
      this.items.update((rows) => [
        ...rows,
        {
          localId: crypto.randomUUID(),
          productSizeId: product.productSizeId,
          colorId: product.colorId,
          productName: product.name,
          unitPrice,
          quantity,
          subtotal: quantity * unitPrice,
          descriptionFull: `${product.name} (${product.sizeName} | ${product.colorName})`,
          isNew: true,
        },
      ]);
    }

    this.closeProductSelector();
  }

  protected updateItemQuantity(index: number, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    const quantity = Number.isFinite(value) && value >= 1 ? value : 1;
    this.items.update((rows) =>
      rows.map((row, i) =>
        i === index
          ? { ...row, quantity, subtotal: quantity * row.unitPrice }
          : row,
      ),
    );
  }

  protected updateItemPrice(index: number, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    const unitPrice = Number.isFinite(value) && value >= 0 ? value : 0;
    this.items.update((rows) =>
      rows.map((row, i) =>
        i === index
          ? { ...row, unitPrice, subtotal: row.quantity * unitPrice }
          : row,
      ),
    );
  }

  protected requestRemoveItem(index: number): void {
    if (this.items().length <= 1) return;
    const row = this.items()[index];
    if (row?.isNew) {
      this.removeItemAt(index);
      return;
    }
    this.removeItemIndex.set(index);
  }

  protected cancelRemoveItem(): void {
    this.removeItemIndex.set(null);
  }

  protected confirmRemoveItem(): void {
    const index = this.removeItemIndex();
    if (index == null) return;
    this.removeItemAt(index);
    this.removeItemIndex.set(null);
  }

  protected addPaymentRow(): void {
    this.payments.update((rows) => [
      ...rows,
      { localId: crypto.randomUUID(), method: 'CASH', amount: 0 },
    ]);
  }

  protected removePaymentRow(index: number): void {
    if (this.payments().length <= 1) return;
    this.payments.update((rows) => rows.filter((_, i) => i !== index));
  }

  protected updatePaymentMethod(index: number, method: PaymentMethod): void {
    this.payments.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, method } : row)),
    );
  }

  protected updatePaymentAmount(index: number, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    const amount = Number.isFinite(value) && value >= 0 ? value : 0;
    this.payments.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, amount } : row)),
    );
  }

  protected fixPaymentBalance(): void {
    const rows = this.payments();
    const total = this.calculatedTotal();
    if (rows.length === 0) {
      this.payments.set([
        { localId: crypto.randomUUID(), method: 'CASH', amount: total },
      ]);
      return;
    }
    if (rows.length === 1) {
      this.payments.set([{ ...rows[0], amount: total }]);
      return;
    }
    const diff = this.paymentDifference();
    const last = rows[rows.length - 1];
    this.payments.set([
      ...rows.slice(0, -1),
      { ...last, amount: Math.max(0, last.amount - diff) },
    ]);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (!this.canSave()) return;

    const meta = this.saleMeta();
    const id = this.saleId();
    if (!meta || id == null) return;

    const payload: SaleUpdatePayload = {
      id,
      code: meta.code,
      total: this.calculatedTotal(),
      status: meta.status,
      creationTime: this.toApiDateTime(
        this.dateForm.controls.creationDateTime.value,
      ),
      items: this.items().map((item) => {
        const mapped: SaleUpdatePayload['items'][number] = {
          quantity: item.quantity,
          unit_price: item.unitPrice,
        };
        if (item.id) mapped.id = item.id;
        if (item.productSizeId) {
          mapped.product_size_id = item.productSizeId;
          mapped.color_id = item.colorId ?? undefined;
        }
        return mapped;
      }),
      payments: this.payments().map((pay) => ({
        method: pay.method,
        amount: pay.amount,
      })),
    };

    this.saving.set(true);
    this.saleService
      .update(id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit('Venta actualizada correctamente.');
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.loadError.set(
            typeof err === 'string' ? err : 'No se pudo guardar la venta.',
          );
        },
      });
  }

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  protected removeItemLabel(): string {
    const index = this.removeItemIndex();
    if (index == null) return '';
    const row = this.items()[index];
    return row?.descriptionFull || row?.productName || 'este producto';
  }

  protected canRemoveItem(index: number): boolean {
    return this.isEditable() && this.items().length > 1 && index >= 0;
  }

  protected isNewItem(index: number): boolean {
    return !!this.items()[index]?.isNew;
  }

  private hydrateForm(detail: SaleDetail): void {
    this.saleMeta.set({
      id: detail.id,
      code: detail.code,
      status: detail.status,
      customer: detail.customer,
    });

    this.dateForm.controls.creationDateTime.setValue(
      toDatetimeLocalValue(this.parseSaleDateTime(detail)),
    );

    this.items.set(
      detail.items.map((item) => ({
        ...item,
        localId: crypto.randomUUID(),
      })),
    );

    const total = detail.items.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0,
    );

    if (detail.payments.length === 0) {
      this.payments.set([
        {
          localId: crypto.randomUUID(),
          method: detail.paymentMethod
            ? normalizePaymentMethod(detail.paymentMethod)
            : 'CASH',
          amount: detail.total || total,
        },
      ]);
    } else {
      this.payments.set(
        detail.payments.map((pay) => ({
          ...pay,
          method: normalizePaymentMethod(pay.method),
          localId: crypto.randomUUID(),
        })),
      );
    }

    if (!this.isEditable()) {
      this.dateForm.disable({ emitEvent: false });
    }

    this.loadingData.set(false);
  }

  private removeItemAt(index: number): void {
    this.items.update((rows) => rows.filter((_, i) => i !== index));
  }

  private parseSaleDateTime(detail: SaleDetail): Date {
    if (detail.datetimeIso) {
      const parsed = new Date(detail.datetimeIso);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    const raw = detail.creationTime?.trim();
    if (raw) {
      const isoLike = raw.includes('T') ? raw : raw.replace(' ', 'T');
      const fromIso = new Date(isoLike);
      if (!Number.isNaN(fromIso.getTime())) {
        return fromIso;
      }

      const match = raw.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/,
      );
      if (match) {
        const [, day, month, year, hours = '12', minutes = '00'] = match;
        return new Date(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hours),
          Number(minutes),
        );
      }
    }

    return new Date();
  }

  private toApiDateTime(dateValue: string): string {
    if (!dateValue) return '';
    return formatDateTime(parseDatetimeLocalValue(dateValue));
  }
}

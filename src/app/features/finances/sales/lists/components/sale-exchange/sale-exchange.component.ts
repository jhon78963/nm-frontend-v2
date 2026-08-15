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
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { AuthService } from '../../../../../auth/data-access/auth.service';
import { AlertComponent } from '../../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../../shared/ui/button/button.component';
import { CheckboxComponent } from '../../../../../../shared/ui/checkbox/checkbox.component';
import { InputComponent } from '../../../../../../shared/ui/input/input.component';
import { MoneyInputComponent } from '../../../../../../shared/ui/money-input/money-input.component';
import { SelectComponent, SelectOption } from '../../../../../../shared/ui/select/select.component';
import { TableActionButtonComponent } from '../../../../../../shared/ui/table-action-button/table-action-button.component';
import { ToastService } from '../../../../../../shared/ui/toast/toast.service';
import { SaleExchangeService } from '../../data-access/sale-exchange.service';
import { SaleService } from '../../data-access/sale.service';
import { adaptSaleItemToExchangeItem } from '../../data-access/sale-exchange.adapter';
import {
  ExchangeItem,
  ExchangeNewItem,
  ExchangePreview,
  ExchangeResponse,
  PaymentMethod,
} from '../../models/sale.model';

type ExchangeStep = 'select-return' | 'select-new' | 'confirm';

@Component({
  selector: 'app-sale-exchange',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    AlertComponent,
    ButtonComponent,
    CheckboxComponent,
    InputComponent,
    MoneyInputComponent,
    SelectComponent,
    TableActionButtonComponent,
  ],
  templateUrl: './sale-exchange.component.html',
})
export class SaleExchangeComponent implements OnInit {
  private readonly saleService = inject(SaleService);
  private readonly exchangeService = inject(SaleExchangeService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  readonly saleId = input.required<number>();
  readonly close = output<void>();
  readonly exchangeCompleted = output<ExchangeResponse>();

  protected readonly step = signal<ExchangeStep>('select-return');
  protected readonly saleCode = signal('');
  protected readonly saleCustomer = signal('');
  protected readonly originalItems = signal<ExchangeItem[]>([]);
  protected readonly returnSelection = signal<Map<number, number>>(new Map());
  protected readonly newItems = signal<ExchangeNewItem[]>([]);
  protected readonly preview = signal<ExchangePreview | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isLoadingPreview = signal(false);
  protected readonly isConfirming = signal(false);
  protected readonly loadError = signal('');
  protected readonly searchQuery = signal('');
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchResults = signal<ExchangeNewItem[]>([]);
  protected readonly isSearching = signal(false);
  protected readonly paymentMethod = signal<PaymentMethod>('CASH');

  private readonly search$ = new Subject<string>();

  protected readonly hasReturnSelection = computed(
    () => this.returnSelection().size > 0,
  );

  protected readonly hasNewItems = computed(() => this.newItems().length > 0);

  protected readonly stepIndex = computed(() => {
    switch (this.step()) {
      case 'select-return':
        return 1;
      case 'select-new':
        return 2;
      default:
        return 3;
    }
  });

  protected readonly paymentMethodOptions: SelectOption<PaymentMethod>[] = [
    { label: 'Efectivo', value: 'CASH' },
    { label: 'Yape / Plin', value: 'YAPE' },
    { label: 'Tarjeta', value: 'CARD' },
  ];

  protected readonly moneyFormatter = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  constructor() {
    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.searchQuery.set(value);
        this.search$.next(value.trim());
      });

    this.search$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((term) => {
        this.runSearch(term);
      });
  }

  ngOnInit(): void {
    this.loadSaleItems();
  }

  protected closePanel(): void {
    this.close.emit();
  }

  protected formatMoney(value: number): string {
    return `S/ ${this.moneyFormatter.format(value)}`;
  }

  protected formatAbsMoney(value: number): string {
    return this.formatMoney(Math.abs(value));
  }

  protected goToConfirmBack(): void {
    this.step.set('select-new');
    this.preview.set(null);
  }

  protected isReturnSelected(item: ExchangeItem): boolean {
    return this.returnSelection().has(item.saleItemId);
  }

  protected returnQuantity(item: ExchangeItem): number {
    return this.returnSelection().get(item.saleItemId) ?? item.quantity;
  }

  protected toggleReturnItem(item: ExchangeItem, checked: boolean): void {
    this.returnSelection.update((current) => {
      const next = new Map<number, number>();
      if (checked) {
        next.set(item.saleItemId, item.quantity);
      }
      return next;
    });
  }

  protected onReturnQuantityChange(item: ExchangeItem, rawValue: string | number): void {
    const parsed = Number(rawValue);
    const max = item.quantity;
    const quantity = Number.isFinite(parsed)
      ? Math.min(Math.max(1, Math.trunc(parsed)), max)
      : 1;

    this.returnSelection.update((current) => {
      if (!current.has(item.saleItemId)) {
        return current;
      }

      const next = new Map(current);
      next.set(item.saleItemId, quantity);
      return next;
    });
  }

  protected goToSelectNew(): void {
    if (!this.hasReturnSelection()) {
      return;
    }

    this.step.set('select-new');
  }

  protected goToSelectReturn(): void {
    this.step.set('select-return');
    this.preview.set(null);
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.runSearch(this.searchQuery().trim());
    }
  }

  protected addNewItem(item: ExchangeNewItem): void {
    this.newItems.set([
      {
        ...item,
        quantity: 1,
        subtotal: item.unitPrice,
      },
    ]);
  }

  protected removeNewItem(variantId: number): void {
    this.newItems.update((items) =>
      items.filter((item) => item.variantId !== variantId),
    );
  }

  protected updateNewItemQuantity(variantId: number, rawValue: string | number): void {
    const parsed = Number(rawValue);
    const quantity = Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 1;

    this.newItems.update((items) =>
      items.map((item) =>
        item.variantId === variantId
          ? {
              ...item,
              quantity,
              subtotal: item.unitPrice * quantity,
            }
          : item,
      ),
    );
  }

  protected updateNewItemPrice(variantId: number, value: number | null): void {
    const unitPrice = value ?? 0;

    this.newItems.update((items) =>
      items.map((item) =>
        item.variantId === variantId
          ? {
              ...item,
              unitPrice,
              subtotal: unitPrice * item.quantity,
            }
          : item,
      ),
    );

    this.preview.update((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        newItems: current.newItems.map((item) =>
          item.variantId === variantId
            ? {
                ...item,
                unitPrice,
                subtotal: unitPrice * item.quantity,
              }
            : item,
        ),
        newTotal: current.newItems.reduce((sum, item) => {
          const price = item.variantId === variantId ? unitPrice : item.unitPrice;
          return sum + price * item.quantity;
        }, 0),
        difference:
          current.newItems.reduce((sum, item) => {
            const price = item.variantId === variantId ? unitPrice : item.unitPrice;
            return sum + price * item.quantity;
          }, 0) - current.originalTotal,
      };
    });
  }

  protected onPaymentMethodChange(value: PaymentMethod | null): void {
    if (!value) {
      return;
    }

    this.paymentMethod.set(value);
  }

  protected loadPreviewAndConfirmStep(): void {
    if (!this.hasNewItems() || this.isLoadingPreview()) {
      return;
    }

    this.isLoadingPreview.set(true);

    this.exchangeService
      .previewExchange({
        originalItems: this.originalItems(),
        returnSelection: this.returnSelection(),
        newItems: this.newItems(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.preview.set(result);
          this.step.set('confirm');
          this.isLoadingPreview.set(false);
        },
        error: (err: unknown) => {
          this.isLoadingPreview.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo calcular el resumen del canje.',
          );
        },
      });
  }

  protected confirmExchange(): void {
    const preview = this.preview();
    if (!preview || this.isConfirming()) {
      return;
    }

    if (preview.difference > 0 && !this.paymentMethod()) {
      this.toastService.show('info', 'Selecciona un método de pago para la diferencia.');
      return;
    }

    this.isConfirming.set(true);

    const returnItems = Array.from(this.returnSelection().entries()).map(
      ([saleItemId, quantity]) => ({
        saleItemId,
        quantity,
      }),
    );

    const payload = {
      saleId: this.saleId(),
      returnItems,
      newItems: this.newItems().map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      paymentMethod:
        preview.difference > 0
          ? (this.paymentMethod().toLowerCase() as 'cash' | 'yape' | 'card')
          : null,
      amountPaid: Math.max(0, preview.difference),
    };

    this.exchangeService
      .confirmExchange(payload, preview)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isConfirming.set(false);
          this.exchangeCompleted.emit(response);
          this.close.emit();
        },
        error: (err: unknown) => {
          this.isConfirming.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo registrar el canje.',
          );
        },
      });
  }

  private loadSaleItems(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.saleService
      .getOne(this.saleId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sale) => {
          this.saleCode.set(sale.code);
          this.saleCustomer.set(sale.customer);
          this.originalItems.set(
            sale.items
              .filter((item) => item.id != null)
              .map(adaptSaleItemToExchangeItem),
          );
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.loadError.set('No se pudo cargar los productos de la venta.');
        },
      });
  }

  private runSearch(query: string): void {
    if (query.length < 2) {
      this.searchResults.set([]);
      return;
    }

    const warehouseId = this.authService.currentUser()?.warehouseId ?? 0;
    this.isSearching.set(true);

    this.exchangeService
      .searchVariantsForExchange(query, warehouseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          this.searchResults.set(results);
          this.isSearching.set(false);
        },
        error: () => {
          this.searchResults.set([]);
          this.isSearching.set(false);
        },
      });
  }
}

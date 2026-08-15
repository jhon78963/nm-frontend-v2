import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import {
  TableDataColumn,
  TableDataComponent,
} from '../../../../../shared/ui/table-data/table-data.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { PurchaseService } from '../../data-access/purchase.service';
import {
  PurchaseDetail,
  PurchaseLineRow,
  PurchaseLinkedPayment,
} from '../../models/purchase.model';

@Component({
  selector: 'app-purchase-detail',
  imports: [RouterLink, ConfirmDialogComponent, TableDataComponent, ButtonComponent, TableActionButtonComponent],
  templateUrl: './purchase-detail.component.html',
})
export class PurchaseDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly purchaseService = inject(PurchaseService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly purchase = signal<PurchaseDetail | null>(null);
  protected readonly loading = signal(true);

  protected readonly cancelConfirmOpen = signal(false);
  protected readonly cancelling = signal(false);

  protected readonly previewOpen = signal(false);
  protected readonly previewLoading = signal(false);
  protected readonly previewUrl = signal('');
  protected readonly previewIsPdf = signal(false);
  protected readonly previewItems = signal<string[]>([]);
  protected readonly previewIndex = signal(0);

  private previewObjectUrl: string | null = null;

  protected readonly isActive = computed(
    () => this.purchase()?.status === 'ACTIVE',
  );

  protected readonly linkedPayment = computed(
    (): PurchaseLinkedPayment | null => this.purchase()?.linkedPayment ?? null,
  );

  protected readonly linkedVoucherPaths = computed((): string[] => {
    const payment = this.linkedPayment();
    if (!payment) return [];
    if (payment.voucherPaths?.length) return payment.voucherPaths;
    return payment.voucherPath ? [payment.voucherPath] : [];
  });

  protected readonly lineTableColumns = computed<TableDataColumn<PurchaseLineRow>[]>(() => [
    { key: 'product', label: 'Producto', width: '14%' },
    { key: 'size', label: 'Talla', width: '10%' },
    { key: 'barcode', label: 'Barcode', width: '12%' },
    { key: 'prices', label: 'Precios', width: '15%' },
    { key: 'stockDelta', label: 'Δ stock', width: '7%', align: 'center' },
    { key: 'colors', label: 'Colores / cantidades' },
    { key: 'subtotal', label: 'Subtotal', width: '10%', align: 'right' },
  ]);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id < 1) {
      void this.router.navigate(['/inventories/purchases']);
      return;
    }

    this.loadPurchase(id);
  }

  protected loadPurchase(id: number): void {
    this.loading.set(true);
    this.purchaseService
      .getOne(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.purchase.set(p);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se encontró la compra.');
          void this.router.navigate(['/inventories/purchases']);
        },
      });
  }

  protected showLinkedVoucher(): void {
    const paths = this.linkedVoucherPaths();
    if (!paths.length) return;
    this.previewItems.set(paths);
    this.previewIndex.set(0);
    this.loadPreviewAt(0);
  }

  protected prevPreview(): void {
    if (this.previewIndex() > 0) {
      this.loadPreviewAt(this.previewIndex() - 1);
    }
  }

  protected nextPreview(): void {
    if (this.previewIndex() < this.previewItems().length - 1) {
      this.loadPreviewAt(this.previewIndex() + 1);
    }
  }

  private loadPreviewAt(index: number): void {
    const path = this.previewItems()[index];
    this.revokePreviewUrl();
    this.previewIndex.set(index);
    this.previewIsPdf.set(path.toLowerCase().endsWith('.pdf'));
    this.previewOpen.set(true);
    this.previewLoading.set(true);

    this.purchaseService.getVoucherPreview(path).subscribe({
      next: (blob) => {
        this.previewObjectUrl = URL.createObjectURL(blob);
        this.previewUrl.set(this.previewObjectUrl);
        this.previewLoading.set(false);
      },
      error: () => {
        this.previewLoading.set(false);
        this.previewOpen.set(false);
        this.toastService.show('error', 'No se pudo cargar el comprobante.');
      },
    });
  }

  protected closePreview(): void {
    this.previewOpen.set(false);
    this.revokePreviewUrl();
  }

  private revokePreviewUrl(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.previewUrl.set('');
  }

  protected openCancelConfirm(): void {
    this.cancelConfirmOpen.set(true);
  }

  protected confirmCancelPurchase(): void {
    const p = this.purchase();
    if (!p || p.status !== 'ACTIVE') return;

    this.cancelling.set(true);
    this.purchaseService
      .cancel(p.id, 'Anulación desde detalle de compra')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancelling.set(false);
          this.cancelConfirmOpen.set(false);
          this.toastService.show('success', 'Compra anulada.');
          void this.router.navigate(['/inventories/purchases']);
        },
        error: (err: unknown) => {
          this.cancelling.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo anular.',
          );
        },
      });
  }

  protected formatMoney(value: number, currency = 'PEN'): string {
    const formatted = new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return currency === 'PEN' ? `S/ ${formatted}` : `${formatted} ${currency}`;
  }

  protected formatDate(value: string | null): string {
    if (!value) return '—';
    const parts = value.slice(0, 10).split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  protected statusLabel(status: string): string {
    if (status === 'ACTIVE') return 'Activa';
    if (status === 'CANCELLED') return 'Anulada';
    return status;
  }

  protected paymentMethodLabel(method: string): string {
    const map: Record<string, string> = {
      CASH: 'Efectivo',
      YAPE: 'Yape / Plin',
      CARD: 'Tarjeta',
      TRANSFER: 'Transferencia',
    };
    return map[method] ?? method;
  }
}

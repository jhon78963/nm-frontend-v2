import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of, switchMap, tap } from 'rxjs';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { DateInputComponent } from '../../../../../shared/ui/date-input/date-input.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { MoneyInputComponent } from '../../../../../shared/ui/money-input/money-input.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { PurchaseCatalogService } from '../../data-access/purchase-catalog.service';
import { PurchaseService } from '../../data-access/purchase.service';
import {
  PurchaseDetail,
  PurchaseLineRow,
  PurchaseLinkedPayment,
} from '../../models/purchase.model';

interface VendorSuggestion {
  id: number;
  name: string;
  phone?: string;
}

@Component({
  selector: 'app-purchase-detail',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AlertComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    DateInputComponent,
    InputComponent,
    MoneyInputComponent,
  ],
  templateUrl: './purchase-detail.component.html',
})
export class PurchaseDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly purchaseService = inject(PurchaseService);
  private readonly catalogService = inject(PurchaseCatalogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly purchase = signal<PurchaseDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly savingHeader = signal(false);
  protected readonly savingVouchers = signal(false);
  protected readonly savingLineIds = signal<Set<number>>(new Set());

  protected readonly cancelConfirmOpen = signal(false);
  protected readonly cancelling = signal(false);
  protected readonly deleteLineIndex = signal<number | null>(null);
  protected readonly deletingLine = signal(false);

  protected readonly previewOpen = signal(false);
  protected readonly previewLoading = signal(false);
  protected readonly previewUrl = signal('');
  protected readonly previewIsPdf = signal(false);
  protected readonly previewItems = signal<string[]>([]);
  protected readonly previewIndex = signal(0);

  protected readonly vendorQuery = signal('');
  protected readonly vendorResults = signal<VendorSuggestion[]>([]);
  protected readonly vendorDropdownOpen = signal(false);
  protected readonly selectedVoucherFiles = signal<File[]>([]);

  private supplierNameLockedForVendorId: string | null = null;
  private previewObjectUrl: string | null = null;

  protected readonly maxVouchers = 10;

  protected readonly headerForm = new FormGroup({
    supplierName: new FormControl('', { nonNullable: true }),
    vendorId: new FormControl<number | null>(null),
    documentNote: new FormControl('', { nonNullable: true }),
    registeredAt: new FormControl('', { nonNullable: true }),
  });

  protected readonly linesForm = new FormArray<FormGroup>([]);

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

  protected readonly remainingVoucherSlots = computed(() =>
    Math.max(0, this.maxVouchers - this.linkedVoucherPaths().length),
  );

  protected readonly canAddVouchers = computed(
    () => this.isActive() && this.remainingVoucherSlots() > 0,
  );

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id < 1) {
      void this.router.navigate(['/inventories/purchase']);
      return;
    }

    this.loadPurchase(id);

    this.headerForm.controls.supplierName.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => {
        const lock = this.supplierNameLockedForVendorId;
        if (lock != null && val.trim() !== lock) {
          this.headerForm.patchValue({ vendorId: null }, { emitEvent: false });
          this.supplierNameLockedForVendorId = null;
        }
      });
  }

  protected loadPurchase(id: number): void {
    this.loading.set(true);
    this.purchaseService
      .getOne(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.applyPurchase(p);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se encontró la compra.');
          void this.router.navigate(['/inventories/purchase']);
        },
      });
  }

  private applyPurchase(p: PurchaseDetail): void {
    this.purchase.set(p);
    this.supplierNameLockedForVendorId =
      p.vendorId != null && p.vendorId > 0
        ? String(p.supplierName ?? '').trim()
        : null;

    this.headerForm.patchValue({
      supplierName: p.supplierName ?? '',
      vendorId: p.vendorId ?? null,
      documentNote: p.documentNote ?? '',
      registeredAt: p.registeredAt?.slice(0, 10) ?? '',
    });

    if (p.status !== 'ACTIVE') {
      this.headerForm.disable({ emitEvent: false });
    } else {
      this.headerForm.enable({ emitEvent: false });
    }

    this.rebuildLinesForm(p.lines ?? []);
  }

  private rebuildLinesForm(lines: PurchaseLineRow[]): void {
    this.linesForm.clear({ emitEvent: false });
    for (const line of lines) {
      this.linesForm.push(this.buildLineEditGroup(line));
    }
    if (this.purchase()?.status !== 'ACTIVE') {
      this.linesForm.disable({ emitEvent: false });
    } else {
      this.linesForm.enable({ emitEvent: false });
    }
  }

  private buildLineEditGroup(line: PurchaseLineRow): FormGroup {
    const deltas = line.colorDeltas ?? [];
    const sizeOnlyQty =
      !line.hasColorBreakdown || deltas.length === 0
        ? line.sizeStockDelta
        : (deltas[0]?.quantity ?? line.sizeStockDelta);

    return new FormGroup({
      id: new FormControl(line.id, { nonNullable: true }),
      barcode: new FormControl(line.barcode ?? '', { nonNullable: true }),
      purchasePrice: new FormControl(Number(line.purchasePrice) || 0, {
        nonNullable: true,
        validators: [Validators.min(0)],
      }),
      salePrice: new FormControl(Number(line.salePrice) || 0, {
        nonNullable: true,
        validators: [Validators.min(0)],
      }),
      minSalePrice: new FormControl(Number(line.minSalePrice) || 0, {
        nonNullable: true,
        validators: [Validators.min(0)],
      }),
      hasColorBreakdown: new FormControl(line.hasColorBreakdown, {
        nonNullable: true,
      }),
      sizeOnlyQuantity: new FormControl(
        Math.max(1, Number(sizeOnlyQty) || 1),
        { nonNullable: true, validators: [Validators.min(1)] },
      ),
      colorDeltas: new FormArray(
        deltas.map(
          (d) =>
            new FormGroup({
              colorId: new FormControl(d.colorId, { nonNullable: true }),
              quantity: new FormControl(Math.max(1, Number(d.quantity) || 1), {
                nonNullable: true,
                validators: [Validators.min(1)],
              }),
            }),
        ),
      ),
    });
  }

  protected lineEditAt(index: number): FormGroup {
    return this.linesForm.at(index) as FormGroup;
  }

  protected colorDeltaControls(lineIdx: number): FormGroup[] {
    const arr = this.lineEditAt(lineIdx).get('colorDeltas') as FormArray;
    return arr.controls as FormGroup[];
  }

  protected lineColorsSummary(line: PurchaseLineRow): string {
    if (!line.hasColorBreakdown || !line.colorDeltas?.length) {
      return '— (solo talla)';
    }
    return line.colorDeltas
      .map((c) => `${c.colorDescription ?? String(c.colorId)}: ${c.quantity}`)
      .join(', ');
  }

  protected onVendorInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.vendorQuery.set(value);
    this.headerForm.controls.supplierName.setValue(value);

    const q = value.trim();
    if (q.length < 2) {
      this.vendorResults.set([]);
      this.vendorDropdownOpen.set(false);
      return;
    }

    this.catalogService
      .searchVendors(q, 20)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.vendorResults.set(
            rows.map((v) => ({
              id: v.id,
              name: v.name,
              phone: v.phone || undefined,
            })),
          );
          this.vendorDropdownOpen.set(rows.length > 0);
        },
      });
  }

  protected selectVendor(vendor: VendorSuggestion): void {
    this.headerForm.patchValue({
      supplierName: vendor.name,
      vendorId: vendor.id,
    });
    this.supplierNameLockedForVendorId = vendor.name.trim();
    this.vendorDropdownOpen.set(false);
    this.vendorResults.set([]);
  }

  protected saveHeader(): void {
    const p = this.purchase();
    if (!p || p.status !== 'ACTIVE') return;

    const supplierTrim = this.headerForm.controls.supplierName.value.trim();
    if (!supplierTrim) {
      this.toastService.show('error', 'Indica el nombre del proveedor.');
      return;
    }

    this.savingHeader.set(true);
    const existingVid = this.headerForm.getRawValue().vendorId;

    of(null)
      .pipe(
        switchMap(() => {
          if (existingVid != null && Number(existingVid) > 0) {
            return of(void 0);
          }
          return this.catalogService.resolveOrCreateVendor(supplierTrim).pipe(
            tap((vendor) => {
              const nm = String(vendor.name ?? supplierTrim).trim();
              this.headerForm.patchValue(
                { vendorId: vendor.id, supplierName: nm },
                { emitEvent: false },
              );
              this.supplierNameLockedForVendorId = nm;
            }),
            switchMap(() => of(void 0)),
          );
        }),
        switchMap(() => {
          const raw = this.headerForm.getRawValue();
          return this.purchaseService.patchHeader(p.id, {
            supplierName: raw.supplierName.trim(),
            vendorId:
              raw.vendorId != null && Number(raw.vendorId) > 0
                ? Number(raw.vendorId)
                : null,
            documentNote: raw.documentNote.trim() || null,
            registeredAt: raw.registeredAt || null,
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.savingHeader.set(false);
          this.toastService.show('success', 'Datos guardados.');
          this.loadPurchase(p.id);
        },
        error: (err: unknown) => {
          this.savingHeader.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo guardar.',
          );
        },
      });
  }

  protected saveLine(index: number): void {
    const p = this.purchase();
    if (!p || p.status !== 'ACTIVE') return;

    const line = p.lines[index];
    const g = this.lineEditAt(index);
    if (!line || !g) return;

    const raw = g.getRawValue() as {
      id: number;
      barcode: string;
      purchasePrice: number;
      salePrice: number;
      minSalePrice: number;
      hasColorBreakdown: boolean;
      sizeOnlyQuantity: number;
      colorDeltas: { colorId: number; quantity: number }[];
    };

    const body: {
      barcode?: string | null;
      purchasePrice: number;
      salePrice?: number | null;
      minSalePrice?: number | null;
      colorDeltas?: { colorId: number; quantity: number }[];
      sizeOnlyQuantity?: number;
    } = {
      barcode: raw.barcode.trim() || null,
      purchasePrice: Number(raw.purchasePrice) || 0,
      salePrice: Number(raw.salePrice) || 0,
      minSalePrice: Number(raw.minSalePrice) || 0,
    };

    if (raw.hasColorBreakdown) {
      body.colorDeltas = (raw.colorDeltas ?? []).map((d) => ({
        colorId: Number(d.colorId),
        quantity: Math.max(1, Number(d.quantity) || 1),
      }));
    } else {
      body.sizeOnlyQuantity = Math.max(1, Number(raw.sizeOnlyQuantity) || 1);
    }

    this.savingLineIds.update((set) => new Set(set).add(line.id));
    this.purchaseService
      .updateLine(p.id, line.id, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingLineIds.update((set) => {
            const next = new Set(set);
            next.delete(line.id);
            return next;
          });
          this.toastService.show('success', 'Línea actualizada.');
          this.loadPurchase(p.id);
        },
        error: (err: unknown) => {
          this.savingLineIds.update((set) => {
            const next = new Set(set);
            next.delete(line.id);
            return next;
          });
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo guardar la línea.',
          );
        },
      });
  }

  protected isLineBusy(lineId: number): boolean {
    return this.savingLineIds().has(lineId);
  }

  protected openDeleteLineConfirm(index: number): void {
    this.deleteLineIndex.set(index);
  }

  protected cancelDeleteLine(): void {
    this.deleteLineIndex.set(null);
  }

  protected confirmDeleteLine(): void {
    const p = this.purchase();
    const index = this.deleteLineIndex();
    if (!p || p.status !== 'ACTIVE' || index === null) return;

    const line = p.lines[index];
    if (!line) return;

    this.deletingLine.set(true);
    this.purchaseService
      .deleteLine(p.id, line.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteLineIndex.set(null);
          this.deletingLine.set(false);
          this.toastService.show('success', 'Línea eliminada.');
          this.loadPurchase(p.id);
        },
        error: (err: unknown) => {
          this.deletingLine.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo eliminar la línea.',
          );
        },
      });
  }

  protected onVoucherSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const slots = this.remainingVoucherSlots();
    const files = input.files ? Array.from(input.files) : [];
    this.selectedVoucherFiles.set(slots > 0 ? files.slice(0, slots) : []);
  }

  protected saveVouchers(): void {
    const p = this.purchase();
    if (!p || !this.canAddVouchers()) return;

    const files = this.selectedVoucherFiles();
    if (files.length === 0) {
      this.toastService.show('error', 'Selecciona al menos un comprobante.');
      return;
    }

    this.savingVouchers.set(true);
    this.purchaseService
      .addVouchers(p.id, files)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingVouchers.set(false);
          this.selectedVoucherFiles.set([]);
          this.toastService.show('success', 'Comprobantes agregados.');
          this.loadPurchase(p.id);
        },
        error: (err: unknown) => {
          this.savingVouchers.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudieron agregar los comprobantes.',
          );
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
          void this.router.navigate(['/inventories/purchase']);
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

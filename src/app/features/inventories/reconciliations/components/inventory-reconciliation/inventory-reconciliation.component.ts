import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  form,
  FormField,
  maxLength,
  required,
} from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of, switchMap, Observable } from 'rxjs';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { CheckboxComponent } from '../../../../../shared/ui/checkbox/checkbox.component';
import { ConfirmDialogComponent } from '../../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { MoneyInputComponent } from '../../../../../shared/ui/money-input/money-input.component';
import { SelectComponent, SelectOption } from '../../../../../shared/ui/select/select.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import {
  TableDataColumn,
  TableDataComponent,
} from '../../../../../shared/ui/table-data/table-data.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import { ProductService } from '../../../products/data-access/product.service';
import { ProductLookupService } from '../../../products/data-access/product-lookup.service';
import type { Gender, Product, ProductFormData, Warehouse } from '../../../products/models/product.model';
import { InventoryReconciliationService } from '../../data-access/inventory-reconciliation.service';
import type {
  AutocompleteOption,
  CatalogColorOption,
  ReconciliationColorDraft,
  ReconciliationDraft,
  ReconciliationNavigationState,
  ReconciliationPosSalesSummary,
  ReconciliationProduct,
  ReconciliationSizeDraft,
} from '../../models/inventory-reconciliation.model';
import {
  buildInventoryPayload,
  captureDraftSnapshot,
  cloneProductToDraft,
  colorStockSum,
  effectiveSizeStock,
  hasColorBreakdown,
  isColorZeroStock,
  isSizeZeroStock,
  mergeDraftPreservingEdits,
  sortedColors,
  sortedSizes,
} from '../../utils/reconciliation-draft.util';

interface ProductFormSlice {
  name: string;
  genderId: number;
  warehouseId: number;
}

type ConfirmAction =
  | { type: 'remove-color'; size: ReconciliationSizeDraft; color: ReconciliationColorDraft }
  | { type: 'remove-size'; size: ReconciliationSizeDraft };

type ReconciliationTableRow =
  | { kind: 'size'; size: ReconciliationSizeDraft }
  | { kind: 'color'; size: ReconciliationSizeDraft; color: ReconciliationColorDraft };

@Component({
  selector: 'app-inventory-reconciliation',
  imports: [
    NgClass,
    FormsModule,
    RouterLink,
    FormField,
    AlertComponent,
    ButtonComponent,
    CheckboxComponent,
    ConfirmDialogComponent,
    InputComponent,
    MoneyInputComponent,
    SelectComponent,
    TableActionButtonComponent,
    TableDataComponent,
  ],
  templateUrl: './inventory-reconciliation.component.html',
})
export class InventoryReconciliationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly inventoryService = inject(InventoryReconciliationService);
  private readonly productService = inject(ProductService);
  private readonly productLookupService = inject(ProductLookupService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly searchInput = viewChild<ElementRef<HTMLElement>>('searchInput');

  protected readonly searchQuery = signal('');
  protected readonly searching = signal(false);
  protected readonly loadingBundle = signal(false);
  protected readonly saving = signal(false);
  protected readonly posSalesLoading = signal(false);

  protected readonly searchResults = signal<ReconciliationProduct[]>([]);
  protected readonly searchResultsVisible = signal(false);

  protected readonly genders = signal<Gender[]>([]);
  protected readonly warehouseOptions = signal<SelectOption<number>[]>([]);

  protected readonly draft = signal<ReconciliationDraft | null>(null);
  protected readonly posSalesSummary = signal<ReconciliationPosSalesSummary | null>(null);
  protected readonly lastProductFromApi = signal<Product | null>(null);
  protected readonly navigationHint = signal<ReconciliationNavigationState | null>(null);

  protected readonly replaceDialogVisible = signal(false);
  protected readonly replaceTargetColorId = signal<number | null>(null);
  protected readonly catalogColors = signal<CatalogColorOption[]>([]);
  protected readonly catalogColorsLoading = signal(false);
  protected readonly replacingVariantColor = signal(false);
  protected readonly replaceCtx = signal<{
    productSizeId: number;
    sizeLabel: string;
    fromColorId: number;
    fromLabel: string;
    stock: number;
  } | null>(null);

  protected readonly addSizeDialogVisible = signal(false);
  protected readonly addSizeSearch = signal('');
  protected readonly addSizeResults = signal<AutocompleteOption[]>([]);
  protected readonly addSizeTarget = signal<AutocompleteOption | null>(null);
  protected readonly addingSize = signal(false);

  protected readonly addColorDialogVisible = signal(false);
  protected readonly addColorCtx = signal<{ productSizeId: number; sizeLabel: string } | null>(null);
  protected readonly addColorMode = signal<'catalog' | 'new'>('catalog');
  protected readonly addColorTargetId = signal<number | null>(null);
  protected readonly addColorNewName = signal('');
  protected readonly addColorInitialStock = signal(0);
  protected readonly addingColor = signal(false);

  protected readonly removingColor = signal(false);
  protected readonly removingSize = signal(false);
  protected readonly confirmAction = signal<ConfirmAction | null>(null);

  protected readonly productFormModel = signal<ProductFormSlice>({
    name: '',
    genderId: 1,
    warehouseId: 1,
  });

  protected readonly productForm = form(this.productFormModel, (schema) => {
    required(schema.name, { message: 'El nombre es obligatorio.' });
    maxLength(schema.name, 200, { message: 'Máximo 200 caracteres.' });
    required(schema.genderId, { message: 'Selecciona un género.' });
    required(schema.warehouseId, { message: 'Selecciona un almacén.' });
  });

  protected readonly nameError = computed(() =>
    fieldErrorMessage(this.productForm.name, {
      required: 'El nombre es obligatorio.',
      maxlength: 'Máximo 200 caracteres.',
    }),
  );

  protected readonly genderError = computed(() =>
    fieldErrorMessage(this.productForm.genderId, {
      required: 'Selecciona un género.',
    }),
  );

  protected readonly warehouseError = computed(() =>
    fieldErrorMessage(this.productForm.warehouseId, {
      required: 'Selecciona un almacén.',
    }),
  );

  protected readonly genderSelectOptions = computed<SelectOption<number>[]>(() =>
    this.genders().map((gender) => ({
      label: gender.description,
      value: gender.id,
    })),
  );

  protected readonly sortedSizes = computed(() => sortedSizes(this.draft()));
  protected readonly inventoryTableRows = computed((): ReconciliationTableRow[] => {
    const rows: ReconciliationTableRow[] = [];
    for (const size of this.sortedSizes()) {
      rows.push({ kind: 'size', size });
      for (const color of sortedColors(size)) {
        rows.push({ kind: 'color', size, color });
      }
    }
    return rows;
  });
  protected readonly reconciliationTableColumns: TableDataColumn<ReconciliationTableRow>[] = [
    { key: 'label', label: 'Talla / color' },
    { key: 'purchasePrice', label: 'P. compra', align: 'right' },
    { key: 'salePrice', label: 'P. venta', align: 'right' },
    { key: 'minSalePrice', label: 'P. mín.', align: 'right' },
    { key: 'barcode', label: 'Cód. talla' },
    { key: 'stock', label: 'Stock', align: 'right' },
  ];
  protected readonly hasAnyShelfWarning = computed(() =>
    (this.draft()?.sizes ?? []).some((size) => size.shelfInconsistentOnLoad),
  );
  protected readonly hasPosSalesSinceInventory = computed(
    () => this.posSalesSummary()?.hasAnySales === true,
  );
  protected readonly posSalesSinceLabel = computed(
    () => this.posSalesSummary()?.sinceLabel ?? '10/07/2026',
  );

  protected readonly replaceColorOptions = computed<SelectOption<number>[]>(() => {
    const fromId = this.replaceCtx()?.fromColorId;
    return this.catalogColors()
      .filter((color) => color.id !== fromId)
      .map((color) => ({ label: color.description, value: color.id }));
  });

  protected readonly addColorOptions = computed<SelectOption<number>[]>(() => {
    const ctx = this.addColorCtx();
    const size = this.draft()?.sizes.find((item) => item.id === ctx?.productSizeId);
    const used = new Set((size?.colors ?? []).map((color) => color.colorId));
    return this.catalogColors()
      .filter((color) => !used.has(color.id))
      .map((color) => ({ label: color.description, value: color.id }));
  });

  protected readonly confirmDialogState = computed(() => {
    const action = this.confirmAction();
    if (!action) {
      return null;
    }

    if (action.type === 'remove-color') {
      const stock = Math.max(0, Math.trunc(Number(action.color.stock) || 0));
      const stockNote =
        stock > 0
          ? ` El stock actual (${stock}) se pondrá en 0 antes de quitar la variante.`
          : '';
      return {
        title: 'Eliminar variante de color',
        message:
          `¿Quitar "${action.color.description}" de la talla ${action.size.sizeLabel}?` +
          `${stockNote} Las ventas y el kardex anteriores se conservan.`,
        loading: this.removingColor(),
      };
    }

    const colorNote =
      action.size.colors.length > 0
        ? ` También se quitarán ${action.size.colors.length} color(es) asociados.`
        : '';

    return {
      title: 'Eliminar talla',
      message:
        `¿Eliminar la talla ${action.size.sizeLabel} de este producto?${colorNote} ` +
        'Las ventas anteriores se conservan en historial.',
      loading: this.removingSize(),
    };
  });

  ngOnInit(): void {
    this.loadLookups();
    this.readNavigationState();

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const raw = params.get('productId');
      if (!raw) {
        this.clearWorkspace(false);
        return;
      }

      const id = Number(raw);
      if (!Number.isFinite(id) || id < 1) {
        return;
      }

      this.loadFullProduct(id);
    });
  }

  protected onSearchQueryChange(value: string): void {
    this.searchQuery.set(value);
  }

  protected onSearchEnter(event: Event): void {
    event.preventDefault();
    this.runSearch();
  }

  protected runSearch(): void {
    const query = this.searchQuery().trim();
    if (!query) {
      this.toastService.show('error', 'Escriba un nombre, ID o código de barras.');
      this.focusSearch();
      return;
    }

    if (this.searching()) return;

    this.searching.set(true);
    this.inventoryService
      .search(query)
      .pipe(
        finalize(() => this.searching.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const list = response.products ?? [];
          if (list.length === 0) {
            this.toastService.show('error', 'No se encontró ningún producto.');
            this.focusSearch();
            return;
          }

          if (list.length === 1) {
            this.openProduct(list[0].id);
            return;
          }

          this.searchResults.set(list);
          this.searchResultsVisible.set(true);
        },
        error: (message: string) => {
          this.toastService.show('error', message);
          this.focusSearch();
        },
      });
  }

  protected openProduct(id: number): void {
    this.searchResultsVisible.set(false);
    void this.router.navigate(['/inventories/reconciliations', id], {
      replaceUrl: true,
    });
  }

  protected closeSearchResults(): void {
    this.searchResultsVisible.set(false);
  }

  protected clearProduct(): void {
    this.clearWorkspace(true);
    this.focusSearch();
  }

  protected saveAll(): void {
    const currentDraft = this.draft();
    if (!currentDraft) return;

    this.productForm().markAsTouched();
    if (this.productForm().invalid()) {
      this.toastService.show(
        'error',
        'Revise la sección Producto: nombre, género y almacén son obligatorios.',
      );
      return;
    }

    const base = this.lastProductFromApi();
    if (!base) {
      this.toastService.show('error', 'Falta la ficha del producto; recargue la página.');
      return;
    }

    const formValues = this.productFormModel();
    const productPayload: ProductFormData = {
      ...base,
      ...formValues,
      id: currentDraft.productId,
      barcode: base.barcode,
      description: base.description,
      purchasePrice: base.purchasePrice,
      salePrice: base.salePrice,
      minSalePrice: base.minSalePrice,
      status: base.status,
      percentageDiscount: base.percentageDiscount,
      cashDiscount: base.cashDiscount,
    };

    this.saving.set(true);
    this.productService
      .update(currentDraft.productId, productPayload)
      .pipe(
        switchMap(() =>
          this.inventoryService.bulkUpdate(
            currentDraft.productId,
            buildInventoryPayload(currentDraft),
          ),
        ),
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toastService.show(
            'success',
            'Ficha del producto e inventario guardados correctamente.',
          );
          this.loadFullProduct(currentDraft.productId);
          this.focusSearch();
        },
        error: (message: string) => {
          this.toastService.show('error', message);
        },
      });
  }

  protected sortedColorsFor(size: ReconciliationSizeDraft): ReconciliationColorDraft[] {
    return sortedColors(size);
  }

  protected colorStockSum(size: ReconciliationSizeDraft): number {
    return colorStockSum(size);
  }

  protected hasColorBreakdown(size: ReconciliationSizeDraft): boolean {
    return hasColorBreakdown(size);
  }

  protected sizePosSoldQty(size: ReconciliationSizeDraft): number {
    return Math.max(0, Math.trunc(Number(size.posSoldQty) || 0));
  }

  protected colorPosSoldQty(color: ReconciliationColorDraft): number {
    return Math.max(0, Math.trunc(Number(color.posSoldQty) || 0));
  }

  protected variantShowNoPosSaleChip(color: ReconciliationColorDraft): boolean {
    return (
      !this.posSalesLoading() &&
      this.hasPosSalesSinceInventory() &&
      this.colorPosSoldQty(color) === 0
    );
  }

  protected posSoldTagLabel(qty: number): string {
    return qty === 1 ? '1 vendida POS' : `${qty} vendidas POS`;
  }

  protected posSoldTooltip(
    qty: number,
    saleCount: number,
    lastSoldAt: string | null,
  ): string {
    const since = this.posSalesSinceLabel();
    const parts = [
      `${qty} unidad${qty === 1 ? '' : 'es'} vendida${qty === 1 ? '' : 's'} por caja (POS) desde el ${since}.`,
      'Cuente solo lo que queda en anaquel.',
    ];
    if (saleCount > 0) {
      parts.push(`${saleCount} venta${saleCount === 1 ? '' : 's'} registrada${saleCount === 1 ? '' : 's'}.`);
    }
    if (lastSoldAt) {
      parts.push(`Última venta: ${this.formatPosSaleDate(lastSoldAt)}.`);
    }
    return parts.join(' ');
  }

  protected posStockHint(
    size: ReconciliationSizeDraft,
    color?: ReconciliationColorDraft,
  ): string {
    const qty = color ? this.colorPosSoldQty(color) : this.sizePosSoldQty(size);
    if (qty < 1) return '';
    return `−${qty} ya salió por POS desde el ${this.posSalesSinceLabel()}`;
  }

  protected canRemoveSize(size: ReconciliationSizeDraft): boolean {
    return (
      !this.saving() &&
      !this.removingSize() &&
      !this.removingColor() &&
      !this.addingColor() &&
      !this.addingSize() &&
      effectiveSizeStock(size) === 0
    );
  }

  protected sizeRemoveTooltip(size: ReconciliationSizeDraft): string {
    if (effectiveSizeStock(size) > 0) {
      return 'Solo puede eliminar tallas con stock 0';
    }
    return 'Eliminar talla del producto';
  }

  protected confirmRemoveColor(
    size: ReconciliationSizeDraft,
    color: ReconciliationColorDraft,
  ): void {
    this.confirmAction.set({ type: 'remove-color', size, color });
  }

  protected confirmRemoveSize(size: ReconciliationSizeDraft): void {
    if (!this.canRemoveSize(size)) return;
    this.confirmAction.set({ type: 'remove-size', size });
  }

  protected cancelConfirmAction(): void {
    this.confirmAction.set(null);
  }

  protected executeConfirmAction(): void {
    const action = this.confirmAction();
    if (!action) return;

    if (action.type === 'remove-color') {
      this.removeColorVariant(action.size, action.color);
      return;
    }

    this.removeSizeVariant(action.size);
  }

  protected updateSizeField<K extends keyof ReconciliationSizeDraft>(
    sizeId: number,
    field: K,
    value: ReconciliationSizeDraft[K],
  ): void {
    this.draft.update((current) => {
      if (!current) return current;
      return {
        ...current,
        sizes: current.sizes.map((size) =>
          size.id === sizeId ? { ...size, [field]: value } : size,
        ),
      };
    });
  }

  protected updateColorStock(
    sizeId: number,
    colorId: number,
    value: number,
  ): void {
    this.draft.update((current) => {
      if (!current) return current;
      return {
        ...current,
        sizes: current.sizes.map((size) => {
          if (size.id !== sizeId) return size;
          return {
            ...size,
            colors: size.colors.map((color) => {
              if (color.colorId !== colorId) return color;
              const stock = Math.max(0, Math.trunc(Number(value) || 0));
              return {
                ...color,
                stock,
                stockReviewed:
                  stock !== color.baselineStock ? true : color.stockReviewed,
              };
            }),
          };
        }),
      };
    });
  }

  protected updateColorReviewed(
    sizeId: number,
    colorId: number,
    checked: boolean,
  ): void {
    this.draft.update((current) => {
      if (!current) return current;
      return {
        ...current,
        sizes: current.sizes.map((size) => {
          if (size.id !== sizeId) return size;
          return {
            ...size,
            colors: size.colors.map((color) =>
              color.colorId === colorId
                ? { ...color, stockReviewed: checked }
                : color,
            ),
          };
        }),
      };
    });
  }

  protected colorRowClasses(color: ReconciliationColorDraft): string {
    const classes: string[] = [];
    if (isColorZeroStock(color)) {
      classes.push('bg-gray-50/80');
    } else {
      if (color.stockReviewed) classes.push('bg-emerald-50/60');
      if (this.colorPosSoldQty(color) > 0) classes.push('ring-1 ring-inset ring-amber-200/70');
    }
    return classes.join(' ');
  }

  protected sizeRowClasses(size: ReconciliationSizeDraft): string {
    return isSizeZeroStock(size) ? 'bg-gray-50/60' : '';
  }

  protected openAddSizeDialog(): void {
    if (!this.draft() || this.saving()) return;
    this.addSizeTarget.set(null);
    this.addSizeSearch.set('');
    this.addSizeResults.set([]);
    this.addSizeDialogVisible.set(true);
  }

  protected closeAddSizeDialog(): void {
    this.addSizeDialogVisible.set(false);
    this.addSizeTarget.set(null);
  }

  protected onAddSizeSearchChange(value: string): void {
    this.addSizeSearch.set(value);
    const term = value.trim();
    if (term.length < 1) {
      this.addSizeResults.set([]);
      return;
    }

    this.inventoryService
      .searchSizeAutocomplete(term)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => this.addSizeResults.set(results),
        error: () => this.addSizeResults.set([]),
      });
  }

  protected selectAddSizeTarget(option: AutocompleteOption): void {
    this.addSizeTarget.set(option);
    this.addSizeSearch.set(option.value);
    this.addSizeResults.set([]);
  }

  protected confirmAddSize(): void {
    const currentDraft = this.draft();
    const target = this.addSizeTarget();
    if (!currentDraft || !target?.id) {
      this.toastService.show('error', 'Seleccione una talla del catálogo.');
      return;
    }

    if (currentDraft.sizes.some((size) => size.sizeId === target.id)) {
      this.toastService.show('error', 'Esa talla ya está en el producto.');
      return;
    }

    const reference = currentDraft.sizes[0];

    const snapshot = captureDraftSnapshot(currentDraft);

    this.addingSize.set(true);
    this.inventoryService
      .addSizeToProduct(currentDraft.productId, target.id, {
        barcode: '0',
        stock: 0,
        purchasePrice: reference?.purchasePrice ?? 0,
        salePrice: reference?.salePrice ?? 0,
        minSalePrice: reference?.minSalePrice ?? 0,
      })
      .pipe(
        finalize(() => this.addingSize.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toastService.show('success', `Talla "${target.value}" agregada al producto.`);
          this.closeAddSizeDialog();
          this.loadFullProduct(currentDraft.productId, snapshot);
        },
        error: (message: string) => this.toastService.show('error', message),
      });
  }

  protected openAddColorDialog(size: ReconciliationSizeDraft): void {
    if (!this.draft() || this.saving()) return;
    this.addColorCtx.set({
      productSizeId: size.id,
      sizeLabel: size.sizeLabel,
    });
    this.addColorMode.set('catalog');
    this.addColorTargetId.set(null);
    this.addColorNewName.set('');
    this.addColorInitialStock.set(0);
    this.addColorDialogVisible.set(true);
    this.ensureCatalogColorsLoaded();
  }

  protected closeAddColorDialog(): void {
    this.addColorDialogVisible.set(false);
    this.addColorCtx.set(null);
    this.addColorTargetId.set(null);
    this.addColorNewName.set('');
  }

  protected setAddColorMode(mode: 'catalog' | 'new'): void {
    this.addColorMode.set(mode);
  }

  protected onAddColorNewNameChange(value: string): void {
    this.addColorNewName.set(value);
  }

  protected onAddColorStockChange(value: string): void {
    const parsed = Number(value);
    this.addColorInitialStock.set(Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
  }

  protected confirmAddColor(): void {
    const currentDraft = this.draft();
    const ctx = this.addColorCtx();
    if (!currentDraft || !ctx) return;

    this.addingColor.set(true);
    const stock = Math.max(0, Math.trunc(this.addColorInitialStock()));
    const snapshot = captureDraftSnapshot(currentDraft);

    const attachColor = (colorId: number) =>
      this.inventoryService.addColorToProductSize(ctx.productSizeId, colorId, { stock }).pipe(
        switchMap(() =>
          stock > 0
            ? this.inventoryService.bulkUpdate(currentDraft.productId, {
                sizes: [{ id: ctx.productSizeId, colors: [{ colorId, stock }] }],
              })
            : of(null),
        ),
      );

    const colorId$: Observable<number | null> =
      this.addColorMode() === 'new'
        ? this.inventoryService.resolveOrCreateColorId(this.addColorNewName())
        : this.addColorTargetId() != null
          ? of(this.addColorTargetId() as number)
          : of<number | null>(null);

    colorId$
      .pipe(
        switchMap((colorId) => {
          if (colorId == null || colorId < 1) {
            throw new Error('Seleccione un color o escriba uno nuevo.');
          }
          return attachColor(colorId);
        }),
        finalize(() => this.addingColor.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toastService.show('success', 'Color agregado a la talla.');
          this.closeAddColorDialog();
          this.loadFullProduct(currentDraft.productId, snapshot);
        },
        error: (message: string) => this.toastService.show('error', message),
      });
  }

  protected openReplaceColorDialog(
    size: ReconciliationSizeDraft,
    color: ReconciliationColorDraft,
  ): void {
    if (this.replacingVariantColor() || this.saving()) return;

    this.replaceCtx.set({
      productSizeId: size.id,
      sizeLabel: size.sizeLabel,
      fromColorId: color.colorId,
      fromLabel: color.description,
      stock: Math.max(0, Math.trunc(Number(color.stock) || 0)),
    });
    this.replaceTargetColorId.set(null);
    this.replaceDialogVisible.set(true);
    this.ensureCatalogColorsLoaded();
  }

  protected closeReplaceColorDialog(): void {
    this.replaceDialogVisible.set(false);
    this.replaceCtx.set(null);
    this.replaceTargetColorId.set(null);
  }

  protected confirmReplaceVariantColor(): void {
    const currentDraft = this.draft();
    const ctx = this.replaceCtx();
    const toId = this.replaceTargetColorId();
    if (!currentDraft || !ctx || toId == null) {
      this.toastService.show('error', 'Seleccione el color destino en el catálogo.');
      return;
    }
    if (toId === ctx.fromColorId) {
      this.toastService.show('error', 'Elija un color distinto al actual.');
      return;
    }

    this.replacingVariantColor.set(true);
    const snapshot = captureDraftSnapshot(currentDraft);

    this.inventoryService
      .replaceVariantColor(currentDraft.productId, ctx.productSizeId, {
        fromColorId: ctx.fromColorId,
        toColorId: toId,
      })
      .pipe(
        finalize(() => this.replacingVariantColor.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.toastService.show('success', response.message ?? 'Color actualizado.');
          if (response.product) {
            this.applyProduct(response.product, snapshot, {
              productSizeId: ctx.productSizeId,
              fromColorId: ctx.fromColorId,
              toColorId: toId,
            });
          }
          this.closeReplaceColorDialog();
        },
        error: (message: string) => this.toastService.show('error', message),
      });
  }

  protected onReplaceColorSelected(value: number | null): void {
    this.replaceTargetColorId.set(value);
  }

  protected onAddColorSelected(value: number | null): void {
    this.addColorTargetId.set(value);
  }

  private loadLookups(): void {
    this.productLookupService
      .getGenders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (genders) => this.genders.set(genders),
      });

    this.productLookupService
      .getWarehouses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (warehouses) =>
          this.warehouseOptions.set(
            warehouses.map((warehouse: Warehouse) => ({
              label: warehouse.name,
              value: warehouse.id,
            })),
          ),
      });
  }

  private readNavigationState(): void {
    const state = (history.state ?? {}) as Partial<ReconciliationNavigationState>;
    if (state.productId && state.productName) {
      this.navigationHint.set(state as ReconciliationNavigationState);
      this.searchQuery.set(state.productName || String(state.productId));
    }
  }

  private loadFullProduct(
    id: number,
    preserveEditsFrom: ReconciliationDraft | null = null,
  ): void {
    this.loadingBundle.set(true);
    this.posSalesLoading.set(true);

    forkJoin({
      meta: this.productService.getOne(id),
      shelf: this.inventoryService.getProduct(id),
      posSales: this.inventoryService.getPosSalesSince(id),
    })
      .pipe(
        finalize(() => {
          this.loadingBundle.set(false);
          this.posSalesLoading.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ meta, shelf, posSales }) => {
          if (!shelf?.id) {
            this.toastService.show(
              'error',
              'No hay datos de inventario para este producto. Verifique el ID.',
            );
            return;
          }

          this.lastProductFromApi.set(meta);
          this.posSalesSummary.set(posSales);

          if (!preserveEditsFrom) {
            this.productFormModel.set({
              name: meta.name ?? '',
              genderId: meta.genderId ?? 1,
              warehouseId: meta.warehouseId ?? 1,
            });
          }

          this.applyProduct(shelf, preserveEditsFrom);
          this.searchQuery.set(
            meta.name?.trim() ||
              (meta.barcode ? String(meta.barcode) : '') ||
              String(id),
          );
          this.navigationHint.set(null);
        },
        error: (message: string) => {
          this.toastService.show('error', message);
        },
      });
  }

  private applyProduct(
    product: ReconciliationProduct,
    preserveEditsFrom?: ReconciliationDraft | null,
    colorReplace?: {
      productSizeId: number;
      fromColorId: number;
      toColorId: number;
    },
  ): void {
    const fresh = cloneProductToDraft(product);
    if (!preserveEditsFrom || preserveEditsFrom.productId !== fresh.productId) {
      this.draft.set(fresh);
    } else {
      this.draft.set(
        mergeDraftPreservingEdits(preserveEditsFrom, fresh, colorReplace),
      );
    }
    this.applyPosSalesToDraft(this.posSalesSummary());
  }

  private applyPosSalesToDraft(summary: ReconciliationPosSalesSummary | null): void {
    const currentDraft = this.draft();
    if (!currentDraft || !summary) return;

    const byVariant = new Map<string, (typeof summary.variants)[number]>();
    for (const variant of summary.variants ?? []) {
      byVariant.set(this.posVariantKey(variant.productSizeId, variant.colorId), variant);
    }

    this.draft.set({
      ...currentDraft,
      sizes: currentDraft.sizes.map((size) => {
        const masterVariant = byVariant.get(this.posVariantKey(size.id, null));
        return {
          ...size,
          posSoldQty: masterVariant?.quantitySold ?? 0,
          posSaleCount: masterVariant?.saleCount ?? 0,
          posLastSoldAt: masterVariant?.lastSoldAt ?? null,
          colors: size.colors.map((color) => {
            const variant = byVariant.get(
              this.posVariantKey(size.id, color.colorId),
            );
            return {
              ...color,
              posSoldQty: variant?.quantitySold ?? 0,
              posSaleCount: variant?.saleCount ?? 0,
              posLastSoldAt: variant?.lastSoldAt ?? null,
            };
          }),
        };
      }),
    });
  }

  private posVariantKey(productSizeId: number, colorId: number | null): string {
    return `${productSizeId}:${colorId ?? 'none'}`;
  }

  private removeColorVariant(
    size: ReconciliationSizeDraft,
    color: ReconciliationColorDraft,
  ): void {
    const currentDraft = this.draft();
    if (!currentDraft) return;

    this.removingColor.set(true);
    const snapshot = captureDraftSnapshot(currentDraft);

    this.inventoryService
      .removeColorVariant(size.id, color.colorId)
      .pipe(
        finalize(() => this.removingColor.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.confirmAction.set(null);
          this.toastService.show('success', 'Variante de color eliminada.');
          this.loadFullProduct(currentDraft.productId, snapshot);
        },
        error: (message: string) => this.toastService.show('error', message),
      });
  }

  private removeSizeVariant(size: ReconciliationSizeDraft): void {
    const currentDraft = this.draft();
    if (!currentDraft) return;

    this.removingSize.set(true);
    const snapshot = captureDraftSnapshot(currentDraft);

    this.inventoryService
      .removeSize(currentDraft.productId, size.sizeId)
      .pipe(
        finalize(() => this.removingSize.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.confirmAction.set(null);
          this.toastService.show('success', 'Talla eliminada.');
          this.loadFullProduct(currentDraft.productId, snapshot);
        },
        error: (message: string) => {
          if (
            message.toLowerCase().includes('foreign') ||
            message.toLowerCase().includes('constraint') ||
            message.toLowerCase().includes('referenc')
          ) {
            this.toastService.show(
              'error',
              'No se puede eliminar: esta talla tiene movimientos registrados. Deje el stock en 0.',
            );
            return;
          }
          this.toastService.show('error', message);
        },
      });
  }

  private ensureCatalogColorsLoaded(): void {
    if (this.catalogColors().length > 0 || this.catalogColorsLoading()) {
      return;
    }

    this.catalogColorsLoading.set(true);
    this.inventoryService
      .loadColorsCatalog()
      .pipe(
        finalize(() => this.catalogColorsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (colors) => this.catalogColors.set(colors),
        error: (message: string) => this.toastService.show('error', message),
      });
  }

  private clearWorkspace(navigate: boolean): void {
    this.draft.set(null);
    this.posSalesSummary.set(null);
    this.lastProductFromApi.set(null);
    this.productFormModel.set({ name: '', genderId: 1, warehouseId: 1 });
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.searchResultsVisible.set(false);
    this.closeReplaceColorDialog();
    this.closeAddSizeDialog();
    this.closeAddColorDialog();
    this.confirmAction.set(null);

    if (navigate) {
      void this.router.navigate(['/inventories/reconciliations'], {
        replaceUrl: true,
      });
    }
  }

  private focusSearch(): void {
    setTimeout(
      () =>
        this.searchInput()
          ?.nativeElement.querySelector<HTMLInputElement>('input')
          ?.focus(),
      0,
    );
  }

  private formatPosSaleDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

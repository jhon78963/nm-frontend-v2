import {
  AfterViewInit,
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
import { finalize, forkJoin, switchMap } from 'rxjs';
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
  cloneProductToDraft,
  colorStockSum,
  createLocalColorId,
  createLocalSizeId,
  effectiveSizeStock,
  getActiveColors,
  getActiveSizes,
  hasColorBreakdown,
  isColorZeroStock,
  isLocalColorId,
  isLocalSizeId,
  isSizeZeroStock,
  mergeDraftPreservingEdits,
  sortedColors,
  sortedSizes,
} from '../../utils/reconciliation-draft.util';

interface ProductFormSlice {
  name: string;
  genderId: string;
  warehouseId: string;
}

type ConfirmAction =
  | { type: 'remove-color'; size: ReconciliationSizeDraft; color: ReconciliationColorDraft }
  | { type: 'remove-size'; size: ReconciliationSizeDraft }
  | { type: 'bulk-delete' };

type ReconciliationTableRow =
  | { kind: 'size'; trackKey: string; size: ReconciliationSizeDraft }
  | { kind: 'color'; trackKey: string; size: ReconciliationSizeDraft; color: ReconciliationColorDraft };

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
  styleUrl: './inventory-reconciliation.component.scss',
})
export class InventoryReconciliationComponent implements OnInit, AfterViewInit {
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
  protected readonly warehouseOptions = signal<SelectOption<string>[]>([]);

  protected readonly draft = signal<ReconciliationDraft | null>(null);
  protected readonly posSalesSummary = signal<ReconciliationPosSalesSummary | null>(null);
  protected readonly lastProductFromApi = signal<Product | null>(null);
  protected readonly navigationHint = signal<ReconciliationNavigationState | null>(null);

  protected readonly replaceDialogVisible = signal(false);
  protected readonly replaceTargetColorId = signal<string | null>(null);
  protected readonly catalogColors = signal<CatalogColorOption[]>([]);
  protected readonly catalogColorsLoading = signal(false);
  protected readonly replacingVariantColor = signal(false);
  protected readonly replaceCtx = signal<{
    productSizeId: string;
    sizeLabel: string;
    fromColorId: string;
    fromLabel: string;
    stock: number;
  } | null>(null);

  protected readonly addSizeDialogVisible = signal(false);
  protected readonly addSizeSearch = signal('');
  protected readonly addSizeResults = signal<AutocompleteOption[]>([]);
  protected readonly addSizeTarget = signal<AutocompleteOption | null>(null);
  protected readonly addingSize = signal(false);

  protected readonly addColorDialogVisible = signal(false);
  protected readonly addColorCtx = signal<{ productSizeId: string; sizeLabel: string } | null>(null);
  protected readonly addColorMode = signal<'catalog' | 'new'>('catalog');
  protected readonly addColorTargetId = signal<string | null>(null);
  protected readonly addColorNewName = signal('');
  protected readonly addColorInitialStock = signal(0);
  protected readonly addingColor = signal(false);

  protected readonly removingColor = signal(false);
  protected readonly removingSize = signal(false);
  protected readonly bulkDeleting = signal(false);
  protected readonly bulkSelectionKeys = signal<string[]>([]);
  protected readonly confirmAction = signal<ConfirmAction | null>(null);

  protected readonly productFormModel = signal<ProductFormSlice>({
    name: '',
    genderId: '',
    warehouseId: '',
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

  protected readonly genderSelectOptions = computed<SelectOption<string>[]>(() =>
    this.genders().map((gender) => ({
      label: gender.description,
      value: gender.id,
    })),
  );

  protected readonly sortedSizes = computed(() => sortedSizes(this.draft()));
  protected readonly inventoryTableRows = computed((): ReconciliationTableRow[] => {
    const rows: ReconciliationTableRow[] = [];
    for (const size of this.sortedSizes()) {
      rows.push({ kind: 'size', trackKey: `s-${size.id}`, size });
      for (const color of sortedColors(size)) {
        rows.push({
          kind: 'color',
          trackKey: `c-${size.id}-${color.colorId}`,
          size,
          color,
        });
      }
    }
    return rows;
  });
  protected readonly trackReconciliationRow = (row: ReconciliationTableRow): string =>
    row.trackKey;
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

  protected readonly replaceColorOptions = computed<SelectOption<string>[]>(() => {
    const fromId = this.replaceCtx()?.fromColorId;
    return this.catalogColors()
      .filter((color) => color.id !== fromId)
      .map((color) => ({ label: color.description, value: color.id }));
  });

  protected readonly addColorOptions = computed<SelectOption<string>[]>(() => {
    const ctx = this.addColorCtx();
    const size = this.draft()?.sizes.find((item) => item.id === ctx?.productSizeId);
    const used = new Set(
      (size ? getActiveColors(size) : []).map((color) => color.colorId),
    );
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
      return {
        title: 'Eliminar variante de color',
        message:
          `¿Quitar "${action.color.description}" de la talla ${action.size.sizeLabel}? ` +
          'El cambio se aplicará al guardar el inventario. Las ventas y el kardex anteriores se conservan.',
        loading: false,
      };
    }

    if (action.type === 'remove-size') {
      const colorNote =
        getActiveColors(action.size).length > 0
          ? ` También se quitarán ${getActiveColors(action.size).length} color(es) asociados.`
          : '';

      return {
        title: 'Eliminar talla',
        message:
          `¿Eliminar la talla ${action.size.sizeLabel} de este producto?${colorNote} ` +
          'El cambio se aplicará al guardar el inventario. Las ventas anteriores se conservan en historial.',
        loading: false,
      };
    }

    const { sizesToDelete, colorsToDelete } = this.collectBulkDeleteTargets();
    const parts: string[] = [];
    if (sizesToDelete.length > 0) {
      parts.push(
        `${sizesToDelete.length} talla${sizesToDelete.length === 1 ? '' : 's'}`,
      );
    }
    if (colorsToDelete.length > 0) {
      parts.push(
        `${colorsToDelete.length} color${colorsToDelete.length === 1 ? '' : 'es'}`,
      );
    }

    const withStock = colorsToDelete.filter(
      ({ color }) => Math.max(0, Math.trunc(Number(color.stock) || 0)) > 0,
    ).length;
    const stockNote =
      withStock > 0
        ? ` ${withStock} variante${withStock === 1 ? '' : 's'} con stock se pondrá${withStock === 1 ? '' : 'n'} en 0 al guardar.`
        : '';

    return {
      title: 'Eliminar seleccionados',
      message:
        `¿Eliminar ${parts.join(' y ')}?${stockNote} ` +
        'Los cambios se aplicarán al guardar el inventario. Las ventas, tickets de caja y kardex anteriores se conservan.',
      loading: false,
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

      if (!raw) {
        this.toastService.show('error', 'ID de producto inválido.');
        void this.router.navigate(['/inventories/reconciliations'], {
          replaceUrl: true,
        });
        return;
      }

      this.loadFullProduct(raw);
    });
  }

  ngAfterViewInit(): void {
    this.focusSearch();
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

  protected openProduct(id: string): void {
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
      name: formValues.name,
      genderId: formValues.genderId,
      warehouseId: formValues.warehouseId,
      barcode: base.barcode,
      description: base.description,
      status: base.status,
      percentageDiscount: base.percentageDiscount,
      cashDiscount: base.cashDiscount,
      isFeatured: base.isFeatured,
      isOnSale: base.isOnSale,
      wooStatus: base.wooStatus,
    };

    this.saving.set(true);
    this.productService
      .update(currentDraft.productId, productPayload)
      .pipe(
        switchMap(() =>
          this.inventoryService.persistReconciliationDraft(
            currentDraft.productId,
            currentDraft,
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
      'Cuente solo lo que queda en anaquel; no incluya piezas ya entregadas al cliente.',
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
      !this.bulkDeleting() &&
      !this.addingColor() &&
      !this.addingSize() &&
      effectiveSizeStock(size) === 0
    );
  }

  protected bulkSelectionCount(): number {
    return this.bulkSelectionKeys().length;
  }

  protected hasBulkSelection(): boolean {
    return this.bulkSelectionCount() > 0;
  }

  protected isBulkSelectedSize(size: ReconciliationSizeDraft): boolean {
    return this.bulkSelectionKeys().includes(this.sizeSelectionKey(size));
  }

  protected isBulkSelectedColor(
    size: ReconciliationSizeDraft,
    color: ReconciliationColorDraft,
  ): boolean {
    return this.bulkSelectionKeys().includes(
      this.colorSelectionKey(size, color),
    );
  }

  protected canBulkSelectSize(size: ReconciliationSizeDraft): boolean {
    return (
      !this.saving() &&
      !this.bulkDeleting() &&
      !this.removingSize() &&
      !this.removingColor() &&
      effectiveSizeStock(size) === 0
    );
  }

  protected canBulkSelectColor(size: ReconciliationSizeDraft): boolean {
    return (
      !this.saving() &&
      !this.bulkDeleting() &&
      !this.removingSize() &&
      !this.removingColor() &&
      !this.isBulkSelectedSize(size)
    );
  }

  protected onBulkSelectSizeChange(
    size: ReconciliationSizeDraft,
    checked: boolean,
  ): void {
    const key = this.sizeSelectionKey(size);
    this.updateBulkSelection((selection) => {
      if (checked) {
        selection.add(key);
        for (const color of size.colors) {
          selection.delete(this.colorSelectionKey(size, color));
        }
      } else {
        selection.delete(key);
      }
    });
  }

  protected onBulkSelectColorChange(
    size: ReconciliationSizeDraft,
    color: ReconciliationColorDraft,
    checked: boolean,
  ): void {
    const key = this.colorSelectionKey(size, color);
    this.updateBulkSelection((selection) => {
      if (checked) {
        selection.add(key);
      } else {
        selection.delete(key);
      }
    });
  }

  protected bulkSizeSelectTooltip(size: ReconciliationSizeDraft): string {
    if (effectiveSizeStock(size) > 0) {
      return 'Solo puede seleccionar tallas con stock 0 para eliminar';
    }
    return 'Seleccionar talla para eliminar';
  }

  protected bulkDeleteButtonLabel(): string {
    const count = this.bulkSelectionCount();
    if (count === 0) {
      return 'Eliminar seleccionados';
    }
    return `Eliminar seleccionados (${count})`;
  }

  protected confirmBulkDelete(): void {
    if (
      !this.draft() ||
      !this.hasBulkSelection() ||
      this.bulkDeleting() ||
      this.saving()
    ) {
      return;
    }

    const { sizesToDelete, colorsToDelete } = this.collectBulkDeleteTargets();
    if (sizesToDelete.length + colorsToDelete.length === 0) {
      this.clearBulkSelection();
      return;
    }

    this.confirmAction.set({ type: 'bulk-delete' });
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

    if (action.type === 'remove-size') {
      this.removeSizeVariant(action.size);
      return;
    }

    this.executeBulkDelete();
  }

  protected updateSizeField<K extends keyof ReconciliationSizeDraft>(
    sizeId: string,
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
    sizeId: string,
    colorId: string,
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
    sizeId: string,
    colorId: string,
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
      classes.push('reconciliation-row-zero');
    } else {
      if (color.stockReviewed) classes.push('reconciliation-row-reviewed');
      if (this.colorPosSoldQty(color) > 0) {
        classes.push('reconciliation-row-pos-sold');
      }
    }
    return classes.join(' ');
  }

  protected sizeRowClasses(size: ReconciliationSizeDraft): string {
    return isSizeZeroStock(size) ? 'reconciliation-row-zero' : '';
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

    if (getActiveSizes(currentDraft).some((size) => size.sizeId === target.id)) {
      this.toastService.show('error', 'Esa talla ya está en el producto.');
      return;
    }

    const reference = getActiveSizes(currentDraft)[0];
    const newSize: ReconciliationSizeDraft = {
      id: createLocalSizeId(),
      sizeId: target.id,
      sizeLabel: target.value,
      barcode: '0',
      masterStock: 0,
      serverMasterStock: 0,
      shelfInconsistentOnLoad: false,
      purchasePrice: reference?.purchasePrice ?? null,
      salePrice: reference?.salePrice ?? null,
      minSalePrice: reference?.minSalePrice ?? null,
      colors: [],
      posSoldQty: 0,
      posSaleCount: 0,
      posLastSoldAt: null,
      isNew: true,
    };

    this.draft.update((draft) =>
      draft ? { ...draft, sizes: [...draft.sizes, newSize] } : draft,
    );
    this.toastService.show(
      'success',
      `Talla "${target.value}" agregada. Guarde el inventario para aplicar los cambios.`,
    );
    this.closeAddSizeDialog();
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

    const stock = Math.max(0, Math.trunc(this.addColorInitialStock()));
    const size = currentDraft.sizes.find((item) => item.id === ctx.productSizeId);
    let newColor: ReconciliationColorDraft;

    if (this.addColorMode() === 'new') {
      const label = this.addColorNewName().trim();
      if (!label) {
        this.toastService.show('error', 'Escriba el nombre del color.');
        return;
      }
      if (
        size &&
        getActiveColors(size).some(
          (color) => color.description.trim().toLowerCase() === label.toLowerCase(),
        )
      ) {
        this.toastService.show('error', 'Ese color ya está en la talla.');
        return;
      }
      newColor = {
        colorId: createLocalColorId(),
        description: label,
        pendingColorLabel: label,
        stock,
        baselineStock: stock,
        stockReviewed: false,
        posSoldQty: 0,
        posSaleCount: 0,
        posLastSoldAt: null,
        isNew: true,
      };
    } else {
      const colorId = this.addColorTargetId();
      if (!colorId) {
        this.toastService.show('error', 'Seleccione un color del catálogo.');
        return;
      }
      if (size && getActiveColors(size).some((color) => color.colorId === colorId)) {
        this.toastService.show('error', 'Ese color ya está en la talla.');
        return;
      }
      const catalogColor = this.catalogColors().find((color) => color.id === colorId);
      newColor = {
        colorId,
        description: catalogColor?.description ?? `Color #${colorId}`,
        stock,
        baselineStock: stock,
        stockReviewed: false,
        posSoldQty: 0,
        posSaleCount: 0,
        posLastSoldAt: null,
        isNew: true,
      };
    }

    this.draft.update((draft) => {
      if (!draft) return draft;
      return {
        ...draft,
        sizes: draft.sizes.map((item) => {
          if (item.id !== ctx.productSizeId) return item;
          return { ...item, colors: [...item.colors, newColor] };
        }),
      };
    });

    this.toastService.show(
      'success',
      'Color agregado. Guarde el inventario para aplicar los cambios.',
    );
    this.closeAddColorDialog();
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

    const target = this.catalogColors().find((color) => color.id === toId);
    const fromColor = currentDraft.sizes
      .find((size) => size.id === ctx.productSizeId)
      ?.colors.find((color) => color.colorId === ctx.fromColorId);

    this.draft.update((draft) => {
      if (!draft) return draft;

      let pending = [...(draft.pendingColorReplaces ?? [])].filter(
        (replace) =>
          !(
            replace.productSizeId === ctx.productSizeId &&
            replace.fromColorId === ctx.fromColorId
          ),
      );

      const shouldQueueReplace =
        fromColor &&
        !fromColor.isNew &&
        !isLocalSizeId(ctx.productSizeId) &&
        !isLocalColorId(ctx.fromColorId) &&
        !isLocalColorId(toId);

      if (shouldQueueReplace) {
        pending.push({
          productSizeId: ctx.productSizeId,
          fromColorId: ctx.fromColorId,
          toColorId: toId,
        });
      }

      return {
        ...draft,
        pendingColorReplaces: pending,
        sizes: draft.sizes.map((size) => {
          if (size.id !== ctx.productSizeId) return size;
          return {
            ...size,
            colors: size.colors.map((color) => {
              if (color.colorId !== ctx.fromColorId) return color;
              return {
                ...color,
                colorId: toId,
                description: target?.description ?? color.description,
                pendingColorLabel: color.isNew ? undefined : color.pendingColorLabel,
              };
            }),
          };
        }),
      };
    });

    this.toastService.show(
      'success',
      'Color actualizado. Guarde el inventario para aplicar los cambios.',
    );
    this.closeReplaceColorDialog();
  }

  protected onReplaceColorSelected(value: string | null): void {
    this.replaceTargetColorId.set(value);
  }

  protected onAddColorSelected(value: string | null): void {
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
    id: string,
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
              genderId: meta.genderId ?? '',
              warehouseId: meta.warehouseId ?? '',
            });
          }

          this.applyProduct(shelf, preserveEditsFrom);
          this.searchQuery.set(
            meta.name?.trim() ||
              (meta.barcode ? String(meta.barcode) : '') ||
              String(id),
          );
          this.navigationHint.set(null);
          if (!preserveEditsFrom) {
            this.clearBulkSelection();
          }
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
      productSizeId: string;
      fromColorId: string;
      toColorId: string;
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

  private posVariantKey(productSizeId: string, colorId: string | null): string {
    return `${productSizeId}:${colorId ?? 'none'}`;
  }

  private executeBulkDelete(): void {
    const currentDraft = this.draft();
    if (!currentDraft) return;

    const { sizesToDelete, colorsToDelete } = this.collectBulkDeleteTargets();
    if (sizesToDelete.length === 0 && colorsToDelete.length === 0) {
      this.clearBulkSelection();
      this.confirmAction.set(null);
      return;
    }

    const sizeIds = new Set(sizesToDelete.map((size) => size.id));
    const colorKeys = new Set(
      colorsToDelete.map(({ size, color }) => `${size.id}:${color.colorId}`),
    );
    const total = sizesToDelete.length + colorsToDelete.length;

    this.draft.update((draft) => {
      if (!draft) return draft;
      return {
        ...draft,
        sizes: draft.sizes
          .filter((size) => !(sizeIds.has(size.id) && size.isNew))
          .map((size) => {
            if (sizeIds.has(size.id) && !size.isNew) {
              return { ...size, isRemoved: true };
            }

            return {
              ...size,
              colors: size.colors
                .filter((color) => {
                  const key = `${size.id}:${color.colorId}`;
                  return !(colorKeys.has(key) && color.isNew);
                })
                .map((color) => {
                  const key = `${size.id}:${color.colorId}`;
                  if (colorKeys.has(key) && !color.isNew) {
                    return { ...color, isRemoved: true };
                  }
                  return color;
                }),
            };
          }),
      };
    });

    this.clearBulkSelection();
    this.confirmAction.set(null);
    this.toastService.show(
      'success',
      `${total} elemento${total === 1 ? '' : 's'} eliminado${total === 1 ? '' : 's'}. ` +
        'Guarde el inventario para aplicar los cambios.',
    );
  }

  private collectBulkDeleteTargets(): {
    sizesToDelete: ReconciliationSizeDraft[];
    colorsToDelete: Array<{
      size: ReconciliationSizeDraft;
      color: ReconciliationColorDraft;
    }>;
  } {
    const currentDraft = this.draft();
    const sizesToDelete: ReconciliationSizeDraft[] = [];
    const colorsToDelete: Array<{
      size: ReconciliationSizeDraft;
      color: ReconciliationColorDraft;
    }> = [];

    if (!currentDraft) {
      return { sizesToDelete, colorsToDelete };
    }

    for (const size of currentDraft.sizes) {
      if (this.isBulkSelectedSize(size)) {
        sizesToDelete.push(size);
        continue;
      }
      for (const color of size.colors) {
        if (this.isBulkSelectedColor(size, color)) {
          colorsToDelete.push({ size, color });
        }
      }
    }

    return { sizesToDelete, colorsToDelete };
  }

  private clearBulkSelection(): void {
    this.bulkSelectionKeys.set([]);
  }

  private updateBulkSelection(mutator: (selection: Set<string>) => void): void {
    const next = new Set(this.bulkSelectionKeys());
    mutator(next);
    this.bulkSelectionKeys.set([...next]);
  }

  private sizeSelectionKey(size: ReconciliationSizeDraft): string {
    return `s:${size.id}`;
  }

  private colorSelectionKey(
    size: ReconciliationSizeDraft,
    color: ReconciliationColorDraft,
  ): string {
    return `c:${size.id}:${color.colorId}`;
  }

  private removeColorVariant(
    size: ReconciliationSizeDraft,
    color: ReconciliationColorDraft,
  ): void {
    this.draft.update((draft) => {
      if (!draft) return draft;
      return {
        ...draft,
        sizes: draft.sizes.map((item) => {
          if (item.id !== size.id) return item;
          if (color.isNew) {
            return {
              ...item,
              colors: item.colors.filter((entry) => entry.colorId !== color.colorId),
            };
          }
          return {
            ...item,
            colors: item.colors.map((entry) =>
              entry.colorId === color.colorId ? { ...entry, isRemoved: true } : entry,
            ),
          };
        }),
      };
    });
    this.confirmAction.set(null);
    this.toastService.show(
      'success',
      'Variante de color eliminada. Guarde el inventario para aplicar los cambios.',
    );
  }

  private removeSizeVariant(size: ReconciliationSizeDraft): void {
    this.draft.update((draft) => {
      if (!draft) return draft;
      if (size.isNew) {
        return { ...draft, sizes: draft.sizes.filter((item) => item.id !== size.id) };
      }
      return {
        ...draft,
        sizes: draft.sizes.map((item) =>
          item.id === size.id ? { ...item, isRemoved: true } : item,
        ),
      };
    });
    this.confirmAction.set(null);
    this.toastService.show(
      'success',
      'Talla eliminada. Guarde el inventario para aplicar los cambios.',
    );
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
    this.productFormModel.set({ name: '', genderId: '', warehouseId: '' });
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.searchResultsVisible.set(false);
    this.closeReplaceColorDialog();
    this.closeAddSizeDialog();
    this.closeAddColorDialog();
    this.confirmAction.set(null);
    this.clearBulkSelection();

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

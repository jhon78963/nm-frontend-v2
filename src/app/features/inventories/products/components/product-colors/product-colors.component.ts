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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, concat, of } from 'rxjs';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { ProductColorsService } from '../../data-access/product-colors.service';
import {
  ProductColorSizeOption,
  ProductColorVariantRow,
} from '../../models/product.model';

type ColorFilterStatus = 'all' | 'active' | 'inactive';

interface StoredSizeSelection {
  id: number;
  productSizeId?: number;
  description?: string;
  stock?: number;
  productId: number;
}

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  action: () => void;
}

const SELECTED_SIZE_KEY = 'selectedSize';

@Component({
  selector: 'app-product-colors',
  imports: [FormsModule, RouterLink, ButtonComponent, ConfirmDialogComponent],
  templateUrl: './product-colors.component.html',
})
export class ProductColorsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly colorsService = inject(ProductColorsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  private catalogSelectedSizeId: number | null = null;

  protected readonly productId = signal<number | null>(null);
  protected readonly loadingSizes = signal(true);
  protected readonly saving = signal(false);
  protected readonly sizes = signal<ProductColorSizeOption[]>([]);
  protected readonly colors = signal<ProductColorVariantRow[]>([]);
  protected readonly catalogColorsPending = signal(false);
  protected readonly selectedSize = signal<ProductColorSizeOption | null>(null);
  protected readonly sizeSearch = signal('');
  protected readonly filterStatus = signal<ColorFilterStatus>('all');
  protected readonly highlightedColorId = signal<number | null>(null);
  protected readonly colorJumpSearch = signal('');
  protected readonly colorJumpOpen = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly confirmLoading = signal(false);
  protected readonly confirmState = signal<ConfirmState | null>(null);
  protected readonly createModalOpen = signal(false);
  protected readonly creatingColor = signal(false);
  protected readonly newColorDescription = signal('');
  protected readonly newColorHash = signal('#000000');

  private readonly panelStockSourceEpoch = signal(0);
  private readonly colorJumpInputRef = viewChild<ElementRef<HTMLInputElement>>('colorJumpInput');

  protected readonly filteredSizeOptions = computed(() => {
    const query = this.sizeSearch().trim().toLowerCase();
    const rows = this.sizes();
    if (!query) {
      return rows;
    }
    return rows.filter((size) =>
      size.description.toLowerCase().includes(query),
    );
  });

  protected readonly attachedColors = computed(() =>
    this.colors().filter((color) => color.variantAttached),
  );

  protected readonly removableAttachedColors = computed(() =>
    this.attachedColors().filter((color) => !!color.isExists),
  );

  protected readonly totalAssignedStock = computed(() => {
    if (this.catalogColorsPending()) {
      return 0;
    }
    return this.colors().reduce((acc, color) => {
      if (!color.variantAttached) {
        return acc;
      }
      return acc + (Number(color.stock) || 0);
    }, 0);
  });

  protected readonly masterProductSizeStock = computed(() => {
    this.panelStockSourceEpoch();
    const size = this.selectedSize();
    const id = size?.id;
    if (id == null) {
      return 0;
    }

    const row = this.sizes().find((item) => Number(item.id) === Number(id));
    if (
      row != null &&
      row.stock !== undefined &&
      row.stock !== null &&
      `${row.stock}`.trim() !== ''
    ) {
      const n = Number(row.stock);
      if (!Number.isNaN(n)) {
        return Math.max(0, Math.trunc(n));
      }
    }

    return Math.max(0, Math.trunc(Number(size?.stock ?? 0) || 0));
  });

  protected readonly remainingStock = computed(
    () => this.masterProductSizeStock() - this.totalAssignedStock(),
  );

  protected readonly isStockBalanced = computed(
    () => this.totalAssignedStock() === this.masterProductSizeStock(),
  );

  protected readonly effectiveStockBalancedForPanel = computed(
    () => this.catalogColorsPending() || this.isStockBalanced(),
  );

  protected readonly stockAssignPercent = computed(() => {
    const master = this.masterProductSizeStock();
    const assigned = this.totalAssignedStock();
    if (this.catalogColorsPending() || master <= 0) {
      return assigned > 0 && !this.catalogColorsPending() ? 100 : 0;
    }
    const pct = (assigned / master) * 100;
    return Math.min(100, Math.round(pct));
  });

  protected readonly progressBarClass = computed(() => {
    if (this.catalogColorsPending() || this.isStockBalanced()) {
      return 'bg-emerald-500';
    }
    if (this.remainingStock() < 0) {
      return 'bg-red-500';
    }
    return 'bg-amber-500';
  });

  protected readonly variantVsMasterRatioPercent = computed((): number | null => {
    if (this.catalogColorsPending()) {
      return null;
    }
    const master = this.masterProductSizeStock();
    if (master <= 0) {
      return null;
    }
    return Math.round((this.totalAssignedStock() / master) * 100);
  });

  protected readonly filteredColors = computed(() => {
    const status = this.filterStatus();
    return this.colors()
      .filter((color) => {
        const stockNum = Number(color.stock) || 0;
        if (status === 'all') {
          return true;
        }
        if (status === 'active') {
          return !!color.variantAttached && stockNum > 0;
        }
        return !!color.variantAttached && stockNum === 0;
      })
      .sort((a, b) => {
        const wa = Number(a.stock) || 0;
        const wb = Number(b.stock) || 0;
        const aa = a.variantAttached && wa > 0 ? 1 : 0;
        const bb = b.variantAttached && wb > 0 ? 1 : 0;
        return bb - aa;
      });
  });

  protected readonly colorJumpSuggestions = computed(() => {
    const q = this.colorJumpSearch().trim().toLowerCase();
    const rows = this.colors();
    if (!q) {
      return rows.slice(0, 50);
    }
    return rows
      .filter((color) =>
        String(color.description ?? '')
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 60);
  });

  protected readonly attachedCount = computed(() => this.attachedColors().length);
  protected readonly activeVariantCount = computed(
    () =>
      this.attachedColors().filter((color) => (Number(color.stock) || 0) > 0)
        .length,
  );

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('id');
    this.productId.set(id ? Number(id) : null);

    const productId = this.productId();
    if (productId) {
      this.loadSizes();
      this.restoreSelectedSize(productId);
    } else {
      this.loadingSizes.set(false);
    }
  }

  protected onSizeSearchInput(value: string): void {
    this.sizeSearch.set(value);
    this.loadSizes(value);
  }

  protected onSizeSelect(sizeId: string): void {
    if (!sizeId) {
      this.clearSizeSelection();
      return;
    }

    const sid = Number(sizeId);
    const size = this.sizes().find((item) => Number(item.id) === sid);
    if (!size) {
      return;
    }

    this.catalogSelectedSizeId = sid;
    this.selectedSize.set(size);
    this.persistSelectedSizeSnapshot();
    this.catalogColorsPending.set(true);
    this.colors.set([]);
    this.bumpPanelStockSourceEpoch();
    this.loadColors(sid);
  }

  protected setFilterStatus(status: ColorFilterStatus): void {
    this.filterStatus.set(status);
  }

  protected isFilterActive(status: ColorFilterStatus): boolean {
    return this.filterStatus() === status;
  }

  protected onVariantAttachedChange(
    color: ProductColorVariantRow,
    nextChecked: boolean,
  ): void {
    if (nextChecked) {
      color.variantAttached = true;
      color.stock = Math.max(0, Math.trunc(Number(color.stock) || 0));
      this.colors.update((rows) => [...rows]);
      return;
    }

    if (color.isExists) {
      color.variantAttached = true;
      this.colors.update((rows) => [...rows]);
      this.openConfirm({
        title: 'Quitar variante de color',
        message: `"${color.description}" ya está enlazado a esta talla. ¿Eliminar esta variante? Se eliminará la relación en el servidor.`,
        confirmLabel: 'Sí, eliminar',
        action: () => this.detachVariantWithApi(color),
      });
      return;
    }

    color.variantAttached = false;
    this.colors.update((rows) => [...rows]);
  }

  protected onStockChange(color: ProductColorVariantRow): void {
    const stockNum = Math.max(
      0,
      Math.trunc(Number(color.stock === '' as unknown ? 0 : color.stock) || 0),
    );
    color.stock = stockNum;
    this.colors.update((currentColors) => [...currentColors]);
  }

  protected onColorJumpInput(value: string): void {
    this.colorJumpSearch.set(value);
    this.colorJumpOpen.set(true);
  }

  protected onColorJumpFocus(): void {
    this.colorJumpOpen.set(true);
  }

  protected onColorJumpBlur(): void {
    setTimeout(() => this.colorJumpOpen.set(false), 150);
  }

  protected onColorJumpKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }

    const q = this.colorJumpSearch().trim().toLowerCase();
    if (!q) {
      return;
    }

    const rows = this.colors();
    const exact = rows.find(
      (color) =>
        String(color.description ?? '')
          .trim()
          .toLowerCase() === q,
    );
    const suggestions = this.colorJumpSuggestions();
    const single = suggestions.length === 1 ? suggestions[0] : null;
    const pick = exact ?? single;
    if (!pick?.id) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.focusColorInTable(pick);
  }

  protected selectJumpColor(color: ProductColorVariantRow): void {
    this.focusColorInTable(color);
  }

  protected openCreateColorModal(): void {
    this.newColorDescription.set('');
    this.newColorHash.set('#000000');
    this.createModalOpen.set(true);
  }

  protected closeCreateColorModal(): void {
    if (!this.creatingColor()) {
      this.createModalOpen.set(false);
    }
  }

  protected saveNewColor(): void {
    const description = this.newColorDescription().trim();
    const hash = this.newColorHash().trim();

    if (!description) {
      this.toastService.show('error', 'Ingresa un nombre para el color.');
      return;
    }

    this.creatingColor.set(true);
    this.colorsService
      .createCatalogColor({ description, hash: hash || '#000000' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.creatingColor.set(false);
          this.createModalOpen.set(false);
          this.toastService.show('success', 'Color creado correctamente.');
          this.loadSizes(this.sizeSearch());
          this.reloadCurrentColors();
        },
        error: () => {
          this.creatingColor.set(false);
          this.toastService.show('error', 'No se pudo crear el color.');
        },
      });
  }

  protected saveAllSelectedColors(): void {
    const targets = this.attachedColors().filter(
      (color) => !!color.productSizeId && color.variantAttached === true,
    );

    if (!targets.length) {
      this.toastService.show('error', 'No hay variantes marcadas para guardar.');
      return;
    }

    this.saving.set(true);
    const requests = targets.map((color) => {
      const stockPayload = Math.max(0, Math.trunc(Number(color.stock)));
      const psId = color.productSizeId as number;

      if (color.isExists) {
        return this.colorsService
          .update(psId, color.id, { stock: stockPayload })
          .pipe(catchError(() => of(null)));
      }

      return this.colorsService
        .add(psId, color.id, { stock: stockPayload })
        .pipe(catchError(() => of(null)));
    });

    concat(...requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        complete: () => {
          this.saving.set(false);
          this.toastService.show('success', 'Cambios de color guardados.');
          this.reloadCurrentColors();
        },
        error: () => {
          this.saving.set(false);
          this.toastService.show('error', 'No se pudieron guardar todos los colores.');
          this.reloadCurrentColors();
        },
      });
  }

  protected deleteAllSelectedColors(): void {
    const removable = this.removableAttachedColors();
    if (!removable.length) {
      this.toastService.show(
        'error',
        'No hay variantes guardadas para eliminar (solo están pendientes sin guardar).',
      );
      return;
    }

    this.openConfirm({
      title: 'Quitar todas las variantes enlazadas',
      message: `Se eliminarán ${removable.length} variante(s) de color de esta talla. ¿Continuar?`,
      confirmLabel: 'Sí, quitar todas',
      action: () => this.executeBulkRemove(removable),
    });
  }

  protected saveColorVariant(color: ProductColorVariantRow): void {
    const psId = color.productSizeId;
    if (!psId) {
      this.toastService.show(
        'error',
        'No hay vínculo producto–talla; guarde primero la talla en inventario.',
      );
      return;
    }

    const stockPayload = Math.max(0, Math.trunc(Number(color.stock)));
    this.saving.set(true);

    const request$ = color.isExists
      ? this.colorsService.update(psId, color.id, { stock: stockPayload })
      : this.colorsService.add(psId, color.id, { stock: stockPayload });

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.toastService.show('success', 'Stock de color actualizado.');
        this.reloadCurrentColors();
      },
      error: () => {
        this.saving.set(false);
        this.toastService.show('error', 'Error al guardar la variante.');
        this.reloadCurrentColors();
      },
    });
  }

  protected removeColorVariant(color: ProductColorVariantRow): void {
    this.openConfirm({
      title: 'Quitar variante de color',
      message: `¿Eliminar "${color.description}" de esta talla?`,
      confirmLabel: 'Sí, eliminar',
      action: () => this.detachVariantWithApi(color),
    });
  }

  protected onConfirmDialog(): void {
    const state = this.confirmState();
    if (!state) {
      return;
    }

    this.confirmLoading.set(true);
    state.action();
  }

  protected onCancelDialog(): void {
    this.confirmOpen.set(false);
    this.confirmState.set(null);
  }

  protected isRowHighlighted(color: ProductColorVariantRow): boolean {
    return this.highlightedColorId() === color.id;
  }

  protected colorSwatchStyle(color: ProductColorVariantRow): string {
    const hex = color.hash ?? color.value ?? '#e5e7eb';
    return hex;
  }

  protected canSaveAll(): boolean {
    return (
      !!this.selectedSize() &&
      this.attachedColors().length > 0 &&
      this.isStockBalanced() &&
      !this.catalogColorsPending() &&
      !this.saving()
    );
  }

  protected canRemoveAll(): boolean {
    return (
      !!this.selectedSize() &&
      this.removableAttachedColors().length > 0 &&
      this.isStockBalanced() &&
      !this.catalogColorsPending() &&
      !this.saving()
    );
  }

  private openConfirm(state: Omit<ConfirmState, 'action'> & { action: () => void }): void {
    this.confirmState.set(state);
    this.confirmOpen.set(true);
  }

  private finishConfirm(): void {
    this.confirmLoading.set(false);
    this.confirmOpen.set(false);
    this.confirmState.set(null);
  }

  private loadSizes(sizeFilter?: string): void {
    const productId = this.productId();
    if (!productId) {
      return;
    }

    this.loadingSizes.set(true);
    this.colorsService
      .getSizes(productId, sizeFilter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sizesList) => {
          this.sizes.set(sizesList);
          this.pinSelectedSizeToOptions();
          this.bumpPanelStockSourceEpoch();
          this.loadingSizes.set(false);
        },
        error: () => {
          this.loadingSizes.set(false);
          this.toastService.show('error', 'No se pudieron cargar las tallas.');
        },
      });
  }

  private loadColors(sizeId: number): void {
    const productId = this.productId();
    if (!productId) {
      return;
    }

    const sid = Number(sizeId);
    this.catalogColorsPending.set(true);
    this.colors.set([]);

    this.colorsService
      .getColors(productId, sid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          if (
            sid !== this.catalogSelectedSizeId ||
            Number(this.selectedSize()?.id) !== sid
          ) {
            return;
          }

          this.colors.set(rows);
          this.catalogColorsPending.set(false);
          this.syncSizesProductSizeMeta(sid);
        },
        error: () => {
          if (sid === this.catalogSelectedSizeId) {
            this.catalogColorsPending.set(false);
            this.toastService.show('error', 'No se pudieron cargar los colores.');
          }
        },
      });
  }

  private reloadCurrentColors(): void {
    const size = this.selectedSize();
    if (size?.id != null) {
      this.loadColors(Number(size.id));
    }
  }

  private restoreSelectedSize(productId: number): void {
    const raw = localStorage.getItem(SELECTED_SIZE_KEY);
    if (!raw) {
      return;
    }

    let parsed: StoredSizeSelection;
    try {
      parsed = JSON.parse(raw) as StoredSizeSelection;
    } catch {
      localStorage.removeItem(SELECTED_SIZE_KEY);
      return;
    }

    if (parsed && Number(parsed.productId) === productId && parsed.id) {
      const selected: ProductColorSizeOption = {
        id: Number(parsed.id),
        productSizeId:
          parsed.productSizeId != null ? Number(parsed.productSizeId) : undefined,
        description: parsed.description ?? '',
        stock: Number(parsed.stock) || 0,
      };
      this.selectedSize.set(selected);
      this.catalogSelectedSizeId = selected.id;
      this.bumpPanelStockSourceEpoch();
      this.loadColors(selected.id);
    } else {
      localStorage.removeItem(SELECTED_SIZE_KEY);
    }
  }

  private pinSelectedSizeToOptions(): void {
    const current = this.selectedSize();
    if (!current?.id) {
      return;
    }

    const row = this.sizes().find((size) => Number(size.id) === Number(current.id));
    if (!row) {
      return;
    }

    row.productSizeId = row.productSizeId ?? current.productSizeId;
    this.selectedSize.set(row);
    this.persistSelectedSizeSnapshot();
    this.bumpPanelStockSourceEpoch();
  }

  private syncSizesProductSizeMeta(sizeId: number): void {
    const productId = this.productId();
    if (!productId) {
      return;
    }

    const sid = Number(sizeId);
    if (
      this.catalogSelectedSizeId !== sid ||
      !this.selectedSize() ||
      Number(this.selectedSize()?.id) !== sid
    ) {
      return;
    }

    this.colorsService
      .getSizes(productId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sizesList) => {
          if (
            sid !== this.catalogSelectedSizeId ||
            Number(this.selectedSize()?.id) !== sid
          ) {
            return;
          }

          this.sizes.set(sizesList);
          const row = sizesList.find((size) => Number(size.id) === sid);
          if (!row) {
            this.pinSelectedSizeToOptions();
            return;
          }

          const apiMaster =
            row.stock != null && !Number.isNaN(Number(row.stock))
              ? Math.max(0, Math.trunc(Number(row.stock)))
              : null;

          if (apiMaster !== null) {
            row.stock = apiMaster;
          }

          row.productSizeId = row.productSizeId ?? this.selectedSize()?.productSizeId;
          this.selectedSize.set(row);
          this.persistSelectedSizeSnapshot();
          this.bumpPanelStockSourceEpoch();
        },
      });
  }

  private persistSelectedSizeSnapshot(): void {
    const size = this.selectedSize();
    const productId = this.productId();
    if (!size || !productId) {
      return;
    }

    const payload: StoredSizeSelection = {
      ...size,
      productId,
    };
    localStorage.setItem(SELECTED_SIZE_KEY, JSON.stringify(payload));
  }

  private clearSizeSelection(): void {
    this.catalogSelectedSizeId = null;
    this.catalogColorsPending.set(false);
    this.selectedSize.set(null);
    this.colors.set([]);
    localStorage.removeItem(SELECTED_SIZE_KEY);
    this.bumpPanelStockSourceEpoch();
  }

  private detachVariantWithApi(color: ProductColorVariantRow): void {
    const psId = color.productSizeId;
    if (!psId) {
      this.finishConfirm();
      this.toastService.show('error', 'Falta el identificador de talla-producto.');
      return;
    }

    this.colorsService
      .remove(psId, color.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.finishConfirm();
          this.toastService.show('success', 'Variante de color eliminada.');
          this.reloadCurrentColors();
        },
        error: () => {
          this.finishConfirm();
          this.reloadCurrentColors();
        },
      });
  }

  private executeBulkRemove(colors: ProductColorVariantRow[]): void {
    const toRemove = colors.filter((color) => color.productSizeId != null);
    const requests = toRemove.map((color) =>
      this.colorsService
        .remove(color.productSizeId as number, color.id)
        .pipe(catchError(() => of(null))),
    );

    concat(...requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        complete: () => {
          this.finishConfirm();
          this.toastService.show('success', 'Colores removidos.');
          this.reloadCurrentColors();
        },
        error: () => {
          this.finishConfirm();
          this.toastService.show('error', 'No se pudieron remover todos los colores.');
          this.reloadCurrentColors();
        },
      });
  }

  private focusColorInTable(color: ProductColorVariantRow): void {
    if (this.filterStatus() !== 'all') {
      this.filterStatus.set('all');
    }
    this.scrollToColorRow(color);
    this.resetColorJumpSearch();
  }

  private scrollToColorRow(color: ProductColorVariantRow): void {
    this.highlightedColorId.set(color.id);
    setTimeout(() => {
      document.getElementById(`color-row-${color.id}`)?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }, 60);
    setTimeout(() => {
      if (this.highlightedColorId() === color.id) {
        this.highlightedColorId.set(null);
      }
    }, 2500);
  }

  private resetColorJumpSearch(): void {
    this.colorJumpSearch.set('');
    this.colorJumpOpen.set(false);
    queueMicrotask(() => this.colorJumpInputRef()?.nativeElement.focus());
  }

  private bumpPanelStockSourceEpoch(): void {
    this.panelStockSourceEpoch.update((value) => value + 1);
  }
}

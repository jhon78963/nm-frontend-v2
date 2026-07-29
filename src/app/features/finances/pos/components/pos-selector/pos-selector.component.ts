import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { PosService } from '../../data-access/pos.service';
import { CartItem, Variant } from '../../models/pos.model';

interface SelectionItem {
  variant: Variant;
  size: string;
  qty: number;
  price: number;
}

@Component({
  selector: 'app-pos-selector',
  imports: [DecimalPipe],
  templateUrl: './pos-selector.component.html',
  styleUrl: './pos-selector.component.scss',
})
export class PosSelectorComponent {
  protected readonly posService = inject(PosService);

  protected readonly pricingAlert = signal<string | null>(null);
  protected readonly activeSize = signal<string | null>(null);
  protected readonly selections = signal<Map<string, SelectionItem>>(new Map());

  protected readonly availableSizes = computed(() => {
    const prod = this.posService.modalState().product;
    return prod ? Object.keys(prod.variants) : [];
  });

  protected readonly currentSizeVariants = computed(() => {
    const prod = this.posService.modalState().product;
    const active = this.activeSize();
    if (!prod || !active) return [];
    return prod.variants[active] ?? [];
  });

  protected readonly totalModalItems = computed(() => {
    let count = 0;
    for (const item of this.selections().values()) count += item.qty;
    return count;
  });

  protected readonly totalModalPrice = computed(() => {
    let total = 0;
    for (const item of this.selections().values()) total += item.qty * item.price;
    return total;
  });

  // Sync selections when modal opens
  private readonly _modalEffect = effect(
    () => {
      const state = this.posService.modalState();
      untracked(() => {
        if (!state.isOpen || !state.product) return;

        const initialMap = new Map<string, SelectionItem>();
        this.pricingAlert.set(null);
        this.activeSize.set(null);

        // Pre-fill from cart
        const cartItems = this.posService.cart().filter((i) => i.productId === state.product!.id);
        cartItems.forEach((cartItem) => {
          const variantsInSize = state.product!.variants[cartItem.size] ?? [];
          const realVariant = variantsInSize.find(
            (v) => String(v.color_id) === String(cartItem.color.color_id),
          );
          if (realVariant) {
            initialMap.set(this.itemKey(cartItem.size, realVariant.color_id), {
              variant: realVariant,
              size: cartItem.size,
              qty: cartItem.quantity,
              price: cartItem.unitPrice,
            });
          }
        });

        this.selections.set(initialMap);

        // Determine which size tab to activate
        if (state.isEditing && state.editingCartItem) {
          this.activeSize.set(state.editingCartItem.size);
        } else {
          const scannedSku = state.product.sku;
          let foundSize: string | null = null;
          for (const sizeKey of Object.keys(state.product.variants)) {
            const hasMatch = state.product.variants[sizeKey].some((v) => v.sku === scannedSku);
            if (hasMatch) {
              foundSize = sizeKey;
              break;
            }
          }
          const sizes = Object.keys(state.product.variants);
          this.activeSize.set(foundSize ?? (sizes[0] ?? null));
        }
      });
    },
    { allowSignalWrites: true },
  );

  private itemKey(size: string, colorId: number | string): string {
    return `${size}_${String(colorId)}`;
  }

  protected variantStock(v: Variant): number {
    return v.inventory?.available_quantity ?? 0;
  }

  protected selectTabSize(size: string): void {
    this.activeSize.set(size);
  }

  protected toggleVariant(variant: Variant): void {
    const size = this.activeSize();
    if (!size || this.variantStock(variant) <= 0) return;

    const key = this.itemKey(size, variant.color_id);
    const map = new Map(this.selections());

    if (map.has(key)) {
      const current = map.get(key)!;
      map.set(key, { ...current, qty: current.qty + 1 });
    } else {
      map.set(key, { variant, size, qty: 1, price: variant.price });
    }

    this.selections.set(map);
  }

  protected updateQty(variant: Variant, delta: number, event: Event): void {
    event.stopPropagation();
    const size = this.activeSize();
    if (!size) return;

    const key = this.itemKey(size, variant.color_id);
    const map = new Map(this.selections());

    if (!map.has(key)) {
      if (delta > 0) this.toggleVariant(variant);
      return;
    }

    const item = map.get(key)!;
    const newQty = item.qty + delta;

    if (newQty <= 0) {
      map.delete(key);
    } else {
      map.set(key, { ...item, qty: newQty });
    }

    this.selections.set(map);
  }

  protected updatePrice(variant: Variant, event: Event): void {
    const size = this.activeSize();
    if (!size) return;

    const key = this.itemKey(size, variant.color_id);
    const map = new Map(this.selections());

    if (map.has(key)) {
      const newPrice = parseFloat((event.target as HTMLInputElement).value) || 0;
      map.set(key, { ...map.get(key)!, price: newPrice });
      this.selections.set(map);
      this.pricingAlert.set(null);
    }
  }

  protected getSelectionQty(variant: Variant): number {
    const size = this.activeSize();
    if (!size) return 0;
    return this.selections().get(this.itemKey(size, variant.color_id))?.qty ?? 0;
  }

  protected getSelectionPrice(variant: Variant): number {
    const size = this.activeSize();
    if (!size) return variant.price;
    return this.selections().get(this.itemKey(size, variant.color_id))?.price ?? variant.price;
  }

  protected hasSizeSelections(size: string): boolean {
    for (const [key, item] of this.selections()) {
      if (item.size === size && item.qty > 0) return true;
    }
    return false;
  }

  protected confirm(): void {
    const state = this.posService.modalState();
    if (!state.product) return;

    // Validate prices
    for (const selection of this.selections().values()) {
      const unit = Number(selection.price);
      if (!Number.isFinite(unit) || unit <= 0) {
        this.pricingAlert.set(
          'Precio inválido. Ingresa un valor mayor a 0 en todos los ítems seleccionados.',
        );
        return;
      }
    }
    this.pricingAlert.set(null);

    const currentCart = this.posService.cart();
    const existingItems = currentCart.filter((i) => i.productId === state.product!.id);
    const processedIds = new Set<number>();

    for (const selection of this.selections().values()) {
      const existing = existingItems.find(
        (i) =>
          i.size === selection.size &&
          String(i.color.color_id) === String(selection.variant.color_id),
      );

      if (existing) {
        const updated: CartItem = {
          ...existing,
          quantity: selection.qty,
          unitPrice: selection.price,
          total: selection.qty * selection.price,
          color: selection.variant,
        };
        this.posService.updateItem(updated);
        processedIds.add(existing.cartId);
      } else {
        const newItem: CartItem = {
          cartId: Date.now() + Math.random(),
          productId: state.product.id,
          sku: state.product.sku,
          name: state.product.name,
          size: selection.size,
          color: selection.variant,
          quantity: selection.qty,
          unitPrice: selection.price,
          total: selection.qty * selection.price,
        };
        this.posService.addItem(newItem);
      }
    }

    // Remove variants that were deselected
    for (const item of existingItems) {
      if (!processedIds.has(item.cartId)) {
        this.posService.removeItem(item.cartId);
      }
    }

    this.posService.closeModal();
  }
}

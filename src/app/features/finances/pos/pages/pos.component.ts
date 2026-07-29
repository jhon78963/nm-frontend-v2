import { DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { AuthService } from '../../../auth/data-access/auth.service';
import { PosFooterComponent } from '../components/pos-footer/pos-footer.component';
import { PosHeaderComponent } from '../components/pos-header/pos-header.component';
import { PosSelectorComponent } from '../components/pos-selector/pos-selector.component';
import { PosService } from '../data-access/pos.service';

@Component({
  selector: 'app-pos',
  imports: [DecimalPipe, PosHeaderComponent, PosFooterComponent, PosSelectorComponent],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.scss',
})
export class PosComponent {
  protected readonly posService = inject(PosService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly barcodeQuery = signal('');
  protected readonly barcodeInputRef = viewChild<ElementRef<HTMLInputElement>>('barcodeInput');

  protected readonly hasNoWarehouse = computed(() => {
    const user = this.authService.currentUser();
    return user !== null && !user.warehouseId;
  });

  // Debounced scan — fires 350ms after the user stops typing (scanner auto-sends)
  private readonly _barcodeDebounce = toObservable(this.barcodeQuery)
    .pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef))
    .subscribe((val) => {
      if (val.trim() && !this.hasNoWarehouse()) {
        void this.performScan(val);
      }
    });

  // Clear cart and reset when leaving
  private readonly _cleanup = inject(DestroyRef).onDestroy(() => this.posService.clearCart());

  // ── Barcode ───────────────────────────────────────────────────────────────

  protected onBarcodeInput(event: Event): void {
    this.barcodeQuery.set((event.target as HTMLInputElement).value);
  }

  protected async onScanKeydown(): Promise<void> {
    if (this.hasNoWarehouse()) return;
    await this.performScan(this.barcodeQuery());
  }

  private async performScan(raw: string): Promise<void> {
    const code = raw.trim();
    if (!code) return;
    const prod = await this.posService.searchProductBySku(code);
    if (prod) {
      this.posService.openAddModal(prod);
    }
    this.barcodeQuery.set('');
    // Restore focus to the scanner after a modal is opened
    setTimeout(() => this.barcodeInputRef()?.nativeElement.focus(), 0);
  }
}

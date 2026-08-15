import { DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { AuthService } from '../../../auth/data-access/auth.service';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../shared/ui/input/input.component';
import { TableActionButtonComponent } from '../../../../shared/ui/table-action-button/table-action-button.component';
import { PosFooterComponent } from '../components/pos-footer/pos-footer.component';
import { PosHeaderComponent } from '../components/pos-header/pos-header.component';
import { PosReceiptPreviewComponent } from '../components/pos-receipt-preview/pos-receipt-preview.component';
import { PosSelectorComponent } from '../components/pos-selector/pos-selector.component';
import { PosService } from '../data-access/pos.service';

@Component({
  selector: 'app-pos',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    InputComponent,
    ButtonComponent,
    TableActionButtonComponent,
    PosHeaderComponent,
    PosFooterComponent,
    PosSelectorComponent,
    PosReceiptPreviewComponent,
  ],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.scss',
})
export class PosComponent {
  protected readonly posService = inject(PosService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly barcodeControl = new FormControl('', { nonNullable: true });
  private readonly barcodeInputHost = viewChild<ElementRef<HTMLElement>>('barcodeInputHost');

  protected readonly hasNoWarehouse = computed(() => {
    const user = this.authService.currentUser();
    return user !== null && !user.warehouseId;
  });

  // Debounced scan — fires 350ms after the user stops typing (scanner auto-sends)
  private readonly _barcodeDebounce = this.barcodeControl.valueChanges
    .pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef))
    .subscribe((val) => {
      if (val.trim() && !this.hasNoWarehouse()) {
        void this.performScan(val);
      }
    });

  // Clear cart and reset when leaving
  private readonly _cleanup = inject(DestroyRef).onDestroy(() => this.posService.clearCart());

  // ── Barcode ───────────────────────────────────────────────────────────────

  protected async onScanKeydown(): Promise<void> {
    if (this.hasNoWarehouse()) return;
    await this.performScan(this.barcodeControl.value);
  }

  private async performScan(raw: string): Promise<void> {
    const code = raw.trim();
    if (!code) return;
    const prod = await this.posService.searchProductBySku(code);
    if (prod) {
      this.posService.openAddModal(prod);
    }
    this.barcodeControl.setValue('', { emitEvent: false });
    setTimeout(() => this.focusBarcodeInput(), 0);
  }

  private focusBarcodeInput(): void {
    this.barcodeInputHost()?.nativeElement.querySelector('input')?.focus();
  }

  protected onReceiptPreviewClose(): void {
    this.posService.closeReceiptPreview();
  }
}

import { DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { PrintFormat, ReceiptData } from '../../models/pos.model';
import { ReceiptPrinter } from '../../utils/receipt-printer';

@Component({
  selector: 'app-pos-receipt-preview',
  imports: [DecimalPipe, ButtonComponent, TableActionButtonComponent],
  templateUrl: './pos-receipt-preview.component.html',
  styleUrl: './pos-receipt-preview.component.scss',
})
export class PosReceiptPreviewComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly receiptData = input.required<ReceiptData>();
  readonly backendHtml = input<string | null>(null);
  readonly isOpen = input(false);
  readonly close = output<void>();
  readonly printed = output<void>();

  protected readonly previewSrcdoc = computed<SafeHtml>(() => {
    const backendHtml = this.backendHtml();
    const html = backendHtml
      ? ReceiptPrinter.wrapBackendHtml(backendHtml, 'thermal-80mm')
      : ReceiptPrinter.getHtml(this.receiptData(), 'thermal-80mm');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  constructor() {
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        filter(() => this.isOpen()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.onDocumentKeydown(event));
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;

    const isPrintShortcut =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p';
    if (!isPrintShortcut) return;

    event.preventDefault();
    this.print('thermal-80mm');
  }

  protected onBackdropClick(): void {
    this.close.emit();
  }

  protected onClose(): void {
    this.close.emit();
  }

  protected print(format: PrintFormat): void {
    const backendHtml = this.backendHtml();
    if (backendHtml) {
      ReceiptPrinter.printFromHtml(backendHtml, format);
    } else {
      ReceiptPrinter.print(this.receiptData(), format);
    }
    this.printed.emit();
    this.close.emit();
  }
}

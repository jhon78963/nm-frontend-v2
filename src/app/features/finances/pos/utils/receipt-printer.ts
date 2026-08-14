import { PrintFormat, ReceiptData } from '../models/pos.model';
import { extractReceiptFragment } from './receipt-print.util';

const BUSINESS_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" width="160" height="32" aria-hidden="true">
  <text x="100" y="28" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="900" fill="#000">NOVEDADES MARITEX</text>
</svg>`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(amount: number): string {
  return amount.toFixed(2);
}

function documentTypeLabel(type: ReceiptData['documentType']): string {
  switch (type) {
    case 'boleta':
      return 'Boleta de Venta';
    case 'factura':
      return 'Factura';
    default:
      return 'Ticket de Venta';
  }
}

export class ReceiptPrinter {
  static print(data: ReceiptData, format: PrintFormat = 'thermal-80mm'): void {
    this.printHtmlDocument(this.getHtml(data, format));
  }

  static printFromHtml(rawHtml: string, format: PrintFormat = 'thermal-80mm'): void {
    this.printHtmlDocument(this.wrapBackendHtml(rawHtml, format));
  }

  static getHtml(data: ReceiptData, format: PrintFormat): string {
    return format === 'a4' ? this.buildA4Html(data) : this.buildThermalHtml(data);
  }

  static wrapBackendHtml(rawHtml: string, format: PrintFormat): string {
    const { styles, body } = extractReceiptFragment(rawHtml);
    const printStyles = format === 'a4' ? this.getA4Styles() : this.getThermalStyles();

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ticket</title>
  <style>${printStyles}</style>
  ${styles}
</head>
<body>
  <div class="receipt-print">${body}</div>
</body>
</html>`;
  }

  private static printHtmlDocument(fullHtml: string): void {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Impresión de ticket');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const cleanup = () => {
      window.setTimeout(() => iframe.remove(), 1_000);
    };

    iframe.onload = () => {
      const printWindow = iframe.contentWindow;
      if (!printWindow) {
        cleanup();
        return;
      }

      try {
        printWindow.focus();
        printWindow.print();
      } finally {
        cleanup();
      }
    };

    const doc = iframe.contentDocument;
    if (!doc) {
      cleanup();
      return;
    }

    doc.open();
    doc.write(fullHtml);
    doc.close();
  }

  private static buildThermalHtml(data: ReceiptData): string {
    const itemsHtml = data.items
      .map(
        (item) => `
      <div class="item">
        <div class="item-name">${escapeHtml(item.description)}</div>
        <div class="item-meta">${escapeHtml(item.size)} · ${escapeHtml(item.color)}</div>
        <div class="row">
          <span>${item.quantity} × S/ ${formatMoney(item.unitPrice)}</span>
          <span>S/ ${formatMoney(item.subtotal)}</span>
        </div>
      </div>`,
      )
      .join('');

    const paymentsHtml = data.payments
      .map(
        (payment) => `
      <div class="row">
        <span>${escapeHtml(payment.method)}</span>
        <span>S/ ${formatMoney(payment.amount)}</span>
      </div>`,
      )
      .join('');

    const customerHtml =
      data.customerName && data.customerDocument
        ? `
      <div class="row"><span>Cliente:</span><span>${escapeHtml(data.customerName)}</span></div>
      <div class="row"><span>Doc:</span><span>${escapeHtml(data.customerDocument)}</span></div>`
        : '';

    const body = `
      <div class="text-center business-name">${escapeHtml(data.warehouseName)}</div>
      <div class="logo-wrap text-center">${BUSINESS_LOGO_SVG}</div>
      ${data.warehouseRuc ? `<div class="text-center">RUC: ${escapeHtml(data.warehouseRuc)}</div>` : ''}
      ${data.warehouseAddress ? `<div class="text-center address">${escapeHtml(data.warehouseAddress)}</div>` : ''}
      <div class="divider"></div>
      <div class="text-center doc-type">${escapeHtml(documentTypeLabel(data.documentType))}</div>
      <div class="text-center receipt-number">${escapeHtml(data.receiptNumber)}</div>
      <div class="row"><span>Fecha:</span><span>${escapeHtml(data.date)} ${escapeHtml(data.time)}</span></div>
      <div class="row"><span>Cajero:</span><span>${escapeHtml(data.cashierName)}</span></div>
      ${customerHtml}
      <div class="divider"></div>
      ${itemsHtml}
      <div class="divider"></div>
      <div class="row"><span>Subtotal:</span><span>S/ ${formatMoney(data.subtotal)}</span></div>
      <div class="row"><span>IGV (18%):</span><span>S/ ${formatMoney(data.igv)}</span></div>
      <div class="row total"><span>TOTAL:</span><span>S/ ${formatMoney(data.total)}</span></div>
      <div class="divider"></div>
      ${paymentsHtml}
      ${data.change > 0 ? `<div class="row"><span>Vuelto:</span><span>S/ ${formatMoney(data.change)}</span></div>` : ''}
      <div class="divider"></div>
      <div class="text-center thanks">¡Gracias por su compra!</div>`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(data.receiptNumber)}</title>
  <style>${this.getThermalStyles()}</style>
</head>
<body>${body}</body>
</html>`;
  }

  private static buildA4Html(data: ReceiptData): string {
    const itemsRows = data.items
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.description)}<br><small>${escapeHtml(item.size)} · ${escapeHtml(item.color)}</small></td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right">S/ ${formatMoney(item.unitPrice)}</td>
        <td class="text-right">S/ ${formatMoney(item.subtotal)}</td>
      </tr>`,
      )
      .join('');

    const paymentsRows = data.payments
      .map(
        (payment) => `
      <tr>
        <td>${escapeHtml(payment.method)}</td>
        <td class="text-right">S/ ${formatMoney(payment.amount)}</td>
      </tr>`,
      )
      .join('');

    const customerBlock =
      data.customerName && data.customerDocument
        ? `<p><strong>Cliente:</strong> ${escapeHtml(data.customerName)} · ${escapeHtml(data.customerDocument)}</p>`
        : '';

    const body = `
      <header class="header">
        <div class="logo">${BUSINESS_LOGO_SVG}</div>
        <h1>${escapeHtml(data.warehouseName)}</h1>
        ${data.warehouseRuc ? `<p>RUC: ${escapeHtml(data.warehouseRuc)}</p>` : ''}
        ${data.warehouseAddress ? `<p>${escapeHtml(data.warehouseAddress)}</p>` : ''}
      </header>
      <section class="meta">
        <p><strong>${escapeHtml(documentTypeLabel(data.documentType))}</strong> · ${escapeHtml(data.receiptNumber)}</p>
        <p>Fecha: ${escapeHtml(data.date)} ${escapeHtml(data.time)} · Cajero: ${escapeHtml(data.cashierName)}</p>
        ${customerBlock}
      </section>
      <table class="items">
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Cant.</th>
            <th>P. Unit.</th>
            <th>Importe</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>
      <table class="totals">
        <tr><td>Subtotal</td><td class="text-right">S/ ${formatMoney(data.subtotal)}</td></tr>
        <tr><td>IGV (18%)</td><td class="text-right">S/ ${formatMoney(data.igv)}</td></tr>
        <tr class="grand-total"><td>TOTAL</td><td class="text-right">S/ ${formatMoney(data.total)}</td></tr>
      </table>
      <table class="payments">
        <thead><tr><th>Forma de pago</th><th>Monto</th></tr></thead>
        <tbody>${paymentsRows}</tbody>
      </table>
      ${data.change > 0 ? `<p class="change"><strong>Vuelto:</strong> S/ ${formatMoney(data.change)}</p>` : ''}
      <footer class="thanks">¡Gracias por su compra!</footer>`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(data.receiptNumber)}</title>
  <style>${this.getA4Styles()}</style>
</head>
<body>${body}</body>
</html>`;
  }

  private static getThermalStyles(): string {
    return `
      @page { margin: 0; size: 80mm auto; }
      body {
        font-family: 'Courier New', monospace;
        font-size: 10px;
        width: 72mm;
        margin: 0 auto;
        color: #000;
        background: #fff;
      }
      .divider { border-top: 1px dashed #000; margin: 4px 0; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .row { display: flex; justify-content: space-between; gap: 8px; }
      .business-name { font-weight: bold; font-size: 12px; margin-bottom: 4px; }
      .logo-wrap { margin: 4px 0; }
      .address { line-height: 1.4; margin-top: 2px; }
      .doc-type { font-weight: bold; margin-top: 4px; }
      .receipt-number { font-weight: bold; font-size: 12px; margin: 2px 0 6px; letter-spacing: 0.5px; }
      .item { margin-bottom: 6px; }
      .item-name { font-weight: bold; }
      .item-meta { font-size: 9px; margin: 1px 0 2px; }
      .total { font-weight: bold; font-size: 13px; margin-top: 4px; }
      .thanks { font-weight: bold; margin-top: 8px; }
    `;
  }

  private static getA4Styles(): string {
    return `
      @page { margin: 12mm; size: A4; }
      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        color: #111;
        max-width: 180mm;
        margin: 0 auto;
      }
      .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #111; padding-bottom: 12px; }
      .header h1 { margin: 8px 0 4px; font-size: 20px; }
      .header p { margin: 2px 0; }
      .meta { margin-bottom: 16px; line-height: 1.5; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      .items th, .items td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
      .items th { background: #f3f4f6; text-align: left; }
      .totals td { padding: 4px 0; }
      .totals .grand-total td { font-size: 16px; font-weight: bold; border-top: 2px solid #111; padding-top: 8px; }
      .payments th, .payments td { border: 1px solid #ddd; padding: 6px 8px; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .change { margin-top: 8px; }
      .thanks { text-align: center; font-weight: bold; margin-top: 24px; font-size: 14px; }
    `;
  }
}

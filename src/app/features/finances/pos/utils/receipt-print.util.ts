import { environment } from '../../../../../environments/environment';

/** Strips inline scripts to prevent XSS in print documents. */
function stripScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
}

/** Converts relative image src attributes to absolute URLs for blob/iframe contexts. */
function absolutizeAssetUrls(html: string): string {
  const bases = [
    environment.baseWebUrl,
    environment.apiUrl.replace(/\/api\/?$/, ''),
    environment.baseUploadUrl,
  ].filter((base): base is string => Boolean(base?.trim()));

  return html.replace(
    /(<img\b[^>]*\ssrc=")(?!https?:|data:|blob:)([^"]+)"/gi,
    (_match, prefix: string, src: string) => {
      for (const base of bases) {
        try {
          const normalizedBase = base.endsWith('/') ? base : `${base}/`;
          return `${prefix}${new URL(src, normalizedBase).href}"`;
        } catch {
          continue;
        }
      }
      return `${prefix}${src}"`;
    },
  );
}

export interface ReceiptFragment {
  styles: string;
  body: string;
}

/** Extracts <style> tags and body content from a full HTML document. */
export function extractReceiptFragment(rawHtml: string): ReceiptFragment {
  const sanitized = stripScripts(rawHtml.trim());
  const styleMatches = sanitized.match(/<style[^>]*>[\s\S]*?<\/style>/gi) ?? [];
  const bodyMatch = sanitized.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const rawBody = bodyMatch?.[1]?.trim() ?? sanitized;

  return {
    styles: styleMatches.join('\n'),
    body: stripScripts(rawBody),
  };
}

export const RECEIPT_THERMAL_CSS = `
  @page { margin: 0; size: 80mm auto; }
  #pos-ticket-print-frame,
  #pos-ticket-print-frame .receipt-print {
    width: 80mm; max-width: 80mm; min-width: 80mm;
    margin: 0; padding: 0; background: #ffffff; color: #000000;
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  #pos-ticket-print-frame .receipt-print {
    font-family: sans-serif, system-ui, -apple-system;
    font-size: 12px; font-weight: 900;
  }
`;

const AUTO_PRINT_SCRIPT = `<script>
window.addEventListener('load', function () {
  setTimeout(function () { window.focus(); window.print(); }, 400);
});
</script>`;

/** Builds a self-contained HTML document ready for iframe or popup printing. */
export function prepareReceiptHtmlForPrint(rawHtml: string, autoPrint = false): string {
  const { styles, body } = extractReceiptFragment(absolutizeAssetUrls(rawHtml));
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ticket</title>
  <style>${RECEIPT_THERMAL_CSS}</style>
  ${styles}
</head>
<body>
  <div class="receipt-print">${body}</div>
  ${autoPrint ? AUTO_PRINT_SCRIPT : ''}
</body>
</html>`;
}

/** Writes HTML into an about:blank iframe and returns its contentWindow. */
export function loadHtmlIntoIframe(
  iframe: HTMLIFrameElement,
  fullHtml: string,
): Window | null {
  const printWindow = iframe.contentWindow;
  const doc = printWindow?.document;
  if (!doc) return null;
  doc.open();
  doc.write(fullHtml);
  doc.close();
  return printWindow;
}

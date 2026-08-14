export interface DownloadOptions {
  filename: string;
  extension: 'pdf' | 'xlsx' | 'csv';
  appendDate?: boolean;
}

export function downloadFile(blob: Blob, options: DownloadOptions): void {
  const date = options.appendDate
    ? `_${new Date().toISOString().slice(0, 10)}`
    : '';
  const fullName = `${options.filename}${date}.${options.extension}`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fullName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(() => URL.revokeObjectURL(url), 100);
}

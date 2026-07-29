import { Component, output, signal } from '@angular/core';

const MAX_FILES = 10;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/*,application/pdf';

@Component({
  selector: 'app-voucher-file-picker',
  templateUrl: './voucher-file-picker.component.html',
})
export class VoucherFilePickerComponent {
  readonly filesChange = output<File[]>();

  protected readonly files = signal<File[]>([]);
  protected readonly isDragOver = signal(false);

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  protected onDragLeave(): void {
    this.isDragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);

    const dropped = event.dataTransfer?.files;
    if (dropped) {
      this.addFiles(Array.from(dropped));
    }
  }

  protected onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
    input.value = '';
  }

  protected removeFile(index: number): void {
    this.files.update((current) => {
      const next = current.filter((_, i) => i !== index);
      this.filesChange.emit(next);
      return next;
    });
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected fileIcon(file: File): string {
    return file.type === 'application/pdf' ? 'pdf' : 'image';
  }

  protected fileKey(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}`;
  }

  clear(): void {
    this.files.set([]);
    this.filesChange.emit([]);
  }

  private addFiles(incoming: File[]): void {
    const valid = incoming.filter((file) => file.size <= MAX_BYTES);
    const merged = [...this.files(), ...valid].slice(0, MAX_FILES);

    this.files.set(merged);
    this.filesChange.emit(merged);
  }

  protected readonly accept = ACCEPT;
  protected readonly maxFiles = MAX_FILES;
}

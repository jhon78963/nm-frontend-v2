import { Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-excel-upload',
  templateUrl: './excel-upload.component.html',
})
export class ExcelUploadComponent {
  readonly label = input('Subir archivo Excel');
  readonly accept = input('.xlsx,.xls,.csv');
  readonly maxSizeMb = input(10);
  readonly disabled = input(false);
  readonly errorMessage = input('');

  readonly fileSelected = output<File>();

  protected readonly file = signal<File | null>(null);
  protected readonly isDragOver = signal(false);
  protected readonly validationError = signal('');

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly displayError = computed(() => this.errorMessage() || this.validationError());

  openPicker(): void {
    if (this.disabled()) return;
    this.fileInput()?.nativeElement.click();
  }

  protected onDragOver(event: DragEvent): void {
    if (this.disabled()) return;
    event.preventDefault();
    this.isDragOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    if (this.disabled()) return;
    event.preventDefault();
    this.isDragOver.set(false);
    const dropped = event.dataTransfer?.files?.[0];
    if (dropped) this.processFile(dropped);
  }

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0];
    if (selected) this.processFile(selected);
    input.value = '';
  }

  protected removeFile(): void {
    this.file.set(null);
    this.validationError.set('');
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private processFile(f: File): void {
    const maxBytes = this.maxSizeMb() * 1024 * 1024;
    const acceptedExts = this.accept()
      .split(',')
      .map((e) => e.trim().toLowerCase());

    const ext = `.${f.name.split('.').pop()?.toLowerCase() ?? ''}`;

    if (!acceptedExts.includes(ext)) {
      this.validationError.set(`Tipo de archivo no permitido. Se aceptan: ${this.accept()}`);
      this.file.set(null);
      return;
    }

    if (f.size > maxBytes) {
      this.validationError.set(`El archivo supera el tamaño máximo de ${this.maxSizeMb()} MB`);
      this.file.set(null);
      return;
    }

    this.validationError.set('');
    this.file.set(f);
    this.fileSelected.emit(f);
  }
}

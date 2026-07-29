import {
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

export type FileDropzoneStatusSeverity =
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'neutral';

@Component({
  selector: 'app-file-dropzone',
  templateUrl: './file-dropzone.component.html',
})
export class FileDropzoneComponent {
  readonly maxFiles = input(10);
  readonly maxFileSizeMb = input(5);
  readonly accept = input('image/jpeg,image/png,image/webp');
  readonly multiple = input(true);
  readonly disabled = input(false);
  readonly subjectLabel = input('archivos');
  readonly formatsHint = input('JPEG, PNG o WebP');
  readonly splitPickers = input(false);

  readonly fileKeyFn = input<(file: File) => string>();
  readonly fileStatusLabel = input<(file: File) => string | null>();
  readonly fileStatusSeverity = input<(file: File) => FileDropzoneStatusSeverity>();
  readonly fileStatusUploading = input<(file: File) => boolean>();

  readonly filesChange = output<File[]>();

  protected readonly files = signal<File[]>([]);
  protected readonly isDragOver = signal(false);

  private readonly galleryInput = viewChild<ElementRef<HTMLInputElement>>('galleryInput');
  private readonly cameraInput = viewChild<ElementRef<HTMLInputElement>>('cameraInput');
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected fileKey(file: File): string {
    const fn = this.fileKeyFn();
    return fn?.(file) ?? `${file.name}:${file.size}:${file.lastModified}`;
  }

  protected statusLabel(file: File): string | null {
    return this.fileStatusLabel()?.(file) ?? null;
  }

  protected statusSeverity(file: File): FileDropzoneStatusSeverity {
    return this.fileStatusSeverity()?.(file) ?? 'neutral';
  }

  protected isFileUploading(file: File): boolean {
    return this.fileStatusUploading()?.(file) ?? false;
  }

  protected statusClass(file: File): string {
    const severity = this.statusSeverity(file);
    switch (severity) {
      case 'info':
        return 'bg-blue-100 text-blue-700';
      case 'warning':
        return 'bg-amber-100 text-amber-700';
      case 'danger':
        return 'bg-red-100 text-red-700';
      case 'success':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-gray-200 text-gray-600';
    }
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected onDragOver(event: DragEvent): void {
    if (this.disabled()) return;
    event.preventDefault();
    this.isDragOver.set(true);
  }

  protected onDragLeave(): void {
    this.isDragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    if (this.disabled()) return;
    event.preventDefault();
    this.isDragOver.set(false);
    const items = event.dataTransfer?.files;
    if (items) {
      this.addFiles(Array.from(items));
    }
  }

  protected onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
    input.value = '';
  }

  protected openGalleryPicker(): void {
    if (this.disabled()) return;
    this.galleryInput()?.nativeElement.click();
  }

  protected openCameraPicker(): void {
    if (this.disabled()) return;
    this.cameraInput()?.nativeElement.click();
  }

  protected openFilePicker(): void {
    if (this.disabled()) return;
    this.fileInput()?.nativeElement.click();
  }

  protected removeFile(index: number): void {
    const next = this.files().filter((_, i) => i !== index);
    this.files.set(next);
    this.filesChange.emit(next);
  }

  clear(): void {
    this.files.set([]);
    this.filesChange.emit([]);
  }

  removeByKey(key: string): void {
    const next = this.files().filter((file) => this.fileKey(file) !== key);
    this.files.set(next);
    this.filesChange.emit(next);
  }

  private addFiles(incoming: File[]): void {
    const maxBytes = this.maxFileSizeMb() * 1024 * 1024;
    const valid = incoming.filter((file) => file.size <= maxBytes);
    const merged = [...this.files(), ...valid].slice(0, this.maxFiles());
    this.files.set(merged);
    this.filesChange.emit(merged);
  }
}

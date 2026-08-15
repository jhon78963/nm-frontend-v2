import { Component, output, viewChild } from '@angular/core';
import { FileDropzoneComponent } from '../../../../../shared/ui/file-dropzone/file-dropzone.component';

const MAX_FILES = 10;
const ACCEPT = 'image/*,application/pdf';

@Component({
  selector: 'app-voucher-file-picker',
  imports: [FileDropzoneComponent],
  templateUrl: './voucher-file-picker.component.html',
})
export class VoucherFilePickerComponent {
  readonly filesChange = output<File[]>();

  private readonly dropzone = viewChild(FileDropzoneComponent);

  protected onFilesChange(files: File[]): void {
    this.filesChange.emit(files);
  }

  clear(): void {
    this.dropzone()?.clear();
  }

  protected readonly accept = ACCEPT;
  protected readonly maxFiles = MAX_FILES;
}

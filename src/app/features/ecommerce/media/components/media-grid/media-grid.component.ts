import {
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { MediaLibraryItem } from '../../models/media-library.model';
import {
  formatMediaSize,
  mediaDisplayName,
  mediaTypeLabel,
} from '../../utils/media-display.util';

@Component({
  selector: 'app-media-grid',
  templateUrl: './media-grid.component.html',
})
export class MediaGridComponent {
  readonly items = input<MediaLibraryItem[]>([]);
  readonly loading = input(false);
  readonly selectable = input(true);
  readonly multiple = input(false);
  readonly selectedIds = input<string[]>([]);

  readonly itemSelected = output<MediaLibraryItem>();
  readonly itemToggled = output<MediaLibraryItem>();

  protected readonly selectedSet = computed(() => new Set(this.selectedIds()));

  protected displayName(item: MediaLibraryItem): string {
    return mediaDisplayName(item);
  }

  protected formatSize(bytes: number): string {
    return formatMediaSize(bytes);
  }

  protected typeLabel(mimeType: string): string {
    return mediaTypeLabel(mimeType);
  }

  protected isImage(item: MediaLibraryItem): boolean {
    return item.mimeType.startsWith('image/');
  }

  protected isSelected(item: MediaLibraryItem): boolean {
    return this.selectedSet().has(item.id);
  }

  protected onItemClick(item: MediaLibraryItem): void {
    if (!this.selectable()) {
      return;
    }

    if (this.multiple()) {
      this.itemToggled.emit(item);
      return;
    }

    this.itemSelected.emit(item);
  }
}

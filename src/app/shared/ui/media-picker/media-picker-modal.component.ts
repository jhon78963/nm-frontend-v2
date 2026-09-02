import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, Subject } from 'rxjs';
import { ButtonComponent } from '../button/button.component';
import { FileDropzoneComponent } from '../file-dropzone/file-dropzone.component';
import { ToastService } from '../toast/toast.service';
import { MediaLibraryService } from '../../../features/ecommerce/media/data-access/media-library.service';
import { MEDIA_IMAGE_ACCEPT, MEDIA_SORT_OPTIONS } from '../../../features/ecommerce/media/constants/media.constants';
import { MediaLibraryItem } from '../../../features/ecommerce/media/models/media-library.model';
import { MediaGridComponent } from '../../../features/ecommerce/media/components/media-grid/media-grid.component';

@Component({
  selector: 'app-media-picker-modal',
  imports: [ButtonComponent, FileDropzoneComponent, MediaGridComponent],
  templateUrl: './media-picker-modal.component.html',
})
export class MediaPickerModalComponent {
  private readonly mediaLibraryService = inject(MediaLibraryService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges = new Subject<string>();

  readonly open = input(false);
  readonly accept = input(MEDIA_IMAGE_ACCEPT);
  readonly multiple = input(false);

  readonly closed = output<void>();
  readonly selected = output<MediaLibraryItem | MediaLibraryItem[]>();

  protected readonly activeTab = signal<'library' | 'upload'>('library');
  protected readonly loading = signal(false);
  protected readonly uploading = signal(false);
  protected readonly items = signal<MediaLibraryItem[]>([]);
  protected readonly pendingFiles = signal<File[]>([]);
  protected readonly search = signal('');
  protected readonly sort = signal<'newest' | 'oldest' | 'smallest' | 'largest'>('newest');
  protected readonly selectedItem = signal<MediaLibraryItem | null>(null);
  protected readonly selectedItems = signal<MediaLibraryItem[]>([]);

  protected readonly sortOptions = MEDIA_SORT_OPTIONS;

  constructor() {
    this.searchChanges
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.search.set(value);
        this.loadLibrary();
      });

    effect(() => {
      if (this.open()) {
        this.activeTab.set('library');
        this.selectedItem.set(null);
        this.selectedItems.set([]);
        this.pendingFiles.set([]);
        this.loadLibrary();
      }
    });
  }

  protected onBackdropClick(): void {
    this.closed.emit();
  }

  protected setTab(tab: 'library' | 'upload'): void {
    this.activeTab.set(tab);
  }

  protected onSearchInput(event: Event): void {
    this.searchChanges.next((event.target as HTMLInputElement).value);
  }

  protected onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as
      | 'newest'
      | 'oldest'
      | 'smallest'
      | 'largest';
    this.sort.set(value);
    this.loadLibrary();
  }

  protected onFilesChange(files: File[]): void {
    this.pendingFiles.set(files);
  }

  protected uploadFiles(): void {
    const files = this.pendingFiles();
    if (files.length === 0) {
      this.toastService.show('error', 'Selecciona al menos un archivo.');
      return;
    }

    this.uploading.set(true);
    this.mediaLibraryService
      .upload(files)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.uploading.set(false);
          this.pendingFiles.set([]);
          this.activeTab.set('library');
          this.toastService.show('success', 'Archivos subidos correctamente.');
          this.loadLibrary();

          if (!this.multiple() && result.uploaded.length > 0) {
            this.selectedItem.set(result.uploaded[0]);
          }
        },
        error: (message: string) => {
          this.uploading.set(false);
          this.toastService.show('error', message);
        },
      });
  }

  protected onItemSelected(item: MediaLibraryItem): void {
    this.selectedItem.set(item);
  }

  protected onItemToggled(item: MediaLibraryItem): void {
    const current = this.selectedItems();
    if (current.some((entry) => entry.id === item.id)) {
      this.selectedItems.set(current.filter((entry) => entry.id !== item.id));
      return;
    }
    this.selectedItems.set([...current, item]);
  }

  protected confirmSelection(): void {
    if (this.multiple()) {
      const items = this.selectedItems();
      if (items.length === 0) {
        this.toastService.show('error', 'Selecciona al menos un archivo.');
        return;
      }
      this.selected.emit(items);
      this.closed.emit();
      return;
    }

    const item = this.selectedItem();
    if (!item) {
      this.toastService.show('error', 'Selecciona un archivo de la biblioteca.');
      return;
    }

    this.selected.emit(item);
    this.closed.emit();
  }

  protected loadLibrary(): void {
    this.loading.set(true);

    const mimeType = this.accept().includes('image/') && !this.accept().includes('pdf')
      ? 'image/'
      : undefined;

    this.mediaLibraryService
      .list({
        search: this.search(),
        sort: this.sort(),
        mimeType,
        page: 1,
        limit: 48,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.items.set(result.data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar la biblioteca multimedia.');
        },
      });
  }
}

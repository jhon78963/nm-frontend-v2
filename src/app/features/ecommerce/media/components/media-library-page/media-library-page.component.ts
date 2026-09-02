import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, Subject } from 'rxjs';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { FileDropzoneComponent } from '../../../../../shared/ui/file-dropzone/file-dropzone.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { MEDIA_ALL_ACCEPT, MEDIA_SORT_OPTIONS } from '../../constants/media.constants';
import { MediaLibraryService } from '../../data-access/media-library.service';
import { MediaLibraryItem } from '../../models/media-library.model';
import { MediaGridComponent } from '../media-grid/media-grid.component';

@Component({
  selector: 'app-media-library-page',
  imports: [
    AlertComponent,
    ButtonComponent,
    FileDropzoneComponent,
    MediaGridComponent,
  ],
  templateUrl: './media-library-page.component.html',
})
export class MediaLibraryPageComponent implements OnInit {
  private readonly mediaLibraryService = inject(MediaLibraryService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges = new Subject<string>();

  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly deleting = signal(false);
  protected readonly loadError = signal('');
  protected readonly items = signal<MediaLibraryItem[]>([]);
  protected readonly selectedIds = signal<string[]>([]);
  protected readonly search = signal('');
  protected readonly sort = signal<'newest' | 'oldest' | 'smallest' | 'largest'>('newest');
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly showUploader = signal(false);
  protected readonly pendingFiles = signal<File[]>([]);

  protected readonly sortOptions = MEDIA_SORT_OPTIONS;
  protected readonly accept = MEDIA_ALL_ACCEPT;

  ngOnInit(): void {
    this.searchChanges
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.search.set(value);
        this.page.set(1);
        this.loadLibrary();
      });

    this.loadLibrary();
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchChanges.next(value);
  }

  protected onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as
      | 'newest'
      | 'oldest'
      | 'smallest'
      | 'largest';
    this.sort.set(value);
    this.page.set(1);
    this.loadLibrary();
  }

  protected toggleUploader(): void {
    this.showUploader.update((current) => !current);
    this.pendingFiles.set([]);
  }

  protected onFilesChange(files: File[]): void {
    this.pendingFiles.set(files);
  }

  protected uploadFiles(): void {
    const files = this.pendingFiles();
    if (files.length === 0) {
      this.toastService.show('error', 'Selecciona al menos un archivo para subir.');
      return;
    }

    this.uploading.set(true);
    this.mediaLibraryService
      .upload(files)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.uploading.set(false);
          this.pendingFiles.set([]);
          this.showUploader.set(false);
          this.toastService.show('success', 'Archivos subidos correctamente.');
          this.loadLibrary();
        },
        error: (message: string) => {
          this.uploading.set(false);
          this.toastService.show('error', message);
        },
      });
  }

  protected onItemToggled(item: MediaLibraryItem): void {
    const current = this.selectedIds();
    if (current.includes(item.id)) {
      this.selectedIds.set(current.filter((id) => id !== item.id));
      return;
    }
    this.selectedIds.set([...current, item.id]);
  }

  protected deleteSelected(): void {
    const ids = this.selectedIds();
    if (ids.length === 0) {
      return;
    }

    this.deleting.set(true);
    this.mediaLibraryService
      .deleteMany(ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.selectedIds.set([]);
          this.toastService.show('success', 'Archivos eliminados correctamente.');
          this.loadLibrary();
        },
        error: (message: string) => {
          this.deleting.set(false);
          this.toastService.show('error', message);
        },
      });
  }

  protected goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages()) {
      return;
    }
    this.page.set(nextPage);
    this.loadLibrary();
  }

  protected loadLibrary(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.mediaLibraryService
      .list({
        search: this.search(),
        sort: this.sort(),
        page: this.page(),
        limit: 48,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.items.set(result.data);
          this.totalPages.set(result.meta.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('No se pudo cargar la biblioteca multimedia.');
          this.loading.set(false);
        },
      });
  }
}

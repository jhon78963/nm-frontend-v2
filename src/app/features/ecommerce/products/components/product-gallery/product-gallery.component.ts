import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  catchError,
  distinctUntilChanged,
  EMPTY,
  finalize,
  forkJoin,
  Observable,
  of,
  take,
  tap,
  throwError,
} from 'rxjs';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import {
  FileDropzoneComponent,
  FileDropzoneStatusSeverity,
} from '../../../../../shared/ui/file-dropzone/file-dropzone.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { PublishProductService } from '../../data-access/publish-product.service';
import { ProductMediaService } from '../../data-access/product-media.service';
import {
  PublishMediaItem,
  WooCommerceSyncResult,
} from '../../models/product-media.model';
import { notifyWooCommerceSyncResult } from '../../utils/woocommerce-sync.util';

type UploadJobStatus = 'pending' | 'uploading' | 'error';

interface TrackedFile {
  key: string;
  file: File;
  status: UploadJobStatus;
  media?: PublishMediaItem;
}

@Component({
  selector: 'app-product-gallery',
  imports: [FileDropzoneComponent, ButtonComponent, TableActionButtonComponent],
  templateUrl: './product-gallery.component.html',
})
export class ProductGalleryComponent implements OnDestroy {
  private readonly publishProductService = inject(PublishProductService);
  private readonly productMediaService = inject(ProductMediaService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly productId = input.required<string>();
  readonly mediaCountChange = output<number>();

  protected readonly mediaItems = signal<PublishMediaItem[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly deletingMediaId = signal<string | null>(null);
  protected readonly displayUrls = signal<Map<string, string>>(new Map());

  protected readonly maxFileSizeMb = 5;
  protected readonly maxFiles = 10;
  protected readonly accept = 'image/jpeg,image/png,image/webp';

  private readonly dropzone = viewChild(FileDropzoneComponent);
  private readonly fileKeyByRef = new Map<File, string>();
  private readonly trackedFiles = signal<Map<string, TrackedFile>>(new Map());
  private readonly localPreviewByKey = signal<Map<string, string>>(new Map());
  private readonly queueOrder = signal<string[]>([]);
  private readonly selectedQueueKey = signal<string | null>(null);
  private readonly isPumpingQueue = signal(false);
  private readonly suppressErrorToast = signal(false);
  private readonly autoDrainAfterUpload = signal(false);

  private sessionUploaded: PublishMediaItem[] = [];
  private sessionWorstSync: WooCommerceSyncResult | undefined;
  private queueWaiters: Array<{
    quiet: boolean;
    resolve: (items: PublishMediaItem[]) => void;
    reject: (err: unknown) => void;
  }> = [];

  protected readonly queueItems = computed(() =>
    this.queueOrder()
      .map((key) => this.trackedFiles().get(key))
      .filter((item): item is TrackedFile => !!item),
  );

  protected readonly pendingCount = computed(
    () => this.queueItems().filter((item) => item.status === 'pending').length,
  );

  protected readonly uploadingCount = computed(
    () => this.queueItems().filter((item) => item.status === 'uploading').length,
  );

  protected readonly failedCount = computed(
    () => this.queueItems().filter((item) => item.status === 'error').length,
  );

  protected readonly isUploading = computed(
    () => this.uploadingCount() > 0 || this.isPumpingQueue(),
  );

  protected readonly isDeleting = computed(() => this.deletingMediaId() !== null);

  protected readonly canUploadNext = computed(
    () => !!this.nextUploadKey() && !this.isUploading() && !this.isDeleting(),
  );

  protected readonly canRetryFailed = computed(
    () => this.failedCount() > 0 && !this.isUploading() && !this.isDeleting(),
  );

  protected readonly canClearQueue = computed(
    () => this.queueItems().length > 0 && !this.isUploading() && !this.isDeleting(),
  );

  protected readonly dropzoneDisabled = computed(
    () => this.isDeleting() || this.isUploading(),
  );

  protected readonly nextUploadLabel = computed(() => {
    const key = this.nextUploadKey();
    if (!key) return 'Subir siguiente';
    const index = this.queueOrder().indexOf(key) + 1;
    return `Subir siguiente (${index}/${this.queueItems().length})`;
  });

  constructor() {
    toObservable(this.productId)
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((productId) => {
        if (!productId) return;
        this.resetUploadState();
        this.loadGallery(productId);
      });
  }

  ngOnDestroy(): void {
    this.revokeDisplayUrls();
    this.revokeLocalPreviews();
    this.queueWaiters = [];
  }

  uploadPendingIfAny(quiet = false): Observable<PublishMediaItem[]> {
    if (this.isDeleting()) {
      return throwError(
        () => new Error('Espera a que termine la eliminación de imágenes.'),
      );
    }

    const needsUpload = this.queueItems().some(
      (item) => item.status === 'pending' || item.status === 'error',
    );

    if (!needsUpload && !this.isUploading()) {
      return of([]);
    }

    this.autoDrainAfterUpload.set(true);
    this.suppressErrorToast.set(quiet);
    this.uploadOne(this.nextUploadKey(), quiet);

    return new Observable<PublishMediaItem[]>((observer) => {
      if (!this.isUploading() && !needsUpload) {
        observer.next([]);
        observer.complete();
        return;
      }

      this.queueWaiters.push({
        quiet,
        resolve: (items) => {
          observer.next(items);
          observer.complete();
        },
        reject: (err) => observer.error(err),
      });
    });
  }

  protected displayUrl(mediaId: string): string | null {
    return this.displayUrls().get(mediaId) ?? null;
  }

  protected queuePreviewUrl(key: string): string | null {
    return this.localPreviewByKey().get(key) ?? null;
  }

  protected isQueueSelected(key: string): boolean {
    return (this.selectedQueueKey() ?? this.nextUploadKey()) === key;
  }

  protected queueStatusLabel(item: TrackedFile): string {
    switch (item.status) {
      case 'pending':
        return this.isQueueSelected(item.key) ? 'Siguiente' : 'Pendiente';
      case 'uploading':
        return 'Subiendo…';
      case 'error':
        return 'Error';
    }
  }

  protected queueStatusSeverity(item: TrackedFile): FileDropzoneStatusSeverity {
    switch (item.status) {
      case 'pending':
        return this.isQueueSelected(item.key) ? 'info' : 'neutral';
      case 'uploading':
        return 'warning';
      case 'error':
        return 'danger';
    }
  }

  protected onDropzoneFiles(files: File[]): void {
    const activeKeys = new Set<string>();
    const tracked = new Map(this.trackedFiles());
    const keyByRef = this.fileKeyByRef;
    const order = [...this.queueOrder()];

    for (const file of files) {
      const key = this.ensureFileKey(file, keyByRef);
      activeKeys.add(key);

      if (!tracked.has(key)) {
        tracked.set(key, { key, file, status: 'pending' });
        order.push(key);
        this.ensureQueuePreview(key, file);
      }
    }

    this.trackedFiles.set(tracked);
    this.queueOrder.set(order);
    this.pruneRemovedPending(activeKeys);
    this.ensureSelectedQueueKey();
  }

  protected selectQueueItem(key: string): void {
    const tracked = this.trackedFiles();
    const item = tracked.get(key);
    if (!item || item.status === 'uploading') return;

    if (item.status === 'error') {
      item.status = 'pending';
      this.trackedFiles.set(new Map(tracked));
    }

    this.selectedQueueKey.set(key);
    this.moveQueueKeyToFront(key);
  }

  protected moveQueueItem(key: string, delta: number, event?: Event): void {
    event?.stopPropagation();
    const tracked = this.trackedFiles();
    const item = tracked.get(key);
    if (!item || item.status === 'uploading') return;

    const order = [...this.queueOrder()];
    const index = order.indexOf(key);
    if (index < 0) return;

    const target = index + delta;
    if (target < 0 || target >= order.length) return;

    order[index] = order[target];
    order[target] = key;
    this.queueOrder.set(order);
  }

  protected uploadNext(): void {
    this.autoDrainAfterUpload.set(false);
    this.uploadOne(this.nextUploadKey(), false);
  }

  protected uploadQueueItem(key: string, event?: Event): void {
    event?.stopPropagation();
    this.autoDrainAfterUpload.set(false);
    this.selectedQueueKey.set(key);

    const tracked = new Map(this.trackedFiles());
    const item = tracked.get(key);
    if (item?.status === 'error') {
      item.status = 'pending';
      this.trackedFiles.set(tracked);
    }

    this.moveQueueKeyToFront(key);
    this.uploadOne(key, false);
  }

  protected retryFailedUploads(): void {
    const failed = this.queueItems().find((item) => item.status === 'error');
    if (!failed) return;

    const tracked = new Map(this.trackedFiles());
    tracked.get(failed.key)!.status = 'pending';
    this.trackedFiles.set(tracked);
    this.selectedQueueKey.set(failed.key);
    this.moveQueueKeyToFront(failed.key);
    this.autoDrainAfterUpload.set(false);
    this.uploadOne(failed.key, false);
  }

  protected clearQueue(): void {
    if (!this.canClearQueue()) return;

    const uploaded = [...this.sessionUploaded];
    const waiters = [...this.queueWaiters];

    this.isPumpingQueue.set(false);
    this.autoDrainAfterUpload.set(false);
    this.trackedFiles.set(new Map());
    this.fileKeyByRef.clear();
    this.queueOrder.set([]);
    this.selectedQueueKey.set(null);
    this.revokeLocalPreviews();
    this.dropzone()?.clear();
    this.sessionUploaded = [];
    this.sessionWorstSync = undefined;
    this.suppressErrorToast.set(false);
    this.queueWaiters = [];

    for (const waiter of waiters) {
      waiter.resolve(uploaded);
    }

    this.toastService.show('success', 'Cola de imágenes limpiada.');
  }

  protected deleteImage(mediaId: string): void {
    if (this.deletingMediaId() !== null) return;

    this.deletingMediaId.set(mediaId);

    this.productMediaService
      .deleteImage(this.productId(), mediaId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.deletingMediaId.set(null);
          notifyWooCommerceSyncResult(
            this.toastService,
            response.body?.wooCommerceSync,
            response.body?.message ?? 'Imagen eliminada correctamente.',
          );
          this.revokeDisplayUrl(mediaId);
          this.mediaItems.update((items) =>
            items.filter((item) => item.id !== mediaId),
          );
          this.emitMediaCount();
        },
        error: (err: unknown) => {
          this.deletingMediaId.set(null);
          const message =
            typeof err === 'string'
              ? err
              : 'No se pudo eliminar la imagen.';
          this.toastService.show('error', message);
        },
      });
  }

  protected isDeletingItem(mediaId: string): boolean {
    return this.deletingMediaId() === mediaId;
  }

  protected bindDropzoneFileKey = (file: File): string => this.ensureFileKey(file);

  protected bindDropzoneStatusLabel = (file: File): string | null => {
    const item = this.trackedFiles().get(this.ensureFileKey(file));
    return item ? this.queueStatusLabel(item) : null;
  };

  protected bindDropzoneStatusSeverity = (file: File): FileDropzoneStatusSeverity => {
    const item = this.trackedFiles().get(this.ensureFileKey(file));
    return item ? this.queueStatusSeverity(item) : 'neutral';
  };

  protected bindDropzoneStatusUploading = (file: File): boolean =>
    this.trackedFiles().get(this.ensureFileKey(file))?.status === 'uploading';

  private loadGallery(productId: string): void {
    if (!productId) return;

    this.isLoading.set(true);
    this.publishProductService.getOne(productId).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (product) => {
        const items: PublishMediaItem[] = (product.media ?? []).map((m) => ({
          id: m.id,
          filePath: m.url,
          publicUrl: m.url,
          fileName: null,
        }));
        this.mediaItems.set(items);
        this.isLoading.set(false);
        this.loadDisplayUrls();
        this.emitMediaCount();
      },
      error: () => {
        this.isLoading.set(false);
        this.toastService.show('error', 'No se pudo cargar la galería del producto.');
      },
    });
  }

  private uploadOne(key: string | null, quiet: boolean): void {
    if (!key || this.isPumpingQueue()) {
      this.completeWaitersIfIdle();
      return;
    }

    const tracked = this.trackedFiles();
    const item = tracked.get(key);
    if (!item || (item.status !== 'pending' && item.status !== 'error')) {
      if (this.autoDrainAfterUpload()) {
        this.uploadOne(this.nextUploadKey(), quiet);
      } else {
        this.completeWaitersIfIdle();
      }
      return;
    }

    this.suppressErrorToast.set(quiet);
    this.isPumpingQueue.set(true);
    item.status = 'uploading';
    this.trackedFiles.set(new Map(tracked));
    this.ensureQueuePreview(key, item.file);

    this.productMediaService
      .uploadImage(this.productId(), item.file)
      .pipe(
        tap((response) => {
          if (!this.trackedFiles().has(key)) return;

          const current = this.trackedFiles().get(key)!;
          current.media = response.body?.media;

          this.sessionWorstSync = this.mergeSyncResults(
            this.sessionWorstSync,
            response.body?.wooCommerceSync,
          );

          if (response.body?.media) {
            this.sessionUploaded.push(response.body.media);
            this.applyLocalPreview(response.body.media.id, key);

            const existingIds = new Set(this.mediaItems().map((m) => m.id));
            if (!existingIds.has(response.body.media.id)) {
              this.mediaItems.update((items) => [...items, response.body!.media]);
              this.emitMediaCount();
            }
          }
        }),
        catchError((err: unknown) => {
          if (!this.trackedFiles().has(key)) return EMPTY;

          const current = this.trackedFiles().get(key)!;
          current.status = 'error';
          this.trackedFiles.set(new Map(this.trackedFiles()));

          if (!this.suppressErrorToast()) {
            const message =
              typeof err === 'string'
                ? err
                : 'No se pudo subir la imagen.';
            this.toastService.show('error', message);
          }
          return EMPTY;
        }),
        finalize(() => {
          this.isPumpingQueue.set(false);

          const current = this.trackedFiles().get(key);
          if (current && current.status !== 'error') {
            this.removeFromQueue(key);
          }

          if (this.autoDrainAfterUpload()) {
            const nextKey = this.nextUploadKey();
            if (nextKey) {
              this.uploadOne(nextKey, quiet);
              return;
            }
          }

          this.completeWaitersIfIdle();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private removeFromQueue(key: string): void {
    const tracked = this.trackedFiles();
    const item = tracked.get(key);
    if (!item) return;

    // Quitar del dropzone antes de borrar el mapa file→key (removeByKey lo necesita).
    this.dropzone()?.removeByKey(key);

    const keyByRef = this.fileKeyByRef;
    keyByRef.delete(item.file);
    tracked.delete(key);

    this.trackedFiles.set(new Map(tracked));
    this.queueOrder.set(this.queueOrder().filter((k) => k !== key));

    if (this.selectedQueueKey() === key) {
      this.selectedQueueKey.set(null);
    }

    this.ensureSelectedQueueKey();
  }

  private nextUploadKey(): string | null {
    const selectedKey = this.selectedQueueKey();
    if (selectedKey) {
      const selected = this.trackedFiles().get(selectedKey);
      if (
        selected &&
        (selected.status === 'pending' || selected.status === 'error')
      ) {
        return selectedKey;
      }
    }

    return (
      this.queueOrder().find((itemKey) => {
        const item = this.trackedFiles().get(itemKey);
        return item?.status === 'pending' || item?.status === 'error';
      }) ?? null
    );
  }

  private moveQueueKeyToFront(key: string): void {
    this.queueOrder.set([
      key,
      ...this.queueOrder().filter((itemKey) => itemKey !== key),
    ]);
  }

  private ensureSelectedQueueKey(): void {
    const selected = this.selectedQueueKey();
    if (selected && this.trackedFiles().has(selected)) return;
    this.selectedQueueKey.set(this.nextUploadKey());
  }

  private ensureQueuePreview(key: string, file: File): void {
    const previews = new Map(this.localPreviewByKey());
    if (!previews.has(key)) {
      previews.set(key, URL.createObjectURL(file));
      this.localPreviewByKey.set(previews);
    }
  }

  private completeWaitersIfIdle(): void {
    if (this.isUploading()) return;

    const uploaded = [...this.sessionUploaded];
    const worstSync = this.sessionWorstSync;
    const waiters = [...this.queueWaiters];
    const suppressToast =
      this.suppressErrorToast() ||
      (waiters.length > 0 && waiters.every((waiter) => waiter.quiet));

    this.sessionUploaded = [];
    this.sessionWorstSync = undefined;
    this.suppressErrorToast.set(false);
    this.autoDrainAfterUpload.set(false);
    this.queueWaiters = [];

    for (const waiter of waiters) {
      waiter.resolve(uploaded);
    }

    if (uploaded.length > 0 && !suppressToast) {
      notifyWooCommerceSyncResult(
        this.toastService,
        worstSync,
        uploaded.length === 1
          ? 'Imagen subida correctamente.'
          : `${uploaded.length} imágenes subidas correctamente.`,
      );
    }
  }

  private pruneRemovedPending(activeKeys: Set<string>): void {
    const tracked = new Map(this.trackedFiles());
    const keyByRef = this.fileKeyByRef;
    let order = [...this.queueOrder()];

    for (const key of [...order]) {
      const item = tracked.get(key);
      if (!item) continue;

      if (activeKeys.has(key) || item.status === 'uploading') continue;

      tracked.delete(key);
      keyByRef.delete(item.file);
      order = order.filter((k) => k !== key);
      this.releaseLocalPreview(key);

      if (this.selectedQueueKey() === key) {
        this.selectedQueueKey.set(null);
      }
    }

    this.trackedFiles.set(tracked);
    this.queueOrder.set(order);
    this.ensureSelectedQueueKey();
  }

  private ensureFileKey(
    file: File,
    keyByRef: Map<File, string> = this.fileKeyByRef,
  ): string {
    const existing = keyByRef.get(file);
    if (existing) return existing;

    const key =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    keyByRef.set(file, key);
    return key;
  }

  private resetUploadState(): void {
    this.trackedFiles.set(new Map());
    this.fileKeyByRef.clear();
    this.queueOrder.set([]);
    this.selectedQueueKey.set(null);
    this.revokeLocalPreviews();
    this.sessionUploaded = [];
    this.sessionWorstSync = undefined;
    this.queueWaiters = [];
    this.isPumpingQueue.set(false);
    this.suppressErrorToast.set(false);
    this.autoDrainAfterUpload.set(false);
  }

  private emitMediaCount(): void {
    this.mediaCountChange.emit(this.mediaItems().length);
  }

  private mergeSyncResults(
    current: WooCommerceSyncResult | undefined,
    next: WooCommerceSyncResult | undefined,
  ): WooCommerceSyncResult | undefined {
    if (!next) return current;
    if (!current) return next;

    const score = (sync: WooCommerceSyncResult): number => {
      if (!sync.attempted) return 3;
      if (sync.errors > 0) return 2;
      if (sync.products < 1) return 1;
      return 0;
    };

    return score(next) >= score(current) ? next : current;
  }

  private loadDisplayUrls(): void {
    const activeIds = new Set(this.mediaItems().map((item) => item.id));
    const urls = new Map(this.displayUrls());

    for (const mediaId of [...urls.keys()]) {
      if (!activeIds.has(mediaId)) {
        this.revokeDisplayUrl(mediaId);
      }
    }

    const pending = this.mediaItems().filter((item) => !this.displayUrls().has(item.id));
    if (pending.length === 0) return;

    // Items con URL pública directa (nuevo storage-service): no necesitan blob
    const withPublicUrl = pending.filter((item) => !!item.publicUrl);
    const withoutUrl = pending.filter((item) => !item.publicUrl);

    if (withPublicUrl.length > 0) {
      const newUrls = new Map(this.displayUrls());
      for (const item of withPublicUrl) {
        newUrls.set(item.id, item.publicUrl!);
      }
      this.displayUrls.set(newUrls);
    }

    if (withoutUrl.length === 0) return;

    forkJoin(
      withoutUrl.map((item) =>
        this.productMediaService.getPreviewBlob(this.productId(), item.id).pipe(
          tap((blob) => this.setDisplayUrl(item.id, blob)),
          catchError(() => of(null)),
        ),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          const failed = results.filter((blob) => blob === null).length;
          if (failed > 0 && failed === withoutUrl.length) {
            this.toastService.show(
              'info',
              'No se pudieron cargar algunas imágenes.',
            );
          }
        },
      });
  }

  private applyLocalPreview(mediaId: string, key: string): void {
    const localUrl = this.localPreviewByKey().get(key);
    if (!localUrl) return;

    this.revokeDisplayUrl(mediaId);
    const urls = new Map(this.displayUrls());
    urls.set(mediaId, localUrl);
    this.displayUrls.set(urls);

    const previews = new Map(this.localPreviewByKey());
    previews.delete(key);
    this.localPreviewByKey.set(previews);
  }

  private releaseLocalPreview(key: string): void {
    const previews = new Map(this.localPreviewByKey());
    const url = previews.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      previews.delete(key);
      this.localPreviewByKey.set(previews);
    }
  }

  private revokeLocalPreviews(): void {
    for (const url of this.localPreviewByKey().values()) {
      URL.revokeObjectURL(url);
    }
    this.localPreviewByKey.set(new Map());
  }

  private setDisplayUrl(mediaId: string, blob: Blob): void {
    const typedBlob =
      blob.type && blob.type.startsWith('image/')
        ? blob
        : new Blob([blob], { type: 'image/jpeg' });

    this.revokeDisplayUrl(mediaId);
    const urls = new Map(this.displayUrls());
    urls.set(mediaId, URL.createObjectURL(typedBlob));
    this.displayUrls.set(urls);
  }

  private revokeDisplayUrl(mediaId: string): void {
    const urls = new Map(this.displayUrls());
    const url = urls.get(mediaId);
    if (url) {
      URL.revokeObjectURL(url);
      urls.delete(mediaId);
      this.displayUrls.set(urls);
    }
  }

  private revokeDisplayUrls(): void {
    for (const url of this.displayUrls().values()) {
      URL.revokeObjectURL(url);
    }
    this.displayUrls.set(new Map());
  }
}

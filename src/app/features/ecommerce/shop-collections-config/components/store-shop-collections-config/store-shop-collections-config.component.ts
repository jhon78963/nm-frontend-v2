import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { MediaPickerFieldComponent } from '../../../../../shared/ui/media-picker/media-picker-field.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { StoreShopCollectionsService } from '../../data-access/store-shop-collections.service';
import {
  StoreShopCollectionItem,
  StoreShopCollectionsFormModel,
} from '../../models/store-shop-collections.model';
import {
  formatProductIdsInput,
  parseProductIdsInput,
} from '../../utils/product-ids.util';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const EMPTY_FORM: StoreShopCollectionsFormModel = {
  collections: [],
};

@Component({
  selector: 'app-store-shop-collections-config',
  imports: [
    AlertComponent,
    ButtonComponent,
    MediaPickerFieldComponent,
    TableActionButtonComponent,
  ],
  templateUrl: './store-shop-collections-config.component.html',
})
export class StoreShopCollectionsConfigComponent implements OnInit {
  private readonly storeShopCollectionsService = inject(StoreShopCollectionsService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');

  protected readonly formModel = signal<StoreShopCollectionsFormModel>({ ...EMPTY_FORM });
  protected readonly collections = computed(() => this.formModel().collections);

  protected readonly formatProductIdsInput = formatProductIdsInput;

  ngOnInit(): void {
    this.loadConfig();
  }

  protected loadConfig(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.storeShopCollectionsService
      .getConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.formModel.set({
            collections: config.collections.map((item) => ({ ...item })),
          });
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('No se pudieron cargar las colecciones de la tienda.');
          this.loading.set(false);
        },
      });
  }

  protected addCollection(): void {
    const timestamp = Date.now();
    const items = [
      ...this.formModel().collections,
      {
        id: `coleccion-${timestamp}`,
        slug: '',
        label: '',
        description: '',
        bannerImageUrl: '',
        status: true,
        productIds: [],
      },
    ];

    this.formModel.update((current) => ({ ...current, collections: items }));
  }

  protected removeCollection(index: number): void {
    const items = this.formModel().collections.filter((_, i) => i !== index);
    this.formModel.update((current) => ({ ...current, collections: items }));
  }

  protected updateCollection(index: number, patch: Partial<StoreShopCollectionItem>): void {
    const items = this.formModel().collections.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );

    this.formModel.update((current) => ({ ...current, collections: items }));
  }

  protected updateProductIdsInput(index: number, value: string): void {
    this.updateCollection(index, { productIds: parseProductIdsInput(value) });
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();

    const model = this.formModel();
    const invalid = model.collections.some(
      (item) =>
        !item.id.trim()
        || !item.slug.trim()
        || !SLUG_PATTERN.test(item.slug.trim())
        || !item.label.trim(),
    );

    if (invalid) {
      this.toastService.show(
        'error',
        'Cada colección debe tener ID, slug (kebab-case) y nombre.',
      );
      return;
    }

    this.saving.set(true);

    this.storeShopCollectionsService
      .saveConfig({
        collections: model.collections.map((item) => ({
          id: item.id.trim(),
          slug: item.slug.trim(),
          label: item.label.trim(),
          description: item.description.trim() || undefined,
          bannerImageUrl: item.bannerImageUrl.trim() || undefined,
          status: item.status,
          productIds: item.productIds,
        })),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.formModel.set({
            collections: config.collections.map((item) => ({ ...item })),
          });
          this.saving.set(false);
          this.toastService.show('success', 'Colecciones guardadas correctamente.');
        },
        error: (message: string) => {
          this.saving.set(false);
          this.toastService.show(
            'error',
            typeof message === 'string' ? message : 'No se pudieron guardar las colecciones.',
          );
        },
      });
  }
}

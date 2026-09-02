import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { StoreHomeCollectionsService } from '../../data-access/store-home-collections.service';
import {
  StoreHomeCollectionItem,
  StoreHomeCollectionsFormModel,
} from '../../models/store-home-collections.model';
import {
  formatProductIdsInput,
  parseProductIdsInput,
} from '../../utils/product-ids.util';

const EMPTY_FORM: StoreHomeCollectionsFormModel = {
  collections: [],
};

@Component({
  selector: 'app-store-home-collections-config',
  imports: [AlertComponent, ButtonComponent, TableActionButtonComponent],
  templateUrl: './store-home-collections-config.component.html',
})
export class StoreHomeCollectionsConfigComponent implements OnInit {
  private readonly storeHomeCollectionsService = inject(StoreHomeCollectionsService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');

  protected readonly formModel = signal<StoreHomeCollectionsFormModel>({ ...EMPTY_FORM });
  protected readonly collections = computed(() => this.formModel().collections);

  protected readonly formatProductIdsInput = formatProductIdsInput;

  ngOnInit(): void {
    this.loadConfig();
  }

  protected loadConfig(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.storeHomeCollectionsService
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
          this.loadError.set('No se pudieron cargar las colecciones del home.');
          this.loading.set(false);
        },
      });
  }

  protected addCollection(): void {
    const items = [
      ...this.formModel().collections,
      {
        id: `coleccion-${Date.now()}`,
        tag: '',
        title: '',
        description: '',
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

  protected updateCollection(index: number, patch: Partial<StoreHomeCollectionItem>): void {
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
      (item) => !item.id.trim() || !item.title.trim(),
    );

    if (invalid) {
      this.toastService.show('error', 'Cada colección debe tener ID y título.');
      return;
    }

    this.saving.set(true);

    this.storeHomeCollectionsService
      .saveConfig({
        collections: model.collections.map((item) => ({
          id: item.id.trim(),
          tag: item.tag.trim() || undefined,
          title: item.title.trim(),
          description: item.description.trim() || undefined,
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

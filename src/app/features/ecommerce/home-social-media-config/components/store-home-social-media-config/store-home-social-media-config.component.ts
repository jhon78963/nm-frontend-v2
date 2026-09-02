import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { MediaPickerFieldComponent } from '../../../../../shared/ui/media-picker/media-picker-field.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { StoreHomeSocialMediaService } from '../../data-access/store-home-social-media.service';
import {
  StoreHomeSocialMediaFormModel,
  StoreSocialMediaBanner,
  StoreSocialMediaPlatform,
} from '../../models/store-home-social-media.model';
import { toPersistedId } from '../../../home-banners-config/utils/persisted-id.util';

const EMPTY_FORM: StoreHomeSocialMediaFormModel = {
  status: true,
  title: '# TIKTOK',
  platform: 'tiktok',
  profileUrl: '',
  banners: [],
};

@Component({
  selector: 'app-store-home-social-media-config',
  imports: [AlertComponent, ButtonComponent, MediaPickerFieldComponent, TableActionButtonComponent],
  templateUrl: './store-home-social-media-config.component.html',
})
export class StoreHomeSocialMediaConfigComponent implements OnInit {
  private readonly storeHomeSocialMediaService = inject(StoreHomeSocialMediaService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');

  protected readonly formModel = signal<StoreHomeSocialMediaFormModel>({ ...EMPTY_FORM });
  protected readonly banners = computed(() => this.formModel().banners);

  ngOnInit(): void {
    this.loadConfig();
  }

  protected loadConfig(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.storeHomeSocialMediaService
      .getConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.formModel.set({
            status: config.status,
            title: config.title,
            platform: config.platform,
            profileUrl: config.profileUrl,
            banners: config.banners.map((item) => ({ ...item })),
          });
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('No se pudo cargar la sección de redes sociales.');
          this.loading.set(false);
        },
      });
  }

  protected updateField<K extends keyof StoreHomeSocialMediaFormModel>(
    key: K,
    value: StoreHomeSocialMediaFormModel[K],
  ): void {
    this.formModel.update((current) => ({ ...current, [key]: value }));
  }

  protected updatePlatform(platform: StoreSocialMediaPlatform): void {
    this.formModel.update((current) => ({ ...current, platform }));
  }

  protected addBanner(): void {
    const items = [...this.formModel().banners];
    const nextOrder =
      items.length > 0 ? Math.max(...items.map((item) => item.order)) + 1 : 0;

    items.push({
      imageUrl: '',
      href: '',
      status: true,
      order: nextOrder,
    });

    this.formModel.update((current) => ({ ...current, banners: items }));
  }

  protected removeBanner(index: number): void {
    const items = this.formModel()
      .banners.filter((_, i) => i !== index)
      .map((item, order) => ({ ...item, order }));

    this.formModel.update((current) => ({ ...current, banners: items }));
  }

  protected updateBanner(index: number, patch: Partial<StoreSocialMediaBanner>): void {
    const items = this.formModel().banners.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );

    this.formModel.update((current) => ({ ...current, banners: items }));
  }

  protected moveBanner(index: number, direction: -1 | 1): void {
    const targetIndex = index + direction;
    const items = [...this.formModel().banners];

    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    [items[index], items[targetIndex]] = [items[targetIndex], items[index]];

    this.formModel.update((current) => ({
      ...current,
      banners: items.map((item, order) => ({ ...item, order })),
    }));
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();

    const model = this.formModel();

    if (!model.title.trim()) {
      this.toastService.show('error', 'El título de la sección es obligatorio.');
      return;
    }

    const invalidBanner = model.banners.some((item) => !item.imageUrl.trim());

    if (invalidBanner) {
      this.toastService.show('error', 'Completa la URL de imagen de todos los banners.');
      return;
    }

    this.saving.set(true);

    this.storeHomeSocialMediaService
      .saveConfig({
        status: model.status,
        title: model.title.trim(),
        platform: model.platform,
        profileUrl: model.profileUrl.trim() || undefined,
        banners: model.banners.map((item, index) => ({
          id: toPersistedId(item.id),
          imageUrl: item.imageUrl.trim(),
          href: item.href.trim() || undefined,
          status: item.status,
          order: index,
        })),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.formModel.set({
            status: config.status,
            title: config.title,
            platform: config.platform,
            profileUrl: config.profileUrl,
            banners: config.banners.map((item) => ({ ...item })),
          });
          this.saving.set(false);
          this.toastService.show('success', 'Redes sociales guardadas correctamente.');
        },
        error: (message: string) => {
          this.saving.set(false);
          this.toastService.show(
            'error',
            typeof message === 'string' ? message : 'No se pudieron guardar los cambios.',
          );
        },
      });
  }
}

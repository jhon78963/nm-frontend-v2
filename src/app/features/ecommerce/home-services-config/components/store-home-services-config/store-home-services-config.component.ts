import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { MediaPickerFieldComponent } from '../../../../../shared/ui/media-picker/media-picker-field.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { StoreHomeServicesService } from '../../data-access/store-home-services.service';
import {
  StoreHomeServiceItem,
  StoreHomeServicesFormModel,
} from '../../models/store-home-services.model';
import { toPersistedId } from '../../../home-banners-config/utils/persisted-id.util';

const EMPTY_FORM: StoreHomeServicesFormModel = {
  status: true,
  services: [],
};

@Component({
  selector: 'app-store-home-services-config',
  imports: [AlertComponent, ButtonComponent, MediaPickerFieldComponent, TableActionButtonComponent],
  templateUrl: './store-home-services-config.component.html',
})
export class StoreHomeServicesConfigComponent implements OnInit {
  private readonly storeHomeServicesService = inject(StoreHomeServicesService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');

  protected readonly formModel = signal<StoreHomeServicesFormModel>({ ...EMPTY_FORM });
  protected readonly services = computed(() => this.formModel().services);

  ngOnInit(): void {
    this.loadConfig();
  }

  protected loadConfig(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.storeHomeServicesService
      .getConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.formModel.set({
            status: config.status,
            services: config.services.map((item) => ({ ...item })),
          });
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('No se pudieron cargar los servicios del home.');
          this.loading.set(false);
        },
      });
  }

  protected updateStatus(status: boolean): void {
    this.formModel.update((current) => ({ ...current, status }));
  }

  protected addService(): void {
    const items = [...this.formModel().services];
    const nextOrder =
      items.length > 0 ? Math.max(...items.map((item) => item.order)) + 1 : 0;

    items.push({
      imageUrl: '/images/theme/marketplace_one/service.png',
      title: '',
      description: '',
      status: true,
      order: nextOrder,
    });

    this.formModel.update((current) => ({ ...current, services: items }));
  }

  protected removeService(index: number): void {
    const items = this.formModel()
      .services.filter((_, i) => i !== index)
      .map((item, order) => ({ ...item, order }));

    this.formModel.update((current) => ({ ...current, services: items }));
  }

  protected updateService(index: number, patch: Partial<StoreHomeServiceItem>): void {
    const items = this.formModel().services.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );

    this.formModel.update((current) => ({ ...current, services: items }));
  }

  protected moveService(index: number, direction: -1 | 1): void {
    const targetIndex = index + direction;
    const items = [...this.formModel().services];

    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    [items[index], items[targetIndex]] = [items[targetIndex], items[index]];

    this.formModel.update((current) => ({
      ...current,
      services: items.map((item, order) => ({ ...item, order })),
    }));
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();

    const model = this.formModel();
    const invalid = model.services.some(
      (item) => !item.imageUrl.trim() || !item.title.trim() || !item.description.trim(),
    );

    if (invalid) {
      this.toastService.show(
        'error',
        'Completa imagen, título y descripción de todos los bloques de servicio.',
      );
      return;
    }

    this.saving.set(true);

    this.storeHomeServicesService
      .saveConfig({
        status: model.status,
        services: model.services.map((item, index) => ({
          id: toPersistedId(item.id),
          imageUrl: item.imageUrl.trim(),
          title: item.title.trim(),
          description: item.description.trim(),
          status: item.status,
          order: index,
        })),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.formModel.set({
            status: config.status,
            services: config.services.map((item) => ({ ...item })),
          });
          this.saving.set(false);
          this.toastService.show('success', 'Servicios del home guardados correctamente.');
        },
        error: (message: string) => {
          this.saving.set(false);
          this.toastService.show(
            'error',
            typeof message === 'string' ? message : 'No se pudieron guardar los servicios.',
          );
        },
      });
  }
}

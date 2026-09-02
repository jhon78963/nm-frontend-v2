import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  form,
  FormField,
  maxLength,
  required,
} from '@angular/forms/signals';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { CheckboxComponent } from '../../../../../shared/ui/checkbox/checkbox.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { MediaPickerFieldComponent } from '../../../../../shared/ui/media-picker/media-picker-field.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { TextareaComponent } from '../../../../../shared/ui/textarea/textarea.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import { StoreHeaderService } from '../../data-access/store-header.service';
import {
  StoreHeaderFormModel,
  StoreNavigationItem,
} from '../../models/store-header.model';

const EMPTY_FORM: StoreHeaderFormModel = {
  topbarMessage: '',
  supportPhone: '',
  logoText: '',
  logoUrl: '',
  topBarEnabled: true,
  stickyEnabled: true,
  navigationItems: [],
};

@Component({
  selector: 'app-store-header-config',
  imports: [
    FormField,
    AlertComponent,
    ButtonComponent,
    CheckboxComponent,
    InputComponent,
    MediaPickerFieldComponent,
    TableActionButtonComponent,
    TextareaComponent,
  ],
  templateUrl: './store-header-config.component.html',
})
export class StoreHeaderConfigComponent implements OnInit {
  private readonly storeHeaderService = inject(StoreHeaderService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');

  protected readonly formModel = signal<StoreHeaderFormModel>({ ...EMPTY_FORM });

  protected readonly headerForm = form(this.formModel, (schema) => {
    required(schema.logoText, { message: 'El texto del logo es obligatorio.' });
    maxLength(schema.logoText, 255, { message: 'Máximo 255 caracteres.' });
    maxLength(schema.topbarMessage, 500, { message: 'Máximo 500 caracteres.' });
    maxLength(schema.supportPhone, 30, { message: 'Máximo 30 caracteres.' });
    maxLength(schema.logoUrl, 500, { message: 'Máximo 500 caracteres.' });
  });

  protected readonly logoTextError = computed(() =>
    fieldErrorMessage(this.headerForm.logoText, {
      required: 'El texto del logo es obligatorio.',
      maxLength: 'Máximo 255 caracteres.',
    }),
  );

  protected readonly navigationItems = computed(
    () => this.formModel().navigationItems,
  );

  ngOnInit(): void {
    this.loadConfig();
  }

  protected loadConfig(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.storeHeaderService
      .getConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.formModel.set({
            topbarMessage: config.topbarMessage ?? '',
            supportPhone: config.supportPhone ?? '',
            logoText: config.logoText,
            logoUrl: config.logoUrl ?? '',
            topBarEnabled: config.topBarEnabled,
            stickyEnabled: config.stickyEnabled,
            navigationItems: config.navigationItems.map((item) => ({ ...item })),
          });
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set(
            'No se pudo cargar la configuración del header.',
          );
          this.loading.set(false);
        },
      });
  }

  protected addNavigationItem(): void {
    const items = [...this.formModel().navigationItems];
    const nextOrder =
      items.length > 0 ? Math.max(...items.map((item) => item.order)) + 1 : 0;

    items.push({
      label: '',
      href: '/',
      order: nextOrder,
      isActive: true,
    });

    this.formModel.update((current) => ({
      ...current,
      navigationItems: items,
    }));
  }

  protected removeNavigationItem(index: number): void {
    const items = this.formModel().navigationItems.filter((_, i) => i !== index);
    this.formModel.update((current) => ({
      ...current,
      navigationItems: items.map((item, order) => ({ ...item, order })),
    }));
  }

  protected updateNavigationItem(
    index: number,
    patch: Partial<StoreNavigationItem>,
  ): void {
    const items = this.formModel().navigationItems.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );

    this.formModel.update((current) => ({
      ...current,
      navigationItems: items,
    }));
  }

  protected onTopbarMessageChange(value: string): void {
    this.formModel.update((current) => ({ ...current, topbarMessage: value }));
  }

  protected onTopBarEnabledChange(value: boolean): void {
    this.formModel.update((current) => ({ ...current, topBarEnabled: value }));
  }

  protected onStickyEnabledChange(value: boolean): void {
    this.formModel.update((current) => ({ ...current, stickyEnabled: value }));
  }

  protected moveNavigationItem(index: number, direction: -1 | 1): void {
    const targetIndex = index + direction;
    const items = [...this.formModel().navigationItems];

    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    [items[index], items[targetIndex]] = [items[targetIndex], items[index]];

    this.formModel.update((current) => ({
      ...current,
      navigationItems: items.map((item, order) => ({ ...item, order })),
    }));
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.headerForm().markAsTouched();

    if (this.headerForm().invalid()) {
      return;
    }

    const model = this.formModel();
    const invalidNav = model.navigationItems.some(
      (item) => !item.label.trim() || !item.href.trim(),
    );

    if (invalidNav) {
      this.toastService.show(
        'error',
        'Completa etiqueta y enlace de todos los ítems del menú.',
      );
      return;
    }

    this.saving.set(true);

    this.storeHeaderService
      .saveConfig({
        topbarMessage: model.topbarMessage.trim() || null,
        supportPhone: model.supportPhone.trim() || null,
        logoText: model.logoText.trim(),
        logoUrl: model.logoUrl.trim() || null,
        topBarEnabled: model.topBarEnabled,
        stickyEnabled: model.stickyEnabled,
        navigationItems: model.navigationItems.map((item, index) => ({
          id: item.id,
          label: item.label.trim(),
          href: item.href.trim(),
          order: index,
          isActive: item.isActive,
          parentId: item.parentId ?? null,
        })),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.formModel.update((current) => ({
            ...current,
            navigationItems: config.navigationItems.map((item) => ({ ...item })),
          }));
          this.saving.set(false);
          this.toastService.show(
            'success',
            'Configuración del header guardada correctamente.',
          );
        },
        error: (message: string) => {
          this.saving.set(false);
          this.toastService.show(
            'error',
            typeof message === 'string'
              ? message
              : 'No se pudo guardar la configuración.',
          );
        },
      });
  }
}

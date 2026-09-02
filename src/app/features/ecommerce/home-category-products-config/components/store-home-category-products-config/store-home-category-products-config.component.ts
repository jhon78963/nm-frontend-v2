import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { StoreHomeCategoryProductsService } from '../../data-access/store-home-category-products.service';
import {
  StoreCategoryProductTab,
  StoreHomeCategoryProductsFormModel,
} from '../../models/store-home-category-products.model';
import {
  formatProductIdsInput,
  parseProductIdsInput,
} from '../../utils/product-ids.util';

const EMPTY_FORM: StoreHomeCategoryProductsFormModel = {
  status: true,
  leftPanel: {
    title: 'Menos de S/ 20',
    status: true,
    productIds: [],
  },
  rightPanel: {
    productCategory: {
      title: 'RECOMENDACIONES PARA TI',
      status: true,
      tabs: [],
    },
    productBanner: {
      status: false,
      imageUrl: '',
      href: '/tienda',
      alt: '',
    },
  },
};

@Component({
  selector: 'app-store-home-category-products-config',
  imports: [AlertComponent, ButtonComponent, TableActionButtonComponent],
  templateUrl: './store-home-category-products-config.component.html',
})
export class StoreHomeCategoryProductsConfigComponent implements OnInit {
  private readonly storeHomeCategoryProductsService = inject(StoreHomeCategoryProductsService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');

  protected readonly formModel = signal<StoreHomeCategoryProductsFormModel>({
    ...EMPTY_FORM,
    leftPanel: { ...EMPTY_FORM.leftPanel },
    rightPanel: {
      productCategory: {
        ...EMPTY_FORM.rightPanel.productCategory,
        tabs: [],
      },
      productBanner: { ...EMPTY_FORM.rightPanel.productBanner },
    },
  });

  protected readonly tabs = computed(() => this.formModel().rightPanel.productCategory.tabs);

  protected readonly formatProductIdsInput = formatProductIdsInput;

  ngOnInit(): void {
    this.loadConfig();
  }

  protected loadConfig(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.storeHomeCategoryProductsService
      .getConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.formModel.set({
            status: config.status,
            leftPanel: { ...config.leftPanel },
            rightPanel: {
              productCategory: {
                ...config.rightPanel.productCategory,
                tabs: config.rightPanel.productCategory.tabs.map((tab) => ({ ...tab })),
              },
              productBanner: { ...config.rightPanel.productBanner },
            },
          });
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('No se pudo cargar la sección de productos por categoría.');
          this.loading.set(false);
        },
      });
  }

  protected updateStatus(status: boolean): void {
    this.formModel.update((current) => ({ ...current, status }));
  }

  protected updateLeftPanel(
    patch: Partial<StoreHomeCategoryProductsFormModel['leftPanel']>,
  ): void {
    this.formModel.update((current) => ({
      ...current,
      leftPanel: { ...current.leftPanel, ...patch },
    }));
  }

  protected updateLeftPanelProductIds(value: string): void {
    this.updateLeftPanel({ productIds: parseProductIdsInput(value) });
  }

  protected updateProductCategory(
    patch: Partial<StoreHomeCategoryProductsFormModel['rightPanel']['productCategory']>,
  ): void {
    this.formModel.update((current) => ({
      ...current,
      rightPanel: {
        ...current.rightPanel,
        productCategory: { ...current.rightPanel.productCategory, ...patch },
      },
    }));
  }

  protected updateProductBanner(
    patch: Partial<StoreHomeCategoryProductsFormModel['rightPanel']['productBanner']>,
  ): void {
    this.formModel.update((current) => ({
      ...current,
      rightPanel: {
        ...current.rightPanel,
        productBanner: { ...current.rightPanel.productBanner, ...patch },
      },
    }));
  }

  protected addTab(): void {
    const tabs = [
      ...this.formModel().rightPanel.productCategory.tabs,
      { id: '', name: '', slug: '', productIds: [] },
    ];

    this.updateProductCategory({ tabs });
  }

  protected removeTab(index: number): void {
    const tabs = this.formModel().rightPanel.productCategory.tabs.filter((_, i) => i !== index);
    this.updateProductCategory({ tabs });
  }

  protected updateTab(index: number, patch: Partial<StoreCategoryProductTab>): void {
    const tabs = this.formModel().rightPanel.productCategory.tabs.map((tab, i) =>
      i === index ? { ...tab, ...patch } : tab,
    );

    this.updateProductCategory({ tabs });
  }

  protected updateTabProductIds(index: number, value: string): void {
    this.updateTab(index, { productIds: parseProductIdsInput(value) });
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();

    const model = this.formModel();

    if (!model.leftPanel.title.trim()) {
      this.toastService.show('error', 'El título del panel izquierdo es obligatorio.');
      return;
    }

    if (!model.rightPanel.productCategory.title.trim()) {
      this.toastService.show('error', 'El título del panel de categorías es obligatorio.');
      return;
    }

    const invalidTab = model.rightPanel.productCategory.tabs.some(
      (tab) => !tab.id.trim() || !tab.name.trim(),
    );

    if (invalidTab) {
      this.toastService.show('error', 'Cada pestaña debe tener ID y nombre.');
      return;
    }

    this.saving.set(true);

    this.storeHomeCategoryProductsService
      .saveConfig({
        status: model.status,
        leftPanel: {
          title: model.leftPanel.title.trim(),
          status: model.leftPanel.status,
          productIds: model.leftPanel.productIds,
        },
        rightPanel: {
          productCategory: {
            title: model.rightPanel.productCategory.title.trim(),
            status: model.rightPanel.productCategory.status,
            tabs: model.rightPanel.productCategory.tabs.map((tab) => ({
              id: tab.id.trim(),
              name: tab.name.trim(),
              slug: tab.slug?.trim() || undefined,
              productIds: tab.productIds,
            })),
          },
          productBanner: {
            status: model.rightPanel.productBanner.status,
            imageUrl: model.rightPanel.productBanner.imageUrl.trim(),
            href: model.rightPanel.productBanner.href.trim(),
            alt: model.rightPanel.productBanner.alt?.trim() || undefined,
          },
        },
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.formModel.set({
            status: config.status,
            leftPanel: { ...config.leftPanel },
            rightPanel: {
              productCategory: {
                ...config.rightPanel.productCategory,
                tabs: config.rightPanel.productCategory.tabs.map((tab) => ({ ...tab })),
              },
              productBanner: { ...config.rightPanel.productBanner },
            },
          });
          this.saving.set(false);
          this.toastService.show('success', 'Sección guardada correctamente.');
        },
        error: (message: string) => {
          this.saving.set(false);
          this.toastService.show(
            'error',
            typeof message === 'string' ? message : 'No se pudo guardar la sección.',
          );
        },
      });
  }
}

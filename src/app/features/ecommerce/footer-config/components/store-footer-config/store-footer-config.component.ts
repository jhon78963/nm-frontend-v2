import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { MediaPickerFieldComponent } from '../../../../../shared/ui/media-picker/media-picker-field.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { StoreFooterService } from '../../data-access/store-footer.service';
import {
  RECOMMENDED_FOOTER_AYUDA_LINKS,
  RECOMMENDED_FOOTER_INFORMACION_LINKS,
  RECOMMENDED_FOOTER_NOSOTROS_LINKS,
} from '../../constants/recommended-footer-links.constants';
import {
  StoreFooterFormModel,
  StoreFooterLinkItem,
} from '../../models/store-footer.model';
import { toPersistedId } from '../../../home-banners-config/utils/persisted-id.util';

type FooterLinkKey = 'categories' | 'usefulLinks' | 'helpCenterLinks';

const EMPTY_FORM: StoreFooterFormModel = {
  newsletterTitle: '',
  newsletterSubtitle: '',
  aboutText: '',
  address: '',
  supportNumber: '',
  supportEmail: '',
  socialMediaEnabled: true,
  facebookUrl: '',
  twitterUrl: '',
  instagramUrl: '',
  pinterestUrl: '',
  tiktokUrl: '',
  categories: [],
  usefulLinks: [],
  helpCenterLinks: [],
  copyrightEnabled: true,
  copyrightContent: '',
  paymentImageUrl: '',
};

@Component({
  selector: 'app-store-footer-config',
  imports: [AlertComponent, ButtonComponent, MediaPickerFieldComponent, TableActionButtonComponent],
  templateUrl: './store-footer-config.component.html',
})
export class StoreFooterConfigComponent implements OnInit {
  private readonly storeFooterService = inject(StoreFooterService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');

  protected readonly formModel = signal<StoreFooterFormModel>({ ...EMPTY_FORM });

  ngOnInit(): void {
    this.loadConfig();
  }

  protected loadConfig(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.storeFooterService
      .getConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          const nextConfig = this.isLegacyFooterConfig(config)
            ? this.applyRecommendedLinks(config)
            : config;

          if (nextConfig !== config) {
            this.toastService.show(
              'success',
              'Se reemplazaron enlaces de plantilla por la estructura recomendada en español. Guarda para confirmar.',
            );
          }

          this.formModel.set({
            ...nextConfig,
            categories: nextConfig.categories.map((item) => ({ ...item })),
            usefulLinks: nextConfig.usefulLinks.map((item) => ({ ...item })),
            helpCenterLinks: nextConfig.helpCenterLinks.map((item) => ({ ...item })),
          });
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('No se pudo cargar la configuración del footer.');
          this.loading.set(false);
        },
      });
  }

  protected updateField<K extends keyof StoreFooterFormModel>(
    key: K,
    value: StoreFooterFormModel[K],
  ): void {
    this.formModel.update((current) => ({ ...current, [key]: value }));
  }

  protected addLink(key: FooterLinkKey): void {
    const items = [...this.formModel()[key], { name: '', href: '' }];
    this.formModel.update((current) => ({ ...current, [key]: items }));
  }

  protected removeLink(key: FooterLinkKey, index: number): void {
    const items = this.formModel()[key].filter((_, i) => i !== index);
    this.formModel.update((current) => ({ ...current, [key]: items }));
  }

  protected updateLink(
    key: FooterLinkKey,
    index: number,
    patch: Partial<StoreFooterLinkItem>,
  ): void {
    const items = this.formModel()[key].map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );

    this.formModel.update((current) => ({ ...current, [key]: items }));
  }

  protected loadRecommendedLinks(): void {
    const confirmed = confirm(
      '¿Reemplazar los enlaces de Nosotros, Información y Centro de ayuda con la estructura recomendada en español?',
    );

    if (!confirmed) {
      return;
    }

    this.formModel.update((current) => this.applyRecommendedLinks(current));

    this.toastService.show(
      'success',
      'Enlaces recomendados cargados. Revisa y guarda para aplicar los cambios.',
    );
  }

  private applyRecommendedLinks(config: StoreFooterFormModel): StoreFooterFormModel {
    return {
      ...config,
      categories: RECOMMENDED_FOOTER_NOSOTROS_LINKS.map((item) => ({ ...item })),
      usefulLinks: RECOMMENDED_FOOTER_INFORMACION_LINKS.map((item) => ({ ...item })),
      helpCenterLinks: RECOMMENDED_FOOTER_AYUDA_LINKS.map((item) => ({ ...item })),
    };
  }

  private isLegacyFooterConfig(config: StoreFooterFormModel): boolean {
    const legacyCategoryNames = new Set([
      'Baby Essentials',
      'Bag Emporium',
      'Books',
      'Christmas',
      'Classic Furnishings',
    ]);

    const hasLegacyCategories = config.categories.some((category) =>
      legacyCategoryNames.has(category.name),
    );

    const hasLegacyUsefulLinks = config.usefulLinks.some((link) =>
      ['Home', 'About Us', 'Offers'].includes(link.name),
    );

    const hasLegacyHelpLinks = config.helpCenterLinks.some((link) =>
      ['My Account', 'My Orders', 'Wishlist', "Faq's", 'Contact Us'].includes(link.name),
    );

    return hasLegacyCategories || hasLegacyUsefulLinks || hasLegacyHelpLinks;
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();

    const model = this.formModel();
    const invalidLinks = [
      ...model.categories,
      ...model.usefulLinks,
      ...model.helpCenterLinks,
    ].some(
      (item) =>
        (item.name.trim() && !item.href.trim()) || (!item.name.trim() && item.href.trim()),
    );

    if (!model.newsletterTitle.trim() || !model.aboutText.trim()) {
      this.toastService.show('error', 'Completa al menos el título del newsletter y el texto sobre la tienda.');
      return;
    }

    if (invalidLinks) {
      this.toastService.show('error', 'Completa nombre y enlace de todos los links del footer.');
      return;
    }

    this.saving.set(true);

    const mapLinks = (items: StoreFooterLinkItem[]) =>
      items
        .filter((item) => item.name.trim() && item.href.trim())
        .map((item) => ({
          id: toPersistedId(item.id),
          name: item.name.trim(),
          href: item.href.trim(),
        }));

    this.storeFooterService
      .saveConfig({
        newsletterTitle: model.newsletterTitle.trim(),
        newsletterSubtitle: model.newsletterSubtitle.trim(),
        aboutText: model.aboutText.trim(),
        address: model.address.trim(),
        supportNumber: model.supportNumber.trim(),
        supportEmail: model.supportEmail.trim(),
        socialMediaEnabled: model.socialMediaEnabled,
        facebookUrl: model.facebookUrl.trim(),
        twitterUrl: '',
        instagramUrl: model.instagramUrl.trim(),
        pinterestUrl: '',
        tiktokUrl: model.tiktokUrl.trim(),
        categories: mapLinks(model.categories),
        usefulLinks: mapLinks(model.usefulLinks),
        helpCenterLinks: mapLinks(model.helpCenterLinks),
        copyrightEnabled: model.copyrightEnabled,
        copyrightContent: model.copyrightContent.trim(),
        paymentImageUrl: model.paymentImageUrl.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.formModel.set({
            ...config,
            categories: config.categories.map((item) => ({ ...item })),
            usefulLinks: config.usefulLinks.map((item) => ({ ...item })),
            helpCenterLinks: config.helpCenterLinks.map((item) => ({ ...item })),
          });
          this.saving.set(false);
          this.toastService.show('success', 'Footer guardado correctamente.');
        },
        error: (message: string) => {
          this.saving.set(false);
          this.toastService.show(
            'error',
            typeof message === 'string' ? message : 'No se pudo guardar el footer.',
          );
        },
      });
  }
}

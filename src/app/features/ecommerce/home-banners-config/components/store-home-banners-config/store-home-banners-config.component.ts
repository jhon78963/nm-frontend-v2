import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { MediaPickerFieldComponent } from '../../../../../shared/ui/media-picker/media-picker-field.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { StoreHomeBannersService } from '../../data-access/store-home-banners.service';
import {
  StoreHeroSlide,
  StoreHomeBannersFormModel,
  StoreOfferBanner,
  StorePromoBanner,
} from '../../models/store-home-banners.model';
import { toPersistedId } from '../../utils/persisted-id.util';

const EMPTY_OFFER_BANNER: StoreOfferBanner = {
  imageUrl: '',
  href: '/tienda',
  altText: 'Banner promocional del home',
  isActive: true,
};

const EMPTY_FORM: StoreHomeBannersFormModel = {
  heroSlides: [],
  promoBanners: [],
  offerBanner: { ...EMPTY_OFFER_BANNER },
};

@Component({
  selector: 'app-store-home-banners-config',
  imports: [
    AlertComponent,
    ButtonComponent,
    MediaPickerFieldComponent,
    TableActionButtonComponent,
  ],
  templateUrl: './store-home-banners-config.component.html',
})
export class StoreHomeBannersConfigComponent implements OnInit {
  private readonly storeHomeBannersService = inject(StoreHomeBannersService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');

  protected readonly formModel = signal<StoreHomeBannersFormModel>({ ...EMPTY_FORM });

  protected readonly heroSlides = computed(() => this.formModel().heroSlides);
  protected readonly promoBanners = computed(() => this.formModel().promoBanners);
  protected readonly offerBanner = computed(() => this.formModel().offerBanner);

  ngOnInit(): void {
    this.loadConfig();
  }

  protected loadConfig(): void {
    this.loading.set(true);
    this.loadError.set('');

    forkJoin({
      heroSlides: this.storeHomeBannersService.getHeroSlides(),
      promoBanners: this.storeHomeBannersService.getPromoBanners(),
      offerBanner: this.storeHomeBannersService.getOfferBanner(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ heroSlides, promoBanners, offerBanner }) => {
          this.formModel.set({
            heroSlides: heroSlides.map((item) => ({ ...item })),
            promoBanners: promoBanners.map((item) => ({ ...item })),
            offerBanner: { ...offerBanner },
          });
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('No se pudieron cargar los banners.');
          this.loading.set(false);
        },
      });
  }

  protected addHeroSlide(): void {
    const items = [...this.formModel().heroSlides];
    const nextOrder =
      items.length > 0 ? Math.max(...items.map((item) => item.order)) + 1 : 0;

    items.push({
      imageUrl: '',
      href: '/tienda',
      alt: 'Banner principal',
      order: nextOrder,
      isActive: true,
    });

    this.formModel.update((current) => ({ ...current, heroSlides: items }));
  }

  protected removeHeroSlide(index: number): void {
    const items = this.formModel().heroSlides
      .filter((_, i) => i !== index)
      .map((item, order) => ({ ...item, order }));

    this.formModel.update((current) => ({ ...current, heroSlides: items }));
  }

  protected updateHeroSlide(index: number, patch: Partial<StoreHeroSlide>): void {
    const items = this.formModel().heroSlides.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );

    this.formModel.update((current) => ({ ...current, heroSlides: items }));
  }

  protected moveHeroSlide(index: number, direction: -1 | 1): void {
    this.moveItem('heroSlides', index, direction);
  }

  protected addPromoBanner(): void {
    const items = [...this.formModel().promoBanners];
    const nextOrder =
      items.length > 0 ? Math.max(...items.map((item) => item.order)) + 1 : 0;

    items.push({
      imageUrl: '',
      href: '/tienda',
      order: nextOrder,
      isActive: true,
    });

    this.formModel.update((current) => ({ ...current, promoBanners: items }));
  }

  protected removePromoBanner(index: number): void {
    const items = this.formModel().promoBanners
      .filter((_, i) => i !== index)
      .map((item, order) => ({ ...item, order }));

    this.formModel.update((current) => ({ ...current, promoBanners: items }));
  }

  protected updatePromoBanner(index: number, patch: Partial<StorePromoBanner>): void {
    const items = this.formModel().promoBanners.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );

    this.formModel.update((current) => ({ ...current, promoBanners: items }));
  }

  protected movePromoBanner(index: number, direction: -1 | 1): void {
    this.moveItem('promoBanners', index, direction);
  }

  protected updateOfferBanner(patch: Partial<StoreOfferBanner>): void {
    this.formModel.update((current) => ({
      ...current,
      offerBanner: { ...current.offerBanner, ...patch },
    }));
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();

    const model = this.formModel();
    const invalidHero = model.heroSlides.some(
      (item) => !item.imageUrl.trim() || !item.href.trim(),
    );
    const invalidPromo = model.promoBanners.some(
      (item) => !item.imageUrl.trim() || !item.href.trim(),
    );

    if (invalidHero) {
      this.toastService.show(
        'error',
        'Completa imagen y enlace de todos los slides del banner principal.',
      );
      return;
    }

    if (invalidPromo) {
      this.toastService.show(
        'error',
        'Completa imagen y enlace de todos los mini banners.',
      );
      return;
    }

    const offerBanner = model.offerBanner;
    if (offerBanner.isActive && (!offerBanner.imageUrl.trim() || !offerBanner.href.trim())) {
      this.toastService.show(
        'error',
        'Completa imagen y enlace del banner secundario ancho.',
      );
      return;
    }

    this.saving.set(true);

    forkJoin({
      heroSlides: this.storeHomeBannersService.saveHeroSlides({
        slides: model.heroSlides.map((item, index) => ({
          id: toPersistedId(item.id),
          imageUrl: item.imageUrl.trim(),
          href: item.href.trim(),
          alt: item.alt.trim() || 'Banner promocional',
          order: index,
          isActive: item.isActive,
        })),
      }),
      promoBanners: this.storeHomeBannersService.savePromoBanners({
        banners: model.promoBanners.map((item, index) => ({
          id: toPersistedId(item.id),
          imageUrl: item.imageUrl.trim(),
          href: item.href.trim(),
          order: index,
          isActive: item.isActive,
        })),
      }),
      offerBanner: this.storeHomeBannersService.saveOfferBanner({
        imageUrl: offerBanner.imageUrl.trim(),
        href: offerBanner.href.trim(),
        altText: offerBanner.altText.trim() || 'Banner promocional del home',
        isActive: offerBanner.isActive,
      }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ heroSlides, promoBanners, offerBanner: savedOfferBanner }) => {
          this.formModel.set({
            heroSlides: heroSlides.map((item) => ({ ...item })),
            promoBanners: promoBanners.map((item) => ({ ...item })),
            offerBanner: { ...savedOfferBanner },
          });
          this.saving.set(false);
          this.toastService.show('success', 'Banners guardados correctamente.');
        },
        error: (message: string) => {
          this.saving.set(false);
          this.toastService.show(
            'error',
            typeof message === 'string' ? message : 'No se pudieron guardar los banners.',
          );
        },
      });
  }

  private moveItem(
    key: 'heroSlides' | 'promoBanners',
    index: number,
    direction: -1 | 1,
  ): void {
    const targetIndex = index + direction;
    const items = [...this.formModel()[key]];

    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    [items[index], items[targetIndex]] = [items[targetIndex], items[index]];

    this.formModel.update((current) => ({
      ...current,
      [key]: items.map((item, order) => ({ ...item, order })),
    }));
  }
}

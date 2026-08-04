import { DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, of, Subject, switchMap, tap } from 'rxjs';
import { AlertComponent } from '../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { AiPredictionService } from '../../data-access/ai-prediction.service';
import {
  AiInsightTab,
  AiProductContext,
  AiProductOption,
  DEFAULT_HORIZON_DAYS,
  DemandPredictionResult,
  PriceOptimizationResult,
} from '../../models/ai-prediction.model';

@Component({
  selector: 'app-ai-insights-dashboard',
  imports: [DecimalPipe, RouterLink, AlertComponent, ButtonComponent],
  providers: [AiPredictionService],
  templateUrl: './ai-insights-dashboard.component.html',
})
export class AiInsightsDashboardComponent implements OnInit {
  private readonly aiPredictionService = inject(AiPredictionService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly productSearch$ = new Subject<string>();

  protected readonly activeTab = signal<AiInsightTab>('price');
  protected readonly horizonDays = signal(DEFAULT_HORIZON_DAYS);

  protected readonly selectedProduct = signal<AiProductOption | null>(null);
  protected readonly productContext = signal<AiProductContext | null>(null);
  protected readonly contextLoading = signal(false);
  protected readonly contextError = signal<string | null>(null);

  protected readonly productQuery = signal('');
  protected readonly productResults = signal<AiProductOption[]>([]);
  protected readonly productDropdownOpen = signal(false);
  protected readonly productSearching = signal(false);

  protected readonly priceLoading = signal(false);
  protected readonly demandLoading = signal(false);
  protected readonly priceResult = signal<PriceOptimizationResult | null>(null);
  protected readonly demandResult = signal<DemandPredictionResult | null>(null);
  protected readonly priceError = signal<string | null>(null);
  protected readonly demandError = signal<string | null>(null);

  protected readonly canSubmitPrice = computed(() => {
    const context = this.productContext();
    return (
      context != null &&
      context.canViewCost &&
      context.currentCost > 0 &&
      context.category.trim().length > 0 &&
      !this.contextLoading() &&
      !this.priceLoading()
    );
  });

  protected readonly canSubmitDemand = computed(() => {
    const context = this.productContext();
    const days = this.horizonDays();

    return (
      context != null &&
      !this.contextLoading() &&
      !this.demandLoading() &&
      days >= 1 &&
      days <= 365
    );
  });

  protected readonly priceDelta = computed(() => {
    const context = this.productContext();
    const result = this.priceResult();
    if (!context || !result) {
      return null;
    }

    return result.suggestedPrice - context.salePrice;
  });

  protected readonly priceDeltaPercent = computed(() => {
    const context = this.productContext();
    const result = this.priceResult();
    if (!context || !result || context.salePrice <= 0) {
      return null;
    }

    return ((result.suggestedPrice - context.salePrice) / context.salePrice) * 100;
  });

  protected readonly restockUrgency = computed(() => {
    const result = this.demandResult();
    if (!result) {
      return 'neutral' as const;
    }

    if (result.suggestedPurchaseQuantity <= 0) {
      return 'ok' as const;
    }
    if (result.suggestedPurchaseQuantity >= 20) {
      return 'high' as const;
    }
    return 'medium' as const;
  });

  ngOnInit(): void {
    this.wireProductSearch();
  }

  protected setActiveTab(tab: AiInsightTab): void {
    this.activeTab.set(tab);
  }

  protected onProductSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.productQuery.set(value);
    this.productDropdownOpen.set(true);
    this.productSearch$.next(value);
  }

  protected openProductDropdown(): void {
    if (this.productQuery().trim().length >= 2) {
      this.productDropdownOpen.set(true);
    }
  }

  protected closeProductDropdown(): void {
    setTimeout(() => this.productDropdownOpen.set(false), 150);
  }

  protected onProductPicked(product: AiProductOption): void {
    this.selectedProduct.set(product);
    this.productQuery.set(product.name);
    this.productDropdownOpen.set(false);
    this.productResults.set([]);
    this.priceResult.set(null);
    this.demandResult.set(null);
    this.priceError.set(null);
    this.demandError.set(null);
    this.loadProductContext(product.id);
  }

  protected clearSelectedProduct(): void {
    this.selectedProduct.set(null);
    this.productContext.set(null);
    this.contextError.set(null);
    this.productQuery.set('');
    this.productResults.set([]);
    this.priceResult.set(null);
    this.demandResult.set(null);
    this.priceError.set(null);
    this.demandError.set(null);
  }

  protected updateHorizonDays(value: string): void {
    const parsed = value.trim() === '' ? DEFAULT_HORIZON_DAYS : Number(value);
    this.horizonDays.set(
      Number.isFinite(parsed)
        ? Math.min(365, Math.max(1, Math.trunc(parsed)))
        : DEFAULT_HORIZON_DAYS,
    );
    this.demandResult.set(null);
    this.demandError.set(null);
  }

  protected submitPriceOptimization(): void {
    const context = this.productContext();
    if (!context || !this.canSubmitPrice()) {
      return;
    }

    this.priceLoading.set(true);
    this.priceError.set(null);
    this.priceResult.set(null);

    this.aiPredictionService
      .optimizePrice(context.productId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.priceResult.set(result);
          this.priceLoading.set(false);
          this.toastService.show('success', 'Precio sugerido calculado correctamente.');
        },
        error: (message: string) => {
          this.priceError.set(message);
          this.priceLoading.set(false);
          this.toastService.show('error', message);
        },
      });
  }

  protected submitDemandPrediction(): void {
    const context = this.productContext();
    if (!context || !this.canSubmitDemand()) {
      return;
    }

    this.demandLoading.set(true);
    this.demandError.set(null);
    this.demandResult.set(null);

    this.aiPredictionService
      .predictDemand(context.productId, this.horizonDays())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.demandResult.set(result);
          this.demandLoading.set(false);
          this.toastService.show('success', 'Predicción de demanda generada.');
        },
        error: (message: string) => {
          this.demandError.set(message);
          this.demandLoading.set(false);
          this.toastService.show('error', message);
        },
      });
  }

  private loadProductContext(productId: number): void {
    this.contextLoading.set(true);
    this.contextError.set(null);
    this.productContext.set(null);

    this.aiPredictionService
      .getProductContext(productId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (context) => {
          this.productContext.set(context);
          this.contextLoading.set(false);
        },
        error: (message: string) => {
          this.contextError.set(message);
          this.contextLoading.set(false);
          this.toastService.show('error', message);
        },
      });
  }

  private wireProductSearch(): void {
    this.productSearch$
      .pipe(
        debounceTime(300),
        tap(() => this.productSearching.set(true)),
        switchMap((query) => {
          const trimmed = query.trim();
          if (trimmed.length < 2) {
            return of([] as AiProductOption[]);
          }

          return this.aiPredictionService.searchProducts(trimmed, 20).pipe(
            catchError(() => of([] as AiProductOption[])),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => {
          this.productResults.set(rows);
          this.productSearching.set(false);
        },
        error: () => this.productSearching.set(false),
      });
  }
}

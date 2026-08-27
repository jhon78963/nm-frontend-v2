import { NgClass } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';

interface Step {
  label: string;
  route: string;
  icon: string;
  disabled: boolean;
}

@Component({
  selector: 'app-product-stepper',
  imports: [NgClass, RouterOutlet, ButtonComponent],
  templateUrl: './product-stepper.component.html',
})
export class ProductStepperComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly productId = signal<string | null>(null);
  protected readonly currentStepIndex = signal(0);

  protected readonly steps = computed<Step[]>(() => {
    const id = this.productId();
    const isNew = id === null;

    return [
      {
        label: 'General',
        route: isNew ? '/inventories/products/new' : `/inventories/products/${id}/general`,
        icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        disabled: false,
      },
      {
        label: 'Tallas',
        route: `/inventories/products/${id}/sizes`,
        icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
        disabled: isNew,
      },
      {
        label: 'Colores',
        route: `/inventories/products/${id}/colors`,
        icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
        disabled: isNew,
      },
      {
        label: 'Ecommerce',
        route: `/inventories/products/${id}/ecommerce`,
        icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
        disabled: isNew,
      },
      {
        label: 'Kardex',
        route: `/inventories/products/${id}/kardex`,
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
        disabled: isNew,
      },
      {
        label: 'Historial',
        route: `/inventories/products/${id}/history`,
        icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
        disabled: isNew,
      },
    ];
  });

  protected readonly canGoBack = computed(() => this.currentStepIndex() > 0);
  protected readonly canGoNext = computed(
    () => this.currentStepIndex() < this.steps().length - 1 && this.productId() !== null,
  );

  protected readonly currentStep = computed(
    () => this.steps()[this.currentStepIndex()],
  );

  protected readonly stepProgressLabel = computed(
    () => `Paso ${this.currentStepIndex() + 1} de ${this.steps().length}`,
  );

  ngOnInit(): void {
    this.updateFromRoute();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.updateFromRoute();
      });
  }

  protected updateFromRoute(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.productId.set(idParam && idParam !== 'new' ? idParam : null);

    const url = this.router.url;
    const stepMatch = url.match(
      /\/products\/(?:new|([^/]+)\/(general|sizes|colors|ecommerce|kardex|history))/,
    );

    if (!stepMatch) {
      this.currentStepIndex.set(0);
      return;
    }

    const stepName = url.includes('/new') ? 'general' : stepMatch[2];
    const stepNames = ['general', 'sizes', 'colors', 'ecommerce', 'kardex', 'history'];
    const index = stepNames.indexOf(stepName);
    this.currentStepIndex.set(index >= 0 ? index : 0);
  }

  protected goToStep(index: number): void {
    const step = this.steps()[index];
    if (step && !step.disabled) {
      this.router.navigate([step.route]);
    }
  }

  protected goBack(): void {
    if (this.canGoBack()) {
      this.goToStep(this.currentStepIndex() - 1);
    }
  }

  protected goNext(): void {
    if (this.canGoNext()) {
      this.goToStep(this.currentStepIndex() + 1);
    }
  }

  protected onProductSaved(data: { message: string; productId: string }): void {
    this.toastService.show('success', data.message);
    this.productId.set(data.productId);

    if (this.currentStepIndex() === 0) {
      this.router.navigate([`/inventories/products/${data.productId}/sizes`]);
    }
  }
}

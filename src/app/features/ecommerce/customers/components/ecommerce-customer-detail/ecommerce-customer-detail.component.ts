import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { SelectComponent } from '../../../../../shared/ui/select/select.component';
import { TabPanelDirective } from '../../../../../shared/ui/tab-view/tab-panel.directive';
import { TabViewComponent } from '../../../../../shared/ui/tab-view/tab-view.component';
import { TextareaComponent } from '../../../../../shared/ui/textarea/textarea.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { EcommerceCustomersService } from '../../data-access/ecommerce-customers.service';
import {
  EcommerceCustomerDetail,
  EcommerceCustomerNotification,
  EcommerceCustomerOrderSummary,
  EcommerceCustomerRefund,
  EcommerceCustomerReview,
  REFUND_STATUS_OPTIONS,
} from '../../models/ecommerce-customer.model';

@Component({
  selector: 'app-ecommerce-customer-detail',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    TextareaComponent,
    TabViewComponent,
    TabPanelDirective,
  ],
  templateUrl: './ecommerce-customer-detail.component.html',
})
export class EcommerceCustomerDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly customersService = inject(EcommerceCustomersService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly detail = signal<EcommerceCustomerDetail | null>(null);
  protected readonly orders = signal<EcommerceCustomerOrderSummary[]>([]);
  protected readonly refunds = signal<EcommerceCustomerRefund[]>([]);
  protected readonly reviews = signal<EcommerceCustomerReview[]>([]);
  protected readonly notifications = signal<EcommerceCustomerNotification[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly activeTab = signal('profile');
  protected readonly refundStatusOptions = REFUND_STATUS_OPTIONS;

  protected readonly tabs = [
    { id: 'profile', label: 'Perfil' },
    { id: 'orders', label: 'Pedidos' },
    { id: 'refunds', label: 'Reembolsos' },
    { id: 'reviews', label: 'Reseñas' },
    { id: 'notifications', label: 'Notificaciones' },
  ];

  protected readonly profileForm = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    isEnabled: new FormControl('true', { nonNullable: true }),
  });

  protected readonly refundForms = new Map<string, FormGroup<{
    status: FormControl<EcommerceCustomerRefund['status']>;
    adminNotes: FormControl<string>;
  }>>();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }

    this.loadCustomer(id);
    this.loadOrders(id);
    this.loadRefunds(id);
    this.loadReviews(id);
    this.loadNotifications(id);
  }

  protected onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  protected saveProfile(): void {
    const current = this.detail();
    if (!current) return;

    this.saving.set(true);

    this.customersService
      .update(current.customer.id, {
        name: this.profileForm.controls.name.value.trim(),
        isEnabled: this.profileForm.controls.isEnabled.value === 'true',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.detail.update((value) =>
            value
              ? {
                  ...value,
                  customer: {
                    ...value.customer,
                    ...response.customer,
                  },
                }
              : value,
          );
          this.toastService.show('success', 'Cliente actualizado.');
          this.saving.set(false);
        },
        error: () => {
          this.toastService.show('error', 'No se pudo actualizar el cliente.');
          this.saving.set(false);
        },
      });
  }

  protected saveRefund(refund: EcommerceCustomerRefund): void {
    const form = this.refundForms.get(refund.id);
    if (!form) return;

    this.customersService
      .updateRefund(refund.id, {
        status: form.controls.status.value as EcommerceCustomerRefund['status'],
        adminNotes: form.controls.adminNotes.value.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.refunds.update((items) =>
            items.map((item) => (item.id === refund.id ? response.refund : item)),
          );
          this.toastService.show('success', 'Reembolso actualizado.');
        },
        error: () => {
          this.toastService.show('error', 'No se pudo actualizar el reembolso.');
        },
      });
  }

  protected getRefundForm(refund: EcommerceCustomerRefund): FormGroup {
    const existing = this.refundForms.get(refund.id);
    if (existing) return existing;

    const form = new FormGroup({
      status: new FormControl<EcommerceCustomerRefund['status']>(refund.status, {
        nonNullable: true,
      }),
      adminNotes: new FormControl(refund.adminNotes ?? '', { nonNullable: true }),
    });

    this.refundForms.set(refund.id, form);
    return form;
  }

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(value);
  }

  protected formatDate(value: string, withTime = false): string {
    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'medium',
      ...(withTime ? { timeStyle: 'short' } : {}),
    }).format(new Date(value));
  }

  protected formatAddress(address: EcommerceCustomerDetail['addresses'][number]): string {
    return [
      address.address1,
      address.address2,
      `${address.city}, ${address.state} ${address.postcode}`,
      address.country,
    ]
      .filter(Boolean)
      .join(', ');
  }

  private loadCustomer(id: string): void {
    this.customersService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.detail.set(response);
          this.profileForm.patchValue({
            name: response.customer.name,
            isEnabled: response.customer.isEnabled ? 'true' : 'false',
          });
          this.loading.set(false);
        },
        error: () => {
          this.toastService.show('error', 'No se pudo cargar el cliente.');
          this.loading.set(false);
        },
      });
  }

  private loadOrders(id: string): void {
    this.customersService
      .listOrders(id, { page: 1, perPage: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.orders.set(response.orders),
        error: () => this.orders.set([]),
      });
  }

  private loadRefunds(id: string): void {
    this.customersService
      .listRefunds(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.refunds.set(response.refunds),
        error: () => this.refunds.set([]),
      });
  }

  private loadReviews(id: string): void {
    this.customersService
      .listReviews(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.reviews.set(response.reviews),
        error: () => this.reviews.set([]),
      });
  }

  private loadNotifications(id: string): void {
    this.customersService
      .listNotifications(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.notifications.set(response.notifications),
        error: () => this.notifications.set([]),
      });
  }
}

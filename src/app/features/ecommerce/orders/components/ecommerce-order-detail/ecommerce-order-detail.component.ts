import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { SelectComponent } from '../../../../../shared/ui/select/select.component';
import { TextareaComponent } from '../../../../../shared/ui/textarea/textarea.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { EcommerceOrdersService } from '../../data-access/ecommerce-orders.service';
import {
  EcommerceOrder,
  EcommerceOrderStatus,
  ORDER_STATUS_OPTIONS,
} from '../../models/ecommerce-order.model';

@Component({
  selector: 'app-ecommerce-order-detail',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    SelectComponent,
    TextareaComponent,
  ],
  templateUrl: './ecommerce-order-detail.component.html',
})
export class EcommerceOrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersService = inject(EcommerceOrdersService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly order = signal<EcommerceOrder | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly statusOptions = ORDER_STATUS_OPTIONS;

  protected readonly form = new FormGroup({
    status: new FormControl<EcommerceOrderStatus>('pending', { nonNullable: true }),
    paymentStatus: new FormControl<'pending' | 'paid'>('pending', { nonNullable: true }),
    orderNotes: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }

    this.ordersService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.order.set(order);
          this.form.patchValue({
            status: order.status,
            paymentStatus: order.paymentStatus,
            orderNotes: order.orderNotes ?? '',
          });
          this.loading.set(false);
        },
        error: () => {
          this.toastService.show('error', 'No se pudo cargar el pedido.');
          this.loading.set(false);
        },
      });
  }

  protected save(): void {
    const current = this.order();
    if (!current) return;

    this.saving.set(true);

    this.ordersService
      .update(current.id, {
        status: this.form.controls.status.value,
        paymentStatus: this.form.controls.paymentStatus.value,
        orderNotes: this.form.controls.orderNotes.value,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.order.set(updated);
          this.toastService.show('success', 'Pedido actualizado.');
          this.saving.set(false);
        },
        error: () => {
          this.toastService.show('error', 'No se pudo actualizar el pedido.');
          this.saving.set(false);
        },
      });
  }

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(value);
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}

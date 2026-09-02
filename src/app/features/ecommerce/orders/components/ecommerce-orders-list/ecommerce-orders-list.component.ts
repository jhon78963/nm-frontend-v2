import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { SelectComponent } from '../../../../../shared/ui/select/select.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { EcommerceOrdersService } from '../../data-access/ecommerce-orders.service';
import {
  EcommerceOrder,
  ORDER_STATUS_OPTIONS,
} from '../../models/ecommerce-order.model';

@Component({
  selector: 'app-ecommerce-orders-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    InputComponent,
    SelectComponent,
  ],
  templateUrl: './ecommerce-orders-list.component.html',
})
export class EcommerceOrdersListComponent implements OnInit {
  private readonly ordersService = inject(EcommerceOrdersService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly orders = signal<EcommerceOrder[]>([]);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly total = signal(0);
  protected readonly statusOptions = ORDER_STATUS_OPTIONS;

  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadOrders();

    this.filterForm.controls.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadOrders();
      });

    this.filterForm.controls.status.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadOrders();
      });
  }

  protected loadOrders(): void {
    this.loading.set(true);

    const status = this.filterForm.controls.status.value;
    this.ordersService
      .list({
        page: this.page(),
        perPage: 20,
        search: this.filterForm.controls.search.value.trim() || undefined,
        status: (status || undefined) as EcommerceOrder['status'] | undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.orders.set(response.orders);
          this.total.set(response.meta.total);
          this.totalPages.set(response.meta.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.toastService.show('error', 'No se pudieron cargar los pedidos.');
          this.loading.set(false);
        },
      });
  }

  protected clearFilters(): void {
    this.filterForm.reset({ search: '', status: '' });
    this.page.set(1);
    this.loadOrders();
  }

  protected goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages()) return;
    this.page.set(nextPage);
    this.loadOrders();
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

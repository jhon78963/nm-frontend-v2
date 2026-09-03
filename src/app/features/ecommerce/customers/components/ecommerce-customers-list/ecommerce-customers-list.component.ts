import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { SelectComponent } from '../../../../../shared/ui/select/select.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { EcommerceCustomersService } from '../../data-access/ecommerce-customers.service';
import {
  CUSTOMER_STATUS_OPTIONS,
  EcommerceCustomerListItem,
} from '../../models/ecommerce-customer.model';

@Component({
  selector: 'app-ecommerce-customers-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    InputComponent,
    SelectComponent,
  ],
  templateUrl: './ecommerce-customers-list.component.html',
})
export class EcommerceCustomersListComponent implements OnInit {
  private readonly customersService = inject(EcommerceCustomersService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly customers = signal<EcommerceCustomerListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly total = signal(0);
  protected readonly statusOptions = CUSTOMER_STATUS_OPTIONS;

  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadCustomers();

    this.filterForm.controls.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadCustomers();
      });

    this.filterForm.controls.status.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadCustomers();
      });
  }

  protected loadCustomers(): void {
    this.loading.set(true);

    const status = this.filterForm.controls.status.value;
    const isEnabled =
      status === 'true' ? true : status === 'false' ? false : undefined;

    this.customersService
      .list({
        page: this.page(),
        perPage: 20,
        search: this.filterForm.controls.search.value.trim() || undefined,
        isEnabled,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.customers.set(response.customers);
          this.total.set(response.meta.total);
          this.totalPages.set(response.meta.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.toastService.show('error', 'No se pudieron cargar los clientes.');
          this.loading.set(false);
        },
      });
  }

  protected clearFilters(): void {
    this.filterForm.reset({ search: '', status: '' });
    this.page.set(1);
    this.loadCustomers();
  }

  protected goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages()) return;
    this.page.set(nextPage);
    this.loadCustomers();
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
    }).format(new Date(value));
  }
}

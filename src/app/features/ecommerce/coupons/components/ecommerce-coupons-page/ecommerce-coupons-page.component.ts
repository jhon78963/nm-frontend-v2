import { NgClass } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { SelectComponent } from '../../../../../shared/ui/select/select.component';
import { TextareaComponent } from '../../../../../shared/ui/textarea/textarea.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { EcommerceCouponsService } from '../../data-access/ecommerce-coupons.service';
import {
  COUPON_DISCOUNT_TYPE_OPTIONS,
  EcommerceCoupon,
} from '../../models/ecommerce-coupon.model';

@Component({
  selector: 'app-ecommerce-coupons-page',
  imports: [
    ReactiveFormsModule,
    NgClass,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    TextareaComponent,
  ],
  templateUrl: './ecommerce-coupons-page.component.html',
})
export class EcommerceCouponsPageComponent implements OnInit {
  private readonly couponsService = inject(EcommerceCouponsService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly coupons = signal<EcommerceCoupon[]>([]);
  protected readonly discountTypeOptions = COUPON_DISCOUNT_TYPE_OPTIONS;

  protected readonly createForm = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    discountType: new FormControl<'percentage' | 'fixed'>('percentage', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    discountValue: new FormControl(10, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)],
    }),
    minSubtotal: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    maxDiscount: new FormControl<number | null>(null),
    perCustomerLimit: new FormControl(1, { nonNullable: true, validators: [Validators.min(0)] }),
    perIpLimit: new FormControl(1, { nonNullable: true, validators: [Validators.min(0)] }),
    singleUse: new FormControl(true, { nonNullable: true }),
    isWelcome: new FormControl(false, { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadCoupons();

    this.createForm.controls.singleUse.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((singleUse) => {
        if (singleUse) {
          this.createForm.patchValue({ perCustomerLimit: 1, perIpLimit: 1 }, { emitEvent: false });
        }
      });
  }

  protected discountLabel(coupon: EcommerceCoupon): string {
    if (coupon.discountType === 'percentage') {
      return `${coupon.discountValue}%`;
    }

    return `S/ ${coupon.discountValue.toFixed(2)}`;
  }

  protected toggleActive(coupon: EcommerceCoupon): void {
    this.couponsService
      .update(coupon.id, { isActive: !coupon.isActive })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.show('success', `Cupón ${coupon.code} actualizado.`);
          this.loadCoupons();
        },
        error: () => this.toastService.show('error', 'No se pudo actualizar el cupón.'),
      });
  }

  protected createCoupon(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const value = this.createForm.getRawValue();
    this.saving.set(true);

    this.couponsService
      .create({
        code: value.code.trim().toUpperCase(),
        description: value.description.trim() || undefined,
        discountType: value.discountType,
        discountValue: Number(value.discountValue),
        minSubtotal: Number(value.minSubtotal),
        maxDiscount: value.maxDiscount != null ? Number(value.maxDiscount) : undefined,
        perCustomerLimit: Number(value.perCustomerLimit),
        perIpLimit: Number(value.perIpLimit),
        isWelcome: value.isWelcome,
        isActive: value.isActive,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.show('success', 'Cupón creado correctamente.');
          this.createForm.reset({
            code: '',
            description: '',
            discountType: 'percentage',
            discountValue: 10,
            minSubtotal: 0,
            maxDiscount: null,
            perCustomerLimit: 1,
            perIpLimit: 1,
            singleUse: true,
            isWelcome: false,
            isActive: true,
          });
          this.saving.set(false);
          this.loadCoupons();
        },
        error: () => {
          this.saving.set(false);
          this.toastService.show('error', 'No se pudo crear el cupón.');
        },
      });
  }

  private loadCoupons(): void {
    this.loading.set(true);

    this.couponsService
      .list()
      .pipe(
        catchError(() => {
          this.toastService.show('error', 'No se pudieron cargar los cupones.');
          return of({ coupons: [] });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.coupons.set(response.coupons);
        this.loading.set(false);
      });
  }
}

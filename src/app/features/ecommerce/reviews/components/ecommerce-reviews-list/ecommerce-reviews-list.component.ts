import { DatePipe, NgClass } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { EcommerceReviewsService } from '../../data-access/ecommerce-reviews.service';
import {
  EcommerceReview,
  EcommerceReviewStatus,
} from '../../models/ecommerce-review.model';

@Component({
  selector: 'app-ecommerce-reviews-list',
  imports: [NgClass, FormsModule, DatePipe, ButtonComponent],
  templateUrl: './ecommerce-reviews-list.component.html',
})
export class EcommerceReviewsListComponent implements OnInit {
  private readonly reviewsService = inject(EcommerceReviewsService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly reviews = signal<EcommerceReview[]>([]);
  protected readonly statusFilter = signal<EcommerceReviewStatus | 'all'>('pending');
  protected readonly rejectionDrafts = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.loadReviews();
  }

  protected setStatusFilter(value: EcommerceReviewStatus | 'all'): void {
    this.statusFilter.set(value);
    this.loadReviews();
  }

  protected updateRejectionDraft(id: string, value: string): void {
    this.rejectionDrafts.update((current) => ({ ...current, [id]: value }));
  }

  protected approve(review: EcommerceReview): void {
    this.reviewsService
      .moderate(review.id, { status: 'approved' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.show('success', 'Reseña aprobada.');
          this.loadReviews();
        },
        error: () => this.toastService.show('error', 'No se pudo aprobar la reseña.'),
      });
  }

  protected reject(review: EcommerceReview): void {
    const rejectionReason = this.rejectionDrafts()[review.id]?.trim();

    this.reviewsService
      .moderate(review.id, {
        status: 'rejected',
        rejectionReason: rejectionReason || 'Rechazada por moderación.',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.show('success', 'Reseña rechazada.');
          this.loadReviews();
        },
        error: () => this.toastService.show('error', 'No se pudo rechazar la reseña.'),
      });
  }

  private loadReviews(): void {
    this.loading.set(true);

    const status = this.statusFilter();
    this.reviewsService
      .list({
        page: 1,
        perPage: 50,
        status: status === 'all' ? undefined : status,
      })
      .pipe(
        catchError(() => {
          this.toastService.show('error', 'No se pudieron cargar las reseñas.');
          return of({ reviews: [], meta: { total: 0, page: 1, perPage: 50, totalPages: 1 } });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.reviews.set(response.reviews);
        this.loading.set(false);
      });
  }
}

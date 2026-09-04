import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { SelectComponent } from '../../../../../shared/ui/select/select.component';
import { TextareaComponent } from '../../../../../shared/ui/textarea/textarea.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { EcommerceNewsletterService } from '../../data-access/ecommerce-newsletter.service';
import {
  NEWSLETTER_STATUS_OPTIONS,
  NewsletterCampaign,
  NewsletterSubscriber,
} from '../../models/ecommerce-newsletter.model';

@Component({
  selector: 'app-ecommerce-newsletter-page',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    TextareaComponent,
  ],
  templateUrl: './ecommerce-newsletter-page.component.html',
})
export class EcommerceNewsletterPageComponent implements OnInit {
  private readonly newsletterService = inject(EcommerceNewsletterService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly subscribers = signal<NewsletterSubscriber[]>([]);
  protected readonly campaigns = signal<NewsletterCampaign[]>([]);
  protected readonly loadingSubscribers = signal(true);
  protected readonly loadingCampaigns = signal(true);
  protected readonly sendingCampaign = signal(false);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly total = signal(0);
  protected readonly activeCount = signal(0);
  protected readonly statusOptions = NEWSLETTER_STATUS_OPTIONS;

  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
  });

  protected readonly campaignForm = new FormGroup({
    subject: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    body: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10)] }),
    previewText: new FormControl('', { nonNullable: true }),
    ctaUrl: new FormControl('', { nonNullable: true }),
    ctaLabel: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadSubscribers();
    this.loadCampaigns();

    this.filterForm.controls.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadSubscribers();
      });

    this.filterForm.controls.status.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadSubscribers();
      });
  }

  protected loadSubscribers(): void {
    this.loadingSubscribers.set(true);

    const status = this.filterForm.controls.status.value;
    this.newsletterService
      .listSubscribers({
        page: this.page(),
        perPage: 20,
        search: this.filterForm.controls.search.value.trim() || undefined,
        status: status ? (status as 'active' | 'unsubscribed') : 'all',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.subscribers.set(response.subscribers);
          this.total.set(response.meta.total);
          this.totalPages.set(response.meta.totalPages);
          this.activeCount.set(response.meta.activeCount);
          this.loadingSubscribers.set(false);
        },
        error: () => {
          this.toastService.show('error', 'No se pudieron cargar los suscriptores.');
          this.loadingSubscribers.set(false);
        },
      });
  }

  protected loadCampaigns(): void {
    this.loadingCampaigns.set(true);

    this.newsletterService
      .listCampaigns()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.campaigns.set(response.campaigns);
          this.loadingCampaigns.set(false);
        },
        error: () => {
          this.toastService.show('error', 'No se pudo cargar el historial de envíos.');
          this.loadingCampaigns.set(false);
        },
      });
  }

  protected clearFilters(): void {
    this.filterForm.reset({ search: '', status: '' });
    this.page.set(1);
    this.loadSubscribers();
  }

  protected goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages()) return;
    this.page.set(nextPage);
    this.loadSubscribers();
  }

  protected unsubscribe(subscriber: NewsletterSubscriber): void {
    this.newsletterService
      .unsubscribeSubscriber(subscriber.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.show('success', 'Suscriptor dado de baja.');
          this.loadSubscribers();
        },
        error: () => this.toastService.show('error', 'No se pudo dar de baja al suscriptor.'),
      });
  }

  protected sendCampaign(): void {
    if (this.campaignForm.invalid) {
      this.campaignForm.markAllAsTouched();
      return;
    }

    this.sendingCampaign.set(true);

    const value = this.campaignForm.getRawValue();
    this.newsletterService
      .sendCampaign({
        subject: value.subject.trim(),
        title: value.title.trim(),
        body: value.body.trim(),
        previewText: value.previewText.trim() || undefined,
        ctaUrl: value.ctaUrl.trim() || undefined,
        ctaLabel: value.ctaLabel.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.toastService.show(
            'success',
            `Boletín enviado a ${response.recipientCount} suscriptor(es).`,
          );
          this.campaignForm.reset({
            subject: '',
            title: '',
            body: '',
            previewText: '',
            ctaUrl: '',
            ctaLabel: '',
          });
          this.sendingCampaign.set(false);
          this.loadCampaigns();
        },
        error: () => {
          this.toastService.show('error', 'No se pudo enviar el boletín.');
          this.sendingCampaign.set(false);
        },
      });
  }

  protected statusLabel(status: string): string {
    return status === 'active' ? 'Activo' : 'Dado de baja';
  }
}

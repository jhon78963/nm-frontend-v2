import {
  Component,
  effect,
  input,
  OnDestroy,
  signal,
  untracked,
} from '@angular/core';
import {
  MetricColorVariant,
  MetricValueFormat,
} from '../../models/dashboard-home.model';

const moneyFormatter = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat('es-PE', {
  maximumFractionDigits: 0,
});

@Component({
  selector: 'app-metric-card',
  template: `
    <article
      class="metric-card"
      [class.metric-card--blue]="colorVariant() === 'blue'"
      [class.metric-card--green]="colorVariant() === 'green'"
      [class.metric-card--red]="colorVariant() === 'red'"
      [class.metric-card--yellow]="colorVariant() === 'yellow'"
      [class.metric-card--purple]="colorVariant() === 'purple'"
      [class.metric-card--gray]="colorVariant() === 'gray'"
      [attr.aria-busy]="isLoading()"
      [attr.aria-label]="label() + ': ' + (isLoading() ? 'cargando' : displayValue())"
    >
      <div class="metric-icon" aria-hidden="true">
        @switch (icon()) {
          @case ('cart') {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25h.008v.008H6v-.008zm12 0h.008v.008H18v-.008z" />
            </svg>
          }
          @case ('cash') {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          @case ('expense') {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          }
          @case ('warning') {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
          @case ('truck') {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          }
          @default {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          }
        }
      </div>

      <div class="metric-body">
        <p class="metric-label">{{ label() }}</p>

        @if (isLoading()) {
          <div class="metric-skeleton" aria-hidden="true"></div>
        } @else {
          @defer {
            <p class="metric-value">{{ displayValue() }}</p>
          } @placeholder {
            <div class="metric-skeleton" aria-hidden="true"></div>
          }
        }
      </div>
    </article>
  `,
  styleUrl: './metric-card.component.scss',
})
export class MetricCardComponent implements OnDestroy {
  readonly label = input.required<string>();
  readonly value = input<number | string>(0);
  readonly icon = input('users');
  readonly colorVariant = input<MetricColorVariant>('gray');
  readonly isLoading = input(false);
  readonly format = input<MetricValueFormat>('integer');

  protected readonly displayValue = signal('0');

  private frameId = 0;
  private readonly countUp = effect(() => {
    const loading = this.isLoading();
    const nextValue = this.value();

    untracked(() => {
      if (loading) {
        this.cancelAnimation();
        return;
      }

      this.playCountUp(nextValue);
    });
  });

  ngOnDestroy(): void {
    this.cancelAnimation();
  }

  private playCountUp(value: number | string): void {
    this.cancelAnimation();

    if (typeof value === 'string') {
      this.displayValue.set(value);
      return;
    }

    const target = Number.isFinite(value) ? value : 0;
    const duration = 700;
    const start = performance.now();

    const tick = (now: number): void => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.displayValue.set(this.formatNumber(target * eased));

      if (progress < 1) {
        this.frameId = requestAnimationFrame(tick);
      } else {
        this.displayValue.set(this.formatNumber(target));
      }
    };

    this.frameId = requestAnimationFrame(tick);
  }

  private formatNumber(value: number): string {
    if (this.format() === 'currency') {
      return `S/ ${moneyFormatter.format(value)}`;
    }

    return integerFormatter.format(Math.round(value));
  }

  private cancelAnimation(): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }
}

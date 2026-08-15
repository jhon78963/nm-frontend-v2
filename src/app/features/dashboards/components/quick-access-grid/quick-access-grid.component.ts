import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/data-access/auth.service';
import { QUICK_ACCESS_ITEMS, QuickAccessItem } from '../../models/dashboard-home.model';

@Component({
  selector: 'app-quick-access-grid',
  imports: [RouterLink],
  template: `
    <section aria-labelledby="quick-access-title">
      <h2 id="quick-access-title" class="qa-title">Accesos rápidos</h2>
      <p class="qa-subtitle">Atajos a las secciones que usas con más frecuencia.</p>

      @if (visibleItems().length === 0) {
        <p class="qa-empty">No hay accesos disponibles para tu rol.</p>
      } @else {
        <ul class="qa-grid">
          @for (item of visibleItems(); track item.route) {
            <li>
              <a
                class="qa-card"
                [class.qa-card--orange]="item.colorClass === 'orange'"
                [class.qa-card--amber]="item.colorClass === 'amber'"
                [class.qa-card--green]="item.colorClass === 'green'"
                [class.qa-card--blue]="item.colorClass === 'blue'"
                [class.qa-card--purple]="item.colorClass === 'purple'"
                [class.qa-card--indigo]="item.colorClass === 'indigo'"
                [class.qa-card--teal]="item.colorClass === 'teal'"
                [routerLink]="item.route"
              >
                <span class="qa-icon" aria-hidden="true">
                  @switch (item.icon) {
                    @case ('pos') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m-7 4h8m-8 4h4M5.25 5.25h13.5A1.5 1.5 0 0120.25 6.75v10.5a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V6.75a1.5 1.5 0 011.5-1.5z" />
                      </svg>
                    }
                    @case ('sale') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75c0-1.728 1.522-3.125 3.4-3.125h12.7c1.878 0 3.4 1.397 3.4 3.125M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM4.5 18.75A8.25 8.25 0 0112 12.75a8.25 8.25 0 017.5 6" />
                      </svg>
                    }
                    @case ('cash') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                    @case ('inventory') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    }
                    @case ('purchase') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                      </svg>
                    }
                    @case ('reports') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                      </svg>
                    }
                    @default {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    }
                  }
                </span>

                <span class="qa-copy">
                  <span class="qa-label">{{ item.label }}</span>
                  <span class="qa-description">{{ item.description }}</span>
                </span>
              </a>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styleUrl: './quick-access-grid.component.scss',
})
export class QuickAccessGridComponent {
  private readonly authService = inject(AuthService);

  protected readonly visibleItems = computed(() =>
    QUICK_ACCESS_ITEMS.filter((item) => this.canSee(item)),
  );

  private canSee(item: QuickAccessItem): boolean {
    return this.authService.hasPermission(item.permission);
  }
}

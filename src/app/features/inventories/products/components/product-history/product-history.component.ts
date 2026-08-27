import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { ProductService } from '../../data-access/product.service';
import {
  ProductHistoryEvent,
  ProductHistoryIcon,
  ProductHistorySeverity,
} from '../../models/product.model';

type SeverityFilter = 'all' | ProductHistorySeverity;

interface HistoryDateGroup {
  date: string;
  events: ProductHistoryEvent[];
}

interface SeverityStyle {
  marker: string;
  badge: string;
  ring: string;
}

@Component({
  selector: 'app-product-history',
  imports: [NgClass, FormsModule, ButtonComponent, InputComponent],
  templateUrl: './product-history.component.html',
})
export class ProductHistoryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly productId = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly events = signal<ProductHistoryEvent[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly severityFilter = signal<SeverityFilter>('all');

  protected readonly severityOptions: { value: SeverityFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'success', label: 'Creaciones / Ventas' },
    { value: 'info', label: 'Actualizaciones' },
    { value: 'warning', label: 'Ajustes / Salidas' },
    { value: 'danger', label: 'Eliminaciones' },
    { value: 'secondary', label: 'Otros' },
  ];

  protected readonly filteredEvents = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const severity = this.severityFilter();

    return this.events().filter((event) => {
      const matchesSeverity = severity === 'all' || event.severity === severity;
      if (!matchesSeverity) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        event.actionTitle,
        event.user,
        event.date,
        event.time,
        ...event.changes.flatMap((change) => [
          change.field,
          String(change.from),
          String(change.to),
        ]),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  });

  protected readonly groupedEvents = computed<HistoryDateGroup[]>(() => {
    const groups = new Map<string, ProductHistoryEvent[]>();

    for (const event of this.filteredEvents()) {
      const existing = groups.get(event.date) ?? [];
      existing.push(event);
      groups.set(event.date, existing);
    }

    return Array.from(groups.entries()).map(([date, dateEvents]) => ({
      date,
      events: dateEvents,
    }));
  });

  protected readonly stats = computed(() => {
    const all = this.events();
    const filtered = this.filteredEvents();

    return {
      total: all.length,
      filtered: filtered.length,
      lastActivity:
        all.length > 0 ? `${all[0].date} · ${all[0].time}` : null,
      uniqueUsers: new Set(all.map((event) => event.user)).size,
    };
  });

  protected readonly hasActiveFilters = computed(
    () => this.searchQuery().trim().length > 0 || this.severityFilter() !== 'all',
  );

  ngOnInit(): void {
    this.route.parent?.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const idRaw = params.get('id');
        if (idRaw) {
          this.productId.set(idRaw);
          this.loadHistory(idRaw);
        }
      });
  }

  protected onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  protected setSeverityFilter(filter: SeverityFilter): void {
    this.severityFilter.set(filter);
  }

  protected clearFilters(): void {
    this.searchQuery.set('');
    this.severityFilter.set('all');
  }

  protected reloadHistory(): void {
    const id = this.productId();
    if (id !== null) {
      this.loadHistory(id);
    }
  }

  protected userInitials(user: string): string {
    const parts = user.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return 'S';
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  protected severityStyle(severity: ProductHistorySeverity): SeverityStyle {
    const styles: Record<ProductHistorySeverity, SeverityStyle> = {
      success: {
        marker: 'bg-emerald-500 text-white shadow-emerald-500/30',
        badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        ring: 'ring-emerald-100',
      },
      info: {
        marker: 'bg-sky-500 text-white shadow-sky-500/30',
        badge: 'bg-sky-50 text-sky-700 ring-sky-600/20',
        ring: 'ring-sky-100',
      },
      danger: {
        marker: 'bg-rose-500 text-white shadow-rose-500/30',
        badge: 'bg-rose-50 text-rose-700 ring-rose-600/20',
        ring: 'ring-rose-100',
      },
      warning: {
        marker: 'bg-amber-500 text-white shadow-amber-500/30',
        badge: 'bg-amber-50 text-amber-800 ring-amber-600/20',
        ring: 'ring-amber-100',
      },
      secondary: {
        marker: 'bg-gray-500 text-white shadow-gray-500/30',
        badge: 'bg-gray-50 text-gray-700 ring-gray-600/20',
        ring: 'ring-gray-100',
      },
    };

    return styles[severity];
  }

  protected severityLabel(severity: ProductHistorySeverity): string {
    const labels: Record<ProductHistorySeverity, string> = {
      success: 'Alta / Venta',
      info: 'Actualización',
      danger: 'Eliminación',
      warning: 'Ajuste',
      secondary: 'Movimiento',
    };

    return labels[severity];
  }

  protected iconPath(icon: ProductHistoryIcon): string {
    const paths: Record<ProductHistoryIcon, string> = {
      create: 'M12 4v16m8-8H4',
      update: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      delete: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
      sale: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
      exchange: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      return: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
      in: 'M12 4v16m8-8H4',
      out: 'M20 12H4',
      default: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    };

    return paths[icon];
  }

  protected formatChangeValue(value: string | number): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    const text = String(value);
    return text === 'ELIMINADO' ? text : text;
  }

  protected isDeletedValue(value: string | number): boolean {
    return String(value).toUpperCase() === 'ELIMINADO';
  }

  private loadHistory(id: string): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.productService
      .getHistory(id)
      .pipe(
        catchError(() => {
          this.loadError.set(true);
          this.toastService.show('error', 'No se pudo cargar el historial del producto.');
          return of([] as ProductHistoryEvent[]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((history) => {
        this.events.set(history);
        this.loading.set(false);
      });
  }
}

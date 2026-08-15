import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  form,
  FormField,
  required,
} from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import {
  TableDataComponent,
  TableDataColumn,
  TableDataPagination,
  DtCellDirective,
  DtExpandCellComponent,
  DtRowDirective,
} from '../../../../../shared/ui/table-data/table-data.component';
import { DateInputComponent } from '../../../../../shared/ui/date-input/date-input.component';
import { SelectComponent, SelectOption } from '../../../../../shared/ui/select/select.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import { KardexService } from '../../data-access/kardex.service';
import { ProductColorsService } from '../../data-access/product-colors.service';
import { ProductSizesService } from '../../data-access/product-sizes.service';
import { ProductService } from '../../data-access/product.service';
import {
  KardexFilterModel,
  KardexMovement,
  KardexReport,
} from '../../models/kardex.model';
import { Product, ProductSize } from '../../models/product.model';

type DatePreset = 'current-month' | 'previous-month' | 'last-30-days';

const PAGE_SIZE = 15;

function buildCurrentMonthRange(): Pick<KardexFilterModel, 'startDate' | 'endDate'> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-product-kardex',
  imports: [
    NgClass,
    FormsModule,
    FormField,
    ButtonComponent,
    InputComponent,
    TableDataComponent,
    DtCellDirective,
    DtExpandCellComponent,
    DtRowDirective,
    DateInputComponent,
    SelectComponent,
  ],
  templateUrl: './product-kardex.component.html',
})
export class ProductKardexComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly productSizesService = inject(ProductSizesService);
  private readonly productColorsService = inject(ProductColorsService);
  private readonly kardexService = inject(KardexService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly productId = signal<number | null>(null);
  protected readonly product = signal<Product | null>(null);
  protected readonly sizes = signal<ProductSize[]>([]);
  protected readonly loadingContext = signal(true);
  protected readonly loadingColors = signal(false);
  protected readonly loadingKardex = signal(false);
  protected readonly loadError = signal(false);
  protected readonly kardexReport = signal<KardexReport | null>(null);

  protected readonly movements = computed(
    () => this.kardexReport()?.movements ?? [],
  );

  protected readonly searchQuery = signal('');
  protected readonly directionFilter = signal<'all' | 'IN' | 'OUT'>('all');
  protected readonly currentPage = signal(1);

  protected readonly colorOptions = signal<SelectOption<number>[]>([]);

  protected readonly filterModel = signal<KardexFilterModel>({
    ...buildCurrentMonthRange(),
    productSizeId: null,
    colorId: null,
  });

  protected readonly filterForm = form(this.filterModel, (schema) => {
    required(schema.startDate, { message: 'La fecha inicial es obligatoria.' });
    required(schema.endDate, { message: 'La fecha final es obligatoria.' });
    required(schema.productSizeId, { message: 'Selecciona una talla.' });
  });

  protected readonly startDateError = computed(() =>
    fieldErrorMessage(this.filterForm.startDate, {
      required: 'La fecha inicial es obligatoria.',
    }),
  );

  protected readonly endDateError = computed(() =>
    fieldErrorMessage(this.filterForm.endDate, {
      required: 'La fecha final es obligatoria.',
    }),
  );

  protected readonly sizeError = computed(() =>
    fieldErrorMessage(this.filterForm.productSizeId, {
      required: 'Selecciona una talla.',
    }),
  );

  protected readonly sizeOptions = computed<SelectOption<number>[]>(() =>
    this.sizes()
      .filter((size) => size.isExists === true && (size.productSizeId ?? 0) > 0)
      .map((size) => ({
        label: size.description,
        value: size.productSizeId as number,
      })),
  );

  protected readonly selectedSizeLabel = computed(() => {
    const sizeId = this.filterModel().productSizeId;
    if (sizeId === null) {
      return null;
    }

    return (
      this.sizeOptions().find((option) => option.value === sizeId)?.label ??
      null
    );
  });

  protected readonly selectedColorLabel = computed(() => {
    const colorId = this.filterModel().colorId;
    if (colorId === null) {
      return 'Maestro (sin color)';
    }

    return (
      this.colorOptions().find((option) => option.value === colorId)?.label ??
      `Color #${colorId}`
    );
  });

  protected readonly filteredMovements = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const direction = this.directionFilter();

    return this.movements().filter((movement) => {
      if (direction !== 'all' && movement.direction !== direction) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        movement.movementTypeLabel,
        movement.reference?.code ?? '',
        movement.reference?.morphShort ?? '',
        this.formatOccurred(movement.occurredAt),
        String(movement.quantity),
        String(movement.balanceAfterMovement),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  });

  protected readonly paginatedMovements = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * PAGE_SIZE;
    return this.filteredMovements().slice(start, start + PAGE_SIZE);
  });

  protected readonly pagination = computed<TableDataPagination | null>(() => {
    const totalItems = this.filteredMovements().length;
    if (totalItems === 0) {
      return null;
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const currentPage = Math.min(this.currentPage(), totalPages);

    return {
      currentPage,
      totalPages,
      pageSize: PAGE_SIZE,
      totalItems,
      pages: this.buildPageNumbers(currentPage, totalPages),
    };
  });

  protected readonly hasReport = computed(() => this.kardexReport() !== null);

  protected readonly summary = computed(() => {
    const report = this.kardexReport();
    const movements = report?.movements ?? [];
    let totalIn = 0;
    let totalOut = 0;

    for (const movement of movements) {
      if (movement.direction === 'IN') {
        totalIn += movement.quantity;
      } else {
        totalOut += movement.quantity;
      }
    }

    const meta = report?.meta;

    return {
      totalIn,
      totalOut,
      netChange: totalIn - totalOut,
      movementCount: meta?.movementsCount ?? movements.length,
      opening: meta?.openingBalanceQuantity ?? null,
      closing: meta?.closingBalanceQuantity ?? null,
      warehouseName: meta?.warehouseName ?? null,
      periodLabel:
        meta?.startDate && meta?.endDate
          ? `${meta.startDate} — ${meta.endDate}`
          : null,
    };
  });

  protected readonly tableEmptyState = computed(() => ({
    title: 'Sin movimientos en este periodo',
    description:
      'El saldo se mantiene sin entradas ni salidas registradas. Prueba ampliando el rango de fechas.',
  }));

  protected readonly hasActiveTableFilters = computed(
    () =>
      this.searchQuery().trim().length > 0 || this.directionFilter() !== 'all',
  );

  protected readonly datePresets: { id: DatePreset; label: string }[] = [
    { id: 'current-month', label: 'Este mes' },
    { id: 'previous-month', label: 'Mes anterior' },
    { id: 'last-30-days', label: 'Últimos 30 días' },
  ];

  protected readonly tableColumns: TableDataColumn<KardexMovement>[] = [
    { key: 'occurredAt', label: 'Fecha' },
    { key: 'movementTypeLabel', label: 'Motivo' },
    { key: 'document', label: 'Documento', mobilePrimary: true },
    { key: 'quantity', label: 'Entrada / Salida', align: 'right' },
    { key: 'balance', label: 'Saldo', align: 'right' },
  ];

  private readonly trackedSizeId = signal<number | null | undefined>(undefined);

  private readonly syncColorsOnSizeChange = effect(() => {
    const sizeId = this.filterModel().productSizeId;
    const previous = this.trackedSizeId();

    if (previous === undefined) {
      this.trackedSizeId.set(sizeId);
      return;
    }

    if (sizeId === previous) {
      return;
    }

    this.trackedSizeId.set(sizeId);
    this.filterModel.update((current) => ({
      ...current,
      colorId: null,
    }));
    this.colorOptions.set([]);

    if (sizeId !== null) {
      this.loadColorsForSelectedSize();
    }
  });

  ngOnInit(): void {
    this.route.parent?.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const idRaw = params.get('id');
        if (idRaw) {
          const id = Number(idRaw);
          this.productId.set(id);
          this.loadProductContext(id);
        }
      });
  }

  protected applyDatePreset(preset: DatePreset): void {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (preset) {
      case 'previous-month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last-30-days':
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        start = new Date(end);
        start.setDate(start.getDate() - 29);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
    }

    this.filterModel.update((current) => ({
      ...current,
      startDate: toIsoDate(start),
      endDate: toIsoDate(end),
    }));
  }

  protected onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.currentPage.set(1);
  }

  protected setDirectionFilter(filter: 'all' | 'IN' | 'OUT'): void {
    this.directionFilter.set(filter);
    this.currentPage.set(1);
  }

  protected clearTableFilters(): void {
    this.searchQuery.set('');
    this.directionFilter.set('all');
    this.currentPage.set(1);
  }

  protected onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  protected loadKardex(): void {
    this.filterForm().markAsTouched();

    if (this.filterForm().invalid()) {
      this.toastService.show('error', 'Completa los filtros obligatorios.');
      return;
    }

    const product = this.product();
    const filters = this.filterModel();
    const warehouseId = product?.warehouseId ?? 0;
    const productSizeId = filters.productSizeId ?? 0;
    const productId = this.productId();

    if (warehouseId < 1) {
      this.toastService.show(
        'error',
        'El producto no tiene almacén asignado; no se puede consultar el kardex.',
      );
      return;
    }

    if (productId === null || productSizeId < 1) {
      this.toastService.show('error', 'Selecciona una talla válida.');
      return;
    }

    const range = this.resolveDateRange(filters.startDate, filters.endDate);
    if (range === null) {
      this.toastService.show(
        'error',
        'Selecciona un rango de fechas válido (inicio y fin).',
      );
      return;
    }

    this.loadingKardex.set(true);
    this.kardexReport.set(null);
    this.currentPage.set(1);
    this.clearTableFilters();

    this.kardexService
      .getReport({
        warehouseId,
        productId,
        productSizeId,
        colorId: filters.colorId,
        startDate: range.start,
        endDate: range.end,
      })
      .pipe(
        catchError((message: string) => {
          this.toastService.show('error', message);
          this.loadError.set(true);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((report) => {
        this.loadingKardex.set(false);

        if (!report) {
          return;
        }

        this.loadError.set(false);
        this.kardexReport.set(report);
      });
  }

  protected formatOccurred(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }

    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected documentCode(row: KardexMovement): string {
    const code = row.reference?.code;
    return code !== undefined && code !== null && code !== '' ? code : '—';
  }

  protected reloadContext(): void {
    const id = this.productId();
    if (id !== null) {
      this.loadProductContext(id);
    }
  }

  protected openInventoryUpdate(): void {
    const id = this.productId();
    const currentProduct = this.product();
    if (id === null || !currentProduct) return;

    this.router.navigate([`/inventories/reconciliations/${id}`], {
      state: {
        productId: id,
        productName: currentProduct.name,
        barcode: currentProduct.barcode,
        gender: currentProduct.gender,
      },
    });
  }

  private loadProductContext(id: number): void {
    this.loadingContext.set(true);
    this.loadError.set(false);
    this.kardexReport.set(null);

    this.productService
      .getOne(id)
      .pipe(
        switchMap((product) => {
          this.product.set(product);
          const typeIds =
            product.sizeTypeId.length > 0 ? product.sizeTypeId : [1];
          return this.productSizesService.getSizes(id, typeIds);
        }),
        catchError(() => {
          this.loadingContext.set(false);
          this.loadError.set(true);
          this.toastService.show(
            'error',
            'No se pudo cargar la información del producto.',
          );
          return of([] as ProductSize[]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((sizes) => {
        const usable = sizes.filter(
          (size) => size.isExists === true && (size.productSizeId ?? 0) > 0,
        );
        this.sizes.set(usable);
        this.loadingContext.set(false);

        if (usable.length === 1 && usable[0].productSizeId) {
          this.filterModel.update((current) => ({
            ...current,
            productSizeId: usable[0].productSizeId ?? null,
          }));
        }
      });
  }

  private loadColorsForSelectedSize(): void {
    const productId = this.productId();
    const productSizeId = this.filterModel().productSizeId;
    const size = this.sizes().find((item) => item.productSizeId === productSizeId);

    if (productId === null || !size || size.id < 1) {
      this.colorOptions.set([]);
      return;
    }

    this.loadingColors.set(true);

    this.productColorsService
      .getColors(productId, size.id)
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((colors) => {
        const options: SelectOption<number>[] = colors
          .filter((color) => color.isExists !== false)
          .map((color) => ({
            label: color.description || `Color #${color.id}`,
            value: color.id,
          }));

        this.colorOptions.set(options);
        this.loadingColors.set(false);
      });
  }

  private resolveDateRange(
    startDate: string,
    endDate: string,
  ): { start: string; end: string } | null {
    if (!startDate || !endDate) {
      return null;
    }

    return startDate <= endDate
      ? { start: startDate, end: endDate }
      : { start: endDate, end: startDate };
  }

  private buildPageNumbers(
    current: number,
    total: number,
  ): (number | '...')[] {
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    const pages: (number | '...')[] = [1];

    if (current > 3) {
      pages.push('...');
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    if (current < total - 2) {
      pages.push('...');
    }

    pages.push(total);
    return pages;
  }
}

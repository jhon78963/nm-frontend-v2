import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  EMPTY,
  filter,
  finalize,
  forkJoin,
  map,
  merge,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { DateInputComponent } from '../../../../../shared/ui/date-input/date-input.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { MoneyInputComponent } from '../../../../../shared/ui/money-input/money-input.component';
import {
  SelectComponent,
  SelectOption,
} from '../../../../../shared/ui/select/select.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { Vendor } from '../../../../directory/vendors/models/vendor.model';
import { ProductLookupService } from '../../../products/data-access/product-lookup.service';
import { ProductService } from '../../../products/data-access/product.service';
import type { Gender, Product, Warehouse } from '../../../products/models/product.model';
import { SizeDetail } from '../../../sizes/models/size.model';
import {
  PurchaseCatalogService,
  PurchaseRegisterDraftService,
  PurchaseRegisterDraftSnapshot,
} from '../../data-access/purchase-catalog.service';
import { PurchaseService } from '../../data-access/purchase.service';
import {
  genTempId,
  ProductColorOption,
  ProductSizeOption,
  PurchaseBulkPayload,
  PurchaseDetail,
  PurchaseDraftColorVariant,
  PurchaseLineFormValue,
  SizeTypeOption,
} from '../../models/purchase.model';
import { buildPurchaseBulkPayload } from '../../utils/purchase-payload.util';

const LEGACY_DRAFT_STORAGE_KEYS = [
  'nm_purchase_register_draft_v2',
  'nm_purchase_register_draft_v1',
] as const;

@Component({
  selector: 'app-purchase-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AlertComponent,
    ButtonComponent,
    DateInputComponent,
    InputComponent,
    MoneyInputComponent,
    SelectComponent,
  ],
  templateUrl: './purchase-register.component.html',
  host: {
    '(window:beforeunload)': 'flushPurchaseDraftOnUnload()',
  },
})
export class PurchaseRegisterComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly catalog = inject(PurchaseCatalogService);
  private readonly purchaseApi = inject(PurchaseService);
  private readonly purchaseDraft = inject(PurchaseRegisterDraftService);
  private readonly productLookup = inject(ProductLookupService);
  private readonly productService = inject(ProductService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly persistDraft$ = new Subject<void>();
  private readonly vendorSearch$ = new Subject<string>();
  private readonly productSearch$ = new Subject<string>();
  private persistDraftEnabled = false;
  private supplierNameLockedForVendorId: string | null = null;

  protected readonly editingPurchaseId = signal<number | null>(null);
  protected readonly isEditMode = signal(false);
  protected readonly loadingPurchase = signal(false);

  protected readonly header = this.fb.group({
    supplierName: ['', Validators.required],
    vendorId: [null as number | null],
    documentNote: [''],
    registeredAt: [this.todayIso(), Validators.required],
    warehouseId: [1, [Validators.required, Validators.min(1)]],
  });

  protected readonly lineDraft = this.fb.group({
    newProductName: ['', [Validators.maxLength(50)]],
    newProductGenderId: [null as number | null],
    selectedSizeTypeId: [null as number | null],
    sizeNewToggle: [false],
    newSizeDescription: ['', [Validators.maxLength(25)]],
    colorNewToggle: [false],
    useColorVariant: [true],
    newColorDescription: ['', [Validators.maxLength(25)]],
    newColorHash: ['', [Validators.maxLength(25)]],
    selectedSizeId: [null as number | null],
    selectedColorId: [null as number | null],
    barcode: ['', [Validators.maxLength(32)]],
    purchasePrice: [0, [Validators.required, Validators.min(0)]],
    salePrice: [0, [Validators.min(0)]],
    minSalePrice: [0, [Validators.min(0)]],
    variantQuantity: [1, [Validators.required, Validators.min(1)]],
    sizeOnlyQuantity: [1, [Validators.required, Validators.min(1)]],
    draftColorQueue: this.fb.array<FormGroup>([]),
  });

  protected readonly lines = this.fb.array<FormGroup>([]);

  protected get draftColorQueue(): FormArray<FormGroup> {
    return this.lineDraft.get('draftColorQueue') as FormArray<FormGroup>;
  }

  protected readonly genders = signal<Gender[]>([]);
  protected readonly warehouses = signal<Warehouse[]>([]);
  protected readonly sizeTypes = signal<SizeTypeOption[]>([]);
  protected readonly catalogSizes = signal<SizeDetail[]>([]);
  protected readonly productPivotBySizeId = signal(new Map<number, ProductSizeOption>());
  protected readonly colorOptions = signal<ProductColorOption[]>([]);
  protected readonly useExistingProduct = signal(true);
  protected readonly selectedProduct = signal<Product | null>(null);
  protected activeNewProductTempId: string | null = null;

  protected readonly submitting = signal(false);
  protected readonly totalEstimated = signal(0);
  protected readonly isEditingLine = signal(false);

  protected readonly selectedPaymentMethod = signal('CASH');
  protected readonly voucherFiles = signal<File[]>([]);

  protected readonly vendorResults = signal<Vendor[]>([]);
  protected readonly vendorDropdownOpen = signal(false);
  protected readonly vendorSearching = signal(false);

  protected readonly productResults = signal<Product[]>([]);
  protected readonly productDropdownOpen = signal(false);
  protected readonly productSearching = signal(false);

  protected readonly colorCatalogSearch = signal('');
  protected readonly filteredColorsForPicker = signal<ProductColorOption[]>([]);
  protected readonly colorDropdownOpen = signal(false);

  protected readonly paymentMethods: SelectOption<string>[] = [
    { label: 'Efectivo', value: 'CASH' },
    { label: 'Yape / Plin', value: 'YAPE' },
    { label: 'Tarjeta', value: 'CARD' },
    { label: 'Transferencia', value: 'TRANSFER' },
  ];

  protected readonly productSourceOptions = [
    { label: 'Producto existente', value: true },
    { label: 'Producto nuevo', value: false },
  ];

  protected readonly genderOptions = signal<SelectOption<number>[]>([]);
  protected readonly warehouseOptions = signal<SelectOption<number>[]>([]);
  protected readonly sizeTypeOptions = signal<SelectOption<number>[]>([]);
  protected readonly catalogSizeOptions = signal<SelectOption<number>[]>([]);

  ngOnInit(): void {
    const purchaseId = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isFinite(purchaseId) && purchaseId > 0) {
      this.editingPurchaseId.set(purchaseId);
      this.isEditMode.set(true);
    }

    this.loadLookups();
    this.wireVendorSearch();
    this.wireProductSearch();

    if (this.isEditMode()) {
      this.loadPurchaseForEdit(this.editingPurchaseId()!);
    } else {
      this.tryRestoreDraftFromMemory();
    }

    this.header
      .get('supplierName')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => {
        const lock = this.supplierNameLockedForVendorId;
        if (lock != null && String(val ?? '').trim() !== lock) {
          this.header.patchValue({ vendorId: null }, { emitEvent: false });
          this.supplierNameLockedForVendorId = null;
        }
      });

    this.lineDraft
      .get('selectedSizeTypeId')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onSizeTypeChosen());

    this.lineDraft
      .get('selectedSizeId')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onCatalogSizeChosen());
  }

  protected onColorSearchFocus(): void {
    this.colorDropdownOpen.set(true);
    this.filterColorPicker(this.colorCatalogSearch());
  }

  protected flushPurchaseDraftOnUnload(): void {
    if (this.persistDraftEnabled) {
      this.persistDraftInMemory();
    }
  }

  protected formatMoney(value: number): string {
    const formatted = new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `S/ ${formatted}`;
  }

  protected onSupplierInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.header.patchValue({ supplierName: value }, { emitEvent: true });
    this.vendorSearch$.next(value);
    this.vendorDropdownOpen.set(value.trim().length >= 2);
  }

  protected onSupplierFocus(): void {
    const q = String(this.header.value.supplierName ?? '').trim();
    if (q.length >= 2 && this.vendorResults().length > 0) {
      this.vendorDropdownOpen.set(true);
    }
  }

  protected closeVendorDropdown(): void {
    this.vendorDropdownOpen.set(false);
  }

  protected selectVendor(vendor: Vendor): void {
    const id = Number(vendor.id);
    const nm = String(vendor.name ?? '').trim();
    if (Number.isFinite(id) && id > 0) {
      this.header.patchValue({ supplierName: nm, vendorId: id });
      this.supplierNameLockedForVendorId = nm;
    } else {
      this.header.patchValue({ supplierName: nm, vendorId: null });
      this.supplierNameLockedForVendorId = null;
    }
    this.vendorDropdownOpen.set(false);
  }

  protected onProductSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.productSearch$.next(value);
    this.productDropdownOpen.set(value.trim().length >= 2);
  }

  protected closeProductDropdown(): void {
    this.productDropdownOpen.set(false);
  }

  protected onProductPicked(product: Product): void {
    this.colorOptions.set([]);
    this.colorCatalogSearch.set('');
    this.filteredColorsForPicker.set([]);
    this.draftColorQueue.clear({ emitEvent: false });
    this.lineDraft.patchValue(
      {
        selectedSizeId: null,
        selectedColorId: null,
        sizeNewToggle: false,
        colorNewToggle: false,
      },
      { emitEvent: false },
    );

    forkJoin({
      sizes: this.catalog.getProductSizes(product.id),
      full: this.productService.getOne(product.id).pipe(catchError(() => of(product))),
    })
      .pipe(
        switchMap(({ sizes, full }) => {
          this.selectedProduct.set(full);
          this.productResults.set([full]);
          const pivot = new Map<number, ProductSizeOption>();
          for (const row of sizes ?? []) {
            pivot.set(row.id, row);
          }
          this.productPivotBySizeId.set(pivot);

          const types = full.sizeTypeId ?? [];
          const firstType =
            Array.isArray(types) && types.length > 0 ? Number(types[0]) : null;

          if (firstType != null && Number.isFinite(firstType) && firstType > 0) {
            this.lineDraft.patchValue(
              { selectedSizeTypeId: firstType },
              { emitEvent: false },
            );
            return this.catalog
              .getSizesBySizeType(firstType)
              .pipe(catchError(() => of([] as SizeDetail[])));
          }

          this.lineDraft.patchValue({ selectedSizeTypeId: null }, { emitEvent: false });
          this.catalogSizes.set([]);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => {
          if (rows != null) {
            this.catalogSizes.set(rows ?? []);
            this.syncCatalogSizeOptions();
          }
          this.productDropdownOpen.set(false);
          this.refreshColorsAfterSizeChange();
          this.requestPersistDraft();
        },
        error: () => {
          this.selectedProduct.set(product);
          this.productResults.set([product]);
          this.productPivotBySizeId.set(new Map());
          this.requestPersistDraft();
        },
      });
  }

  protected clearProductSelection(): void {
    this.selectedProduct.set(null);
    this.productResults.set([]);
    this.productPivotBySizeId.set(new Map());
    this.colorOptions.set([]);
    this.colorCatalogSearch.set('');
    this.filteredColorsForPicker.set([]);
    this.draftColorQueue.clear({ emitEvent: false });
    this.lineDraft.patchValue(
      { selectedSizeId: null, selectedColorId: null },
      { emitEvent: false },
    );
    this.refreshColorsAfterSizeChange();
    this.requestPersistDraft();
  }

  protected clearDraftVariants(): void {
    this.draftColorQueue.clear({ emitEvent: false });
    this.colorCatalogSearch.set('');
    this.filteredColorsForPicker.set([]);
    this.requestPersistDraft();
  }

  protected applyPricesFromSelectedSize(): void {
    const draft = this.lineDraft.getRawValue();
    if (draft.sizeNewToggle || !draft.selectedSizeId) {
      return;
    }
    const merged = this.getMergedSizeOption(draft.selectedSizeId);
    if (!merged) {
      return;
    }
    this.lineDraft.patchValue(
      {
        barcode: merged.barcode ?? '',
        purchasePrice: merged.purchasePrice ?? 0,
        salePrice: merged.salePrice ?? 0,
        minSalePrice: merged.minSalePrice ?? 0,
      },
      { emitEvent: false },
    );
  }

  protected catalogSizeLabel(sizeId: number): string {
    const size = this.catalogSizes().find((s) => s.id === sizeId);
    const base = (size?.description ?? '').trim() || `Talla #${sizeId}`;
    if (!this.useExistingProduct() || !this.selectedProduct()?.id) {
      return base;
    }
    const merged = this.getMergedSizeOption(sizeId);
    const parts: string[] = [base];
    if (merged?.stock != null && Number.isFinite(Number(merged.stock))) {
      parts.push(`stock ${merged.stock}`);
    }
    if (merged?.productSizeId != null && merged.productSizeId > 0) {
      parts.push('en producto');
    } else {
      parts.push('sin fila en producto aún');
    }
    return parts.join(' · ');
  }

  protected canPickExistingColors(): boolean {
    const draft = this.lineDraft.getRawValue();
    if (draft.sizeNewToggle || !draft.selectedSizeId) {
      return false;
    }
    if (this.useExistingProduct()) {
      return !!this.selectedProduct()?.id;
    }
    return true;
  }

  protected showColorCatalogPick(): boolean {
    const draft = this.lineDraft.getRawValue();
    return !!(
      draft.useColorVariant &&
      this.canPickExistingColors() &&
      !draft.colorNewToggle
    );
  }

  protected showNewColorFields(): boolean {
    const draft = this.lineDraft.getRawValue();
    if (!draft.useColorVariant) {
      return false;
    }
    return !this.canPickExistingColors() || !!draft.colorNewToggle;
  }

  protected onSizeTypeChosen(): void {
    this.clearDraftVariants();
    const typeId = this.lineDraft.get('selectedSizeTypeId')?.value;
    this.lineDraft.patchValue(
      { selectedSizeId: null, selectedColorId: null },
      { emitEvent: false },
    );
    this.colorOptions.set([]);
    if (!typeId) {
      this.catalogSizes.set([]);
      this.syncCatalogSizeOptions();
      return;
    }
    this.catalog
      .getSizesBySizeType(Number(typeId))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.catalogSizes.set(rows ?? []);
          this.syncCatalogSizeOptions();
        },
      });
  }

  protected onCatalogSizeChosen(): void {
    const sizeId = this.lineDraft.get('selectedSizeId')?.value;
    if (sizeId == null) {
      this.refreshColorsAfterSizeChange();
      return;
    }
    const draft = this.lineDraft.getRawValue();
    if (!draft.sizeNewToggle) {
      const merged = this.getMergedSizeOption(Number(sizeId));
      const hasRowInProduct =
        merged != null && merged.productSizeId != null && merged.productSizeId > 0;
      if (hasRowInProduct) {
        this.applyPricesFromSelectedSize();
      }
    }
    this.refreshColorsAfterSizeChange();
  }

  protected onSizeNewToggleChange(): void {
    this.clearDraftVariants();
    const on = !!this.lineDraft.get('sizeNewToggle')?.value;
    if (on) {
      this.lineDraft.patchValue(
        {
          selectedSizeId: null,
          colorNewToggle: true,
          selectedColorId: null,
        },
        { emitEvent: false },
      );
      this.colorOptions.set([]);
    } else {
      this.lineDraft.patchValue(
        {
          colorNewToggle: false,
          newColorDescription: '',
          newColorHash: '',
        },
        { emitEvent: false },
      );
      this.refreshColorsAfterSizeChange();
    }
  }

  protected toggleProductSource(isExisting: boolean): void {
    this.useExistingProduct.set(isExisting);
    this.activeNewProductTempId = null;
    this.clearDraftVariants();
    if (isExisting) {
      this.lineDraft.patchValue({
        newProductName: '',
        newProductGenderId: null,
        sizeNewToggle: false,
      });
    } else {
      this.clearProductSelection();
      this.catalogSizes.set([]);
      this.syncCatalogSizeOptions();
      this.lineDraft.patchValue(
        {
          sizeNewToggle: false,
          selectedSizeTypeId: null,
          selectedSizeId: null,
          selectedColorId: null,
          useColorVariant: true,
        },
        { emitEvent: false },
      );
    }
  }

  protected removeDraftVariant(index: number): void {
    this.draftColorQueue.removeAt(index);
    this.requestPersistDraft();
  }

  protected draftColorsQuantitySum(): number {
    let sum = 0;
    for (const group of this.draftColorQueue.controls) {
      sum += Number(group.get('quantity')?.value) || 0;
    }
    return sum;
  }

  protected onColorSearchInput(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    this.colorCatalogSearch.set(q);
    this.filterColorPicker(q);
    this.colorDropdownOpen.set(true);
  }

  protected onColorSearchKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }
    const q = this.colorCatalogSearch().trim().toLowerCase();
    if (!q) {
      return;
    }
    const opts = this.colorOptions();
    const exact = opts.find((c) => c.description.trim().toLowerCase() === q);
    const single =
      this.filteredColorsForPicker().length === 1
        ? this.filteredColorsForPicker()[0]
        : null;
    const pick = exact ?? single;
    if (!pick?.id) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.addCatalogColorToQueue(pick, 1);
    this.resetColorCatalogSearch();
  }

  protected selectCatalogColor(opt: ProductColorOption): void {
    this.addCatalogColorToQueue(opt, 1);
    this.resetColorCatalogSearch();
  }

  protected addDraftVariant(): void {
    if (this.useExistingProduct() && !this.selectedProduct()?.id) {
      this.toast.show(
        'error',
        'Primero elegí un producto existente antes de agregar variantes de color.',
      );
      return;
    }
    const draft = this.lineDraft.getRawValue();
    const qty = Number(draft.variantQuantity) || 0;
    if (qty < 1) {
      this.toast.show('error', 'La cantidad de la variante debe ser al menos 1.');
      return;
    }
    const forceNewColor = !!draft.colorNewToggle || !this.canPickExistingColors();

    let colorMode: 'existing' | 'new';
    let colorId: number | null;
    let colorTempId: string | null;
    let colorHash: string | null;
    let displayLabel: string;

    if (forceNewColor) {
      if (!draft.newColorDescription?.trim()) {
        this.toast.show(
          'error',
          'Escribí el nombre del color (solo si no existe en el catálogo y lo estás creando ahora).',
        );
        return;
      }
      colorMode = 'new';
      colorId = null;
      colorTempId = genTempId('c');
      colorHash = draft.newColorHash?.trim() || null;
      displayLabel = draft.newColorDescription.trim();
    } else {
      if (draft.selectedColorId == null) {
        this.toast.show(
          'error',
          'Elegí un color del catálogo o usá el buscador arriba. Si no está en la lista, activá "Color nuevo en el sistema" y cargá nombre y hex.',
        );
        return;
      }
      const match = this.colorOptions().find((c) => c.id === draft.selectedColorId);
      if (!match) {
        this.toast.show('error', 'Color no válido.');
        return;
      }
      const existingIdx = this.findDraftColorQueueIndexByExistingColorId(match.id);
      if (existingIdx >= 0) {
        this.incrementDraftColorQuantity(existingIdx, qty);
        this.lineDraft.patchValue({ variantQuantity: 1 });
        this.requestPersistDraft();
        return;
      }
      colorMode = 'existing';
      colorId = match.id;
      colorTempId = null;
      colorHash = null;
      displayLabel = match.description;
    }

    const entry: PurchaseDraftColorVariant = {
      id: genTempId('dv'),
      displayLabel,
      colorMode,
      colorId,
      colorTempId,
      colorHash,
      quantity: qty,
    };
    this.draftColorQueue.push(
      this.createDraftColorQueueGroup(entry as unknown as Record<string, unknown>),
    );
    this.lineDraft.patchValue({ variantQuantity: 1 });
    this.toast.show('success', 'Variante añadida a la lista.');
  }

  protected addLine(): void {
    const draft = this.lineDraft.getRawValue();
    const useExisting = this.useExistingProduct();
    const product = this.selectedProduct();

    if (useExisting && !product) {
      this.toast.show(
        'error',
        'Selecciona un producto o cambia a "Producto nuevo".',
      );
      return;
    }
    if (!draft.selectedSizeTypeId) {
      this.toast.show('error', 'Selecciona el tipo de talla.');
      return;
    }
    if (!useExisting) {
      if (!draft.newProductName?.trim()) {
        this.toast.show('error', 'Indica el nombre del producto nuevo.');
        return;
      }
      if (!draft.newProductGenderId) {
        this.toast.show('error', 'Selecciona género para el producto nuevo.');
        return;
      }
    }

    let productMode: 'existing' | 'new';
    let productId: number | null;
    let productTempId: string | null;
    let productName: string;
    let productGenderId: number | null;

    if (useExisting) {
      productMode = 'existing';
      productId = product!.id;
      productTempId = null;
      productName = product!.name;
      productGenderId = null;
    } else {
      productMode = 'new';
      productId = null;
      productTempId = this.resolveNewProductTempId(
        (draft.newProductName ?? '').trim(),
        draft.newProductGenderId,
      );
      this.activeNewProductTempId = productTempId;
      productName = (draft.newProductName ?? '').trim();
      productGenderId = draft.newProductGenderId;
    }

    let sizeMode: 'existing' | 'new';
    let sizeId: number | null;
    let sizeTempId: string | null;
    let sizeLabel: string;
    let sizeTypeId: number | null;
    let productSizeId: number | null;
    const sizeTypeIdForLine = Number(draft.selectedSizeTypeId);

    if (draft.sizeNewToggle) {
      if (!draft.newSizeDescription?.trim()) {
        this.toast.show('error', 'Escribe la descripción de la talla nueva.');
        return;
      }
      sizeMode = 'new';
      sizeId = null;
      sizeTempId = genTempId('s');
      sizeLabel = draft.newSizeDescription.trim();
      sizeTypeId = sizeTypeIdForLine;
      productSizeId = null;
    } else {
      if (!draft.selectedSizeId) {
        this.toast.show(
          'error',
          'Selecciona una talla del catálogo o usa "Talla no figura en el catálogo".',
        );
        return;
      }
      const merged = this.getMergedSizeOption(draft.selectedSizeId);
      if (!merged) {
        this.toast.show('error', 'Talla no válida para el tipo seleccionado.');
        return;
      }
      sizeMode = 'existing';
      sizeId = merged.id;
      sizeTempId = null;
      sizeLabel = merged.description ?? '';
      sizeTypeId = sizeTypeIdForLine;
      productSizeId = merged.productSizeId ?? null;
    }

    const variants = this.draftQueueRawRows();
    let colorRows: {
      displayLabel: string;
      colorId: number | null;
      colorTempId: string | null;
      colorHash: string | null;
      quantity: number;
    }[] = [];

    if (draft.useColorVariant) {
      if (variants.length === 0) {
        this.toast.show(
          'error',
          'Añade al menos una variante de color con "Añadir variante".',
        );
        return;
      }
      colorRows = variants.map((v) => ({
        displayLabel: v.displayLabel,
        colorId: v.colorId,
        colorTempId: v.colorTempId,
        colorHash: v.colorHash,
        quantity: v.quantity,
      }));
    } else {
      const sq = Number(draft.sizeOnlyQuantity) || 0;
      if (sq < 1) {
        this.toast.show('error', 'Indica la cantidad a ingresar a nivel talla.');
        return;
      }
      colorRows = [
        {
          displayLabel: '— (solo talla)',
          colorId: null,
          colorTempId: null,
          colorHash: null,
          quantity: sq,
        },
      ];
    }

    const pPrice = Number(draft.purchasePrice) || 0;
    const sumQty = colorRows.reduce((acc, c) => acc + (Number(c.quantity) || 0), 0);
    const subtotal = Math.round(sumQty * pPrice * 100) / 100;

    const colorsArr = this.fb.array<FormGroup>([]);
    for (const color of colorRows) {
      colorsArr.push(
        this.fb.group({
          _rowKey: [genTempId('kc')],
          displayLabel: [color.displayLabel],
          colorId: [color.colorId],
          colorTempId: [color.colorTempId],
          colorHash: [color.colorHash],
          quantity: [color.quantity, [Validators.required, Validators.min(1)]],
        }),
      );
    }

    const lineGroup = this.fb.group({
      lineId: [genTempId('l')],
      productName: [productName],
      sizeLabel: [sizeLabel],
      productMode: [productMode],
      productId: [productId],
      productTempId: [productTempId],
      productGenderId: [productGenderId],
      sizeMode: [sizeMode],
      sizeId: [sizeId],
      sizeTempId: [sizeTempId],
      sizeTypeId: [sizeTypeId],
      productSizeId: [productSizeId],
      barcode: [draft.barcode?.trim() || null],
      purchasePrice: [pPrice, [Validators.required, Validators.min(0)]],
      salePrice: [Number(draft.salePrice) || 0, [Validators.min(0)]],
      minSalePrice: [Number(draft.minSalePrice) || 0, [Validators.min(0)]],
      colors: colorsArr,
      subtotal: [{ value: subtotal, disabled: true }],
    });

    this.bindLineTotals(lineGroup);
    this.lines.push(lineGroup);
    this.recalcGrandTotal();
    this.resetConstructorAfterLineAdded();
    this.isEditingLine.set(false);
    this.toast.show('success', 'Fila agregada: talla con sus variantes de color.');
  }

  protected lineColors(line: AbstractControl): FormArray<FormGroup> {
    return line.get('colors') as FormArray<FormGroup>;
  }

  protected trackLineColorKey(control: AbstractControl): string {
    return String((control as FormGroup).get('_rowKey')?.value ?? '');
  }

  protected colorsSummaryText(line: AbstractControl): string {
    const arr = this.lineColors(line);
    const parts: string[] = [];
    for (const group of arr.controls) {
      const label = group.get('displayLabel')?.value ?? '';
      const qty = group.get('quantity')?.value ?? 0;
      parts.push(`${label}: ${qty} ud`);
    }
    return parts.join(', ') || '—';
  }

  protected removeLine(index: number): void {
    this.lines.removeAt(index);
    this.recalcGrandTotal();
    this.requestPersistDraft();
  }

  protected editLine(index: number): void {
    const row = this.lines.at(index) as FormGroup | undefined;
    if (!row) {
      return;
    }
    const raw = row.getRawValue() as Record<string, unknown>;
    this.lines.removeAt(index);
    this.recalcGrandTotal();
    this.isEditingLine.set(true);

    this.clearDraftVariants();
    this.lineDraft.patchValue(
      {
        selectedColorId: null,
        colorNewToggle: false,
        newColorDescription: '',
        newColorHash: '',
        variantQuantity: 1,
        barcode: (raw['barcode'] as string) ?? '',
        purchasePrice: Number(raw['purchasePrice']) || 0,
        salePrice: Number(raw['salePrice']) || 0,
        minSalePrice: Number(raw['minSalePrice']) || 0,
      },
      { emitEvent: false },
    );

    const colorsRaw = (raw['colors'] as Record<string, unknown>[]) ?? [];
    const isSoloTalla =
      colorsRaw.length === 1 &&
      String(colorsRaw[0]?.['displayLabel'] ?? '').includes('solo talla');

    if (isSoloTalla) {
      this.lineDraft.patchValue({
        useColorVariant: false,
        sizeOnlyQuantity: Number(colorsRaw[0]?.['quantity']) || 1,
      });
    } else {
      this.lineDraft.patchValue({ useColorVariant: true });
      const draftVariants: PurchaseDraftColorVariant[] = colorsRaw.map((c) => ({
        id: genTempId('dv'),
        displayLabel: String(c['displayLabel'] ?? ''),
        colorMode: c['colorId'] != null ? 'existing' : 'new',
        colorId: (c['colorId'] as number | null) ?? null,
        colorTempId: (c['colorTempId'] as string | null) ?? null,
        colorHash: (c['colorHash'] as string | null) ?? null,
        quantity: Number(c['quantity']) || 0,
      }));
      this.draftColorQueue.clear({ emitEvent: false });
      for (const variant of draftVariants) {
        this.draftColorQueue.push(
          this.createDraftColorQueueGroup(variant as unknown as Record<string, unknown>),
        );
      }
      const hasExisting = draftVariants.some((v) => v.colorId != null);
      this.lineDraft.patchValue({ colorNewToggle: !hasExisting });
    }

    const sizeMode = raw['sizeMode'] as string;
    this.lineDraft.patchValue(
      {
        sizeNewToggle: sizeMode === 'new',
        newSizeDescription: sizeMode === 'new' ? String(raw['sizeLabel'] ?? '') : '',
      },
      { emitEvent: false },
    );

    this.finishEditLineProductHydration(raw);
    this.toast.show(
      'success',
      'Línea cargada para edición. Corregí y pulsá de nuevo "Agregar a la tabla".',
    );
  }

  protected removeLineColorVariant(lineIndex: number, colorIndex: number): void {
    const line = this.lines.at(lineIndex);
    const arr = this.lineColors(line);
    if (arr.length <= 1) {
      this.toast.show('error', 'La fila debe tener al menos una variante de color.');
      return;
    }
    arr.removeAt(colorIndex);
    this.recalcLineSubtotal(line as FormGroup);
    this.recalcGrandTotal();
    this.requestPersistDraft();
  }

  protected registerPurchase(): void {
    if (this.isEditMode()) {
      this.toast.show(
        'error',
        'En modo edición: modifica las líneas y usa "Volver al detalle" para ver los cambios aplicados.',
      );
      return;
    }

    if (this.header.invalid) {
      this.header.markAllAsTouched();
      this.toast.show('error', 'Completa la cabecera (proveedor y fecha).');
      return;
    }
    if (this.lines.length === 0) {
      this.toast.show('error', 'Agrega al menos una línea al detalle.');
      return;
    }

    const nameTrim = String(this.header.value.supplierName ?? '').trim();
    const existingVid = this.header.value.vendorId;
    const ensureVendor$ =
      existingVid != null && Number(existingVid) > 0
        ? of(void 0)
        : this.catalog.resolveOrCreateVendor(nameTrim).pipe(
            tap((v) => {
              const nm = String(v.name ?? nameTrim).trim();
              this.header.patchValue(
                { vendorId: v.id, supplierName: nm },
                { emitEvent: false },
              );
              this.supplierNameLockedForVendorId = nm;
            }),
            map(() => void 0),
          );

    this.submitting.set(true);
    ensureVendor$
      .pipe(
        switchMap(() => {
          const built = this.buildBulkPayload();
          if (!built) {
            this.toast.show('error', 'Agrega líneas al detalle antes de registrar.');
            return EMPTY;
          }
          return this.purchaseApi.registerBulk(
            built.payload,
            this.selectedPaymentMethod(),
            this.voucherFiles().length ? this.voucherFiles() : null,
          );
        }),
        catchError((err: unknown) => {
          const msg =
            typeof err === 'string'
              ? err
              : 'No se pudo crear el proveedor o registrar la compra.';
          this.toast.show('error', msg);
          return EMPTY;
        }),
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.toast.show(
            'success',
            'Compra registrada con éxito. El monto se ha descontado de la Cuenta Acumulada.',
          );
          this.resetAll();
          const pid = res?.purchaseId;
          if (pid != null && Number(pid) > 0) {
            void this.router.navigate(['/inventories/purchase', pid]);
          }
        },
      });
  }

  protected goBackToDetail(): void {
    const pid = this.editingPurchaseId();
    if (pid != null && pid > 0) {
      void this.router.navigate(['/inventories/purchase', pid]);
    } else {
      void this.router.navigate(['/inventories/purchase']);
    }
  }

  protected resetAll(): void {
    this.persistDraftEnabled = false;
    this.purchaseDraft.clear();
    this.lines.clear({ emitEvent: false });
    this.isEditingLine.set(false);
    this.totalEstimated.set(0);
    this.catalogSizes.set([]);
    this.syncCatalogSizeOptions();
    this.productPivotBySizeId.set(new Map());
    this.supplierNameLockedForVendorId = null;
    this.header.patchValue(
      {
        supplierName: '',
        vendorId: null,
        documentNote: '',
        registeredAt: this.todayIso(),
        warehouseId: 1,
      },
      { emitEvent: false },
    );
    this.lineDraft.reset(
      {
        newProductName: '',
        newProductGenderId: null,
        selectedSizeTypeId: null,
        sizeNewToggle: false,
        newSizeDescription: '',
        colorNewToggle: false,
        useColorVariant: true,
        newColorDescription: '',
        newColorHash: '',
        selectedSizeId: null,
        selectedColorId: null,
        barcode: '',
        purchasePrice: 0,
        salePrice: 0,
        minSalePrice: 0,
        variantQuantity: 1,
        sizeOnlyQuantity: 1,
      },
      { emitEvent: false },
    );
    this.draftColorQueue.clear({ emitEvent: false });
    this.clearProductSelection();
    this.clearDraftVariants();
    this.useExistingProduct.set(true);
    this.activeNewProductTempId = null;
    this.selectedPaymentMethod.set('CASH');
    this.voucherFiles.set([]);
    this.persistDraftEnabled = true;
  }

  protected onVoucherSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.voucherFiles.set(input.files ? Array.from(input.files) : []);
  }

  protected onUseColorVariantChange(): void {
    if (!this.lineDraft.get('useColorVariant')?.value) {
      this.clearDraftVariants();
    }
  }

  protected onPaymentMethodChange(value: string | null): void {
    if (value) {
      this.selectedPaymentMethod.set(value);
      this.requestPersistDraft();
    }
  }

  private loadLookups(): void {
    this.productLookup
      .getGenders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.genders.set(rows);
          this.genderOptions.set(
            rows.map((g) => ({ label: g.description, value: g.id })),
          );
        },
      });

    this.productLookup
      .getWarehouses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.warehouses.set(rows ?? []);
          this.warehouseOptions.set(
            (rows ?? []).map((w) => ({ label: w.name, value: w.id })),
          );
        },
      });

    this.catalog
      .getSizeTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.sizeTypes.set(rows ?? []);
          this.sizeTypeOptions.set(
            (rows ?? []).map((st) => ({ label: st.description, value: st.id })),
          );
        },
      });
  }

  private wireVendorSearch(): void {
    this.vendorSearch$
      .pipe(
        debounceTime(300),
        tap(() => this.vendorSearching.set(true)),
        switchMap((q) => {
          const trimmed = q.trim();
          if (trimmed.length < 2) {
            return of([] as Vendor[]);
          }
          return this.catalog.searchVendors(trimmed, 20).pipe(
            catchError(() => of([] as Vendor[])),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => {
          this.vendorResults.set(rows);
          this.vendorSearching.set(false);
        },
        error: () => this.vendorSearching.set(false),
      });
  }

  private wireProductSearch(): void {
    this.productSearch$
      .pipe(
        debounceTime(300),
        tap(() => this.productSearching.set(true)),
        switchMap((q) => {
          const trimmed = q.trim();
          if (trimmed.length < 2) {
            return of([] as Product[]);
          }
          return this.catalog.searchProducts(trimmed, 20, 1).pipe(
            catchError(() => of([] as Product[])),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => {
          this.productResults.set(rows);
          this.productSearching.set(false);
        },
        error: () => this.productSearching.set(false),
      });
  }

  private getMergedSizeOption(sizeId: number | null): ProductSizeOption | null {
    if (sizeId == null) {
      return null;
    }
    const cat = this.catalogSizes().find((s) => s.id === sizeId);
    const pivot = this.productPivotBySizeId().get(sizeId);
    if (!cat && !pivot) {
      return null;
    }
    return {
      id: sizeId,
      description: cat?.description ?? pivot?.description ?? '',
      productSizeId: pivot?.productSizeId,
      stock: pivot?.stock,
      barcode: pivot?.barcode,
      purchasePrice: pivot?.purchasePrice,
      salePrice: pivot?.salePrice,
      minSalePrice: pivot?.minSalePrice,
    };
  }

  private refreshColorsAfterSizeChange(): void {
    const draft = this.lineDraft.getRawValue();
    const productId = this.selectedProduct()?.id;
    const useExisting = this.useExistingProduct();

    if (draft.sizeNewToggle || !draft.selectedSizeId) {
      this.colorOptions.set([]);
      this.lineDraft.patchValue({ selectedColorId: null }, { emitEvent: false });
      return;
    }

    if (useExisting && productId) {
      this.catalog
        .getColors(productId, draft.selectedSizeId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (rows) => {
            this.colorOptions.set(rows ?? []);
            this.lineDraft.patchValue({ selectedColorId: null }, { emitEvent: false });
          },
        });
      return;
    }

    if (!useExisting) {
      this.catalog
        .getColorsCatalogAll()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (rows) => {
            this.colorOptions.set(rows ?? []);
            this.lineDraft.patchValue({ selectedColorId: null }, { emitEvent: false });
          },
        });
      return;
    }

    this.colorOptions.set([]);
    this.lineDraft.patchValue({ selectedColorId: null }, { emitEvent: false });
  }

  protected filterColorPicker(query: string): void {
    const q = query.trim().toLowerCase();
    const opts = this.colorOptions();
    if (!q) {
      this.filteredColorsForPicker.set(opts.slice(0, 50));
      return;
    }
    this.filteredColorsForPicker.set(
      opts.filter((c) => c.description.toLowerCase().includes(q)).slice(0, 60),
    );
  }

  private resetColorCatalogSearch(): void {
    this.colorCatalogSearch.set('');
    this.filteredColorsForPicker.set([]);
    this.colorDropdownOpen.set(false);
  }

  private findDraftColorQueueIndexByExistingColorId(colorId: number): number {
    return this.draftColorQueue.controls.findIndex((control) => {
      const value = (control as FormGroup).getRawValue() as Record<string, unknown>;
      return value['colorMode'] === 'existing' && Number(value['colorId']) === colorId;
    });
  }

  private incrementDraftColorQuantity(index: number, delta: number): void {
    const row = this.draftColorQueue.at(index) as FormGroup;
    const current = Number(row.get('quantity')?.value) || 0;
    row
      .get('quantity')
      ?.patchValue(Math.max(1, current + delta), { emitEvent: true });
    this.requestPersistDraft();
  }

  private addCatalogColorToQueue(opt: ProductColorOption, qty: number): void {
    const safeQty = !Number.isFinite(qty) || qty < 1 ? 1 : Math.floor(qty);
    const existingIdx = this.findDraftColorQueueIndexByExistingColorId(opt.id);
    if (existingIdx >= 0) {
      this.incrementDraftColorQuantity(existingIdx, safeQty);
      return;
    }
    const entry: PurchaseDraftColorVariant = {
      id: genTempId('dv'),
      displayLabel: opt.description,
      colorMode: 'existing',
      colorId: opt.id,
      colorTempId: null,
      colorHash: null,
      quantity: safeQty,
    };
    this.draftColorQueue.push(
      this.createDraftColorQueueGroup(entry as unknown as Record<string, unknown>),
    );
    this.requestPersistDraft();
  }

  private normalizeNewProductKey(name: string, genderId: number | null): string {
    return `${String(name).trim().toLowerCase()}|${genderId ?? ''}`;
  }

  private resolveNewProductTempId(name: string, genderId: number | null): string {
    const key = this.normalizeNewProductKey(name, genderId);
    for (const control of this.lines.controls) {
      const raw = control.getRawValue() as Record<string, unknown>;
      if (raw['productMode'] !== 'new') {
        continue;
      }
      const rowKey = this.normalizeNewProductKey(
        String(raw['productName'] ?? ''),
        raw['productGenderId'] != null ? Number(raw['productGenderId']) : null,
      );
      if (rowKey === key && raw['productTempId']) {
        return String(raw['productTempId']);
      }
    }
    return genTempId('p');
  }

  private resetConstructorAfterLineAdded(): void {
    this.draftColorQueue.clear({ emitEvent: false });
    this.lineDraft.patchValue(
      {
        selectedSizeId: null,
        selectedColorId: null,
        sizeNewToggle: false,
        newSizeDescription: '',
        colorNewToggle: false,
        newColorDescription: '',
        newColorHash: '',
        barcode: '',
        purchasePrice: 0,
        salePrice: 0,
        minSalePrice: 0,
        variantQuantity: 1,
        sizeOnlyQuantity: 1,
      },
      { emitEvent: false },
    );
    this.refreshColorsAfterSizeChange();
    this.requestPersistDraft();
  }

  private bindLineTotals(lineGroup: FormGroup): void {
    const purchasePriceControl = lineGroup.get('purchasePrice')!;
    const colors = lineGroup.get('colors') as FormArray<FormGroup>;
    const onChange = (): void => {
      this.recalcLineSubtotal(lineGroup);
      this.recalcGrandTotal();
      this.requestPersistDraft();
    };
    merge(purchasePriceControl.valueChanges, colors.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(onChange);
    colors.controls.forEach((colorGroup) => {
      colorGroup
        .get('quantity')!
        .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(onChange);
    });
    onChange();
  }

  private recalcLineSubtotal(lineGroup: FormGroup): void {
    const price = Number(lineGroup.get('purchasePrice')?.value) || 0;
    const colors = lineGroup.get('colors') as FormArray<FormGroup>;
    let sum = 0;
    for (const colorGroup of colors.controls) {
      sum += Number(colorGroup.get('quantity')?.value) || 0;
    }
    lineGroup
      .get('subtotal')!
      .patchValue(Math.round(sum * price * 100) / 100, { emitEvent: false });
  }

  private recalcGrandTotal(): void {
    let total = 0;
    for (const group of this.lines.controls) {
      total += Number(group.get('subtotal')?.value) || 0;
    }
    this.totalEstimated.set(Math.round(total * 100) / 100);
  }

  private loadPurchaseForEdit(purchaseId: number): void {
    this.loadingPurchase.set(true);
    this.purchaseApi
      .getOne(purchaseId)
      .pipe(
        finalize(() => this.loadingPurchase.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (purchase) => {
          if (purchase.status !== 'ACTIVE') {
            this.toast.show(
              'error',
              `Solo se pueden editar compras activas. Esta compra está: ${purchase.status}`,
            );
            void this.router.navigate(['/inventories/purchase', purchaseId]);
            return;
          }
          this.hydrateFormFromPurchase(purchase);
        },
        error: () => {
          this.toast.show('error', 'No se pudo cargar la compra.');
          void this.router.navigate(['/inventories/purchase']);
        },
      });
  }

  private hydrateFormFromPurchase(purchase: PurchaseDetail): void {
    this.persistDraftEnabled = false;

    this.header.patchValue(
      {
        supplierName: purchase.supplierName ?? '',
        vendorId: purchase.vendorId ?? null,
        documentNote: purchase.documentNote ?? '',
        registeredAt: purchase.registeredAt
          ? purchase.registeredAt.slice(0, 10)
          : this.todayIso(),
        warehouseId: purchase.warehouseId || 1,
      },
      { emitEvent: false },
    );

    this.supplierNameLockedForVendorId =
      purchase.vendorId != null && purchase.vendorId > 0
        ? String(purchase.supplierName ?? '').trim()
        : null;

    this.lines.clear({ emitEvent: false });

    for (const line of purchase.lines ?? []) {
      this.addLineFromPurchase(line);
    }

    this.recalcGrandTotal();
    this.persistDraftEnabled = true;
    this.toast.show('success', `Compra #${purchase.id} cargada para edición.`);
  }

  private addLineFromPurchase(line: PurchaseDetail['lines'][number]): void {
    const hasColorBreakdown = line.hasColorBreakdown ?? false;
    const colorDeltas = line.colorDeltas ?? [];
    const colorsArr = this.fb.array<FormGroup>([]);

    if (hasColorBreakdown && colorDeltas.length > 0) {
      for (const delta of colorDeltas) {
        colorsArr.push(
          this.fb.group({
            _rowKey: [genTempId('kc')],
            displayLabel: [delta.colorDescription ?? `Color #${delta.colorId}`],
            colorId: [delta.colorId],
            colorTempId: [null],
            colorHash: [null],
            quantity: [delta.quantity || 1, [Validators.required, Validators.min(1)]],
          }),
        );
      }
    } else {
      colorsArr.push(
        this.fb.group({
          _rowKey: [genTempId('kc')],
          displayLabel: ['— (solo talla)'],
          colorId: [null],
          colorTempId: [null],
          colorHash: [null],
          quantity: [line.sizeStockDelta || 1, [Validators.required, Validators.min(1)]],
        }),
      );
    }

    const lineGroup = this.fb.group({
      lineId: [String(line.id)],
      productName: [line.productName ?? `Producto #${line.productId}`],
      sizeLabel: [line.sizeDescription ?? `Talla #${line.sizeId}`],
      productMode: ['existing'],
      productId: [line.productId],
      productTempId: [null],
      productGenderId: [null],
      sizeMode: ['existing'],
      sizeId: [line.sizeId],
      sizeTempId: [null],
      sizeTypeId: [line.sizeTypeId ?? null],
      productSizeId: [line.productSizeId],
      barcode: [line.barcode ?? null],
      purchasePrice: [
        Number(line.purchasePrice) || 0,
        [Validators.required, Validators.min(0)],
      ],
      salePrice: [Number(line.salePrice) || 0, [Validators.min(0)]],
      minSalePrice: [Number(line.minSalePrice) || 0, [Validators.min(0)]],
      colors: colorsArr,
      subtotal: [{ value: Number(line.subtotal) || 0, disabled: true }],
    });

    this.bindLineTotals(lineGroup);
    this.lines.push(lineGroup);
  }

  private finishEditLineProductHydration(raw: Record<string, unknown>): void {
    const mode = raw['productMode'] as string;
    if (mode === 'existing' && raw['productId'] != null) {
      this.useExistingProduct.set(true);
      this.productService
        .getOne(Number(raw['productId']))
        .pipe(
          switchMap((product) => {
            this.selectedProduct.set(product);
            this.productResults.set([product]);
            return this.catalog.getProductSizes(product.id).pipe(
              map((sizes) => ({ product, sizes: sizes ?? [] })),
            );
          }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: ({ product, sizes }) => {
            const pivot = new Map<number, ProductSizeOption>();
            for (const row of sizes) {
              pivot.set(row.id, row);
            }
            this.productPivotBySizeId.set(pivot);
            this.hydrateLineDraftSizeFromRow(raw, product);
          },
          error: () => {
            this.toast.show('error', 'No se pudo cargar el producto de la línea.');
          },
        });
    } else {
      this.useExistingProduct.set(false);
      this.selectedProduct.set(null);
      this.productResults.set([]);
      this.productPivotBySizeId.set(new Map());
      this.lineDraft.patchValue(
        {
          newProductName: String(raw['productName'] ?? ''),
          newProductGenderId: (raw['productGenderId'] as number | null) ?? null,
        },
        { emitEvent: false },
      );
      this.activeNewProductTempId = (raw['productTempId'] as string | null) ?? null;
      this.hydrateLineDraftSizeFromRow(raw);
    }
  }

  private hydrateLineDraftSizeFromRow(
    raw: Record<string, unknown>,
    product?: Product | null,
  ): void {
    const sizeMode = raw['sizeMode'] as string;
    const sizeId =
      raw['sizeId'] != null && Number(raw['sizeId']) > 0 ? Number(raw['sizeId']) : null;
    const sizeTypeFromRow =
      raw['sizeTypeId'] != null && Number(raw['sizeTypeId']) > 0
        ? Number(raw['sizeTypeId'])
        : null;

    const applySizeContext = (sizeTypeId: number | null): void => {
      this.lineDraft.patchValue(
        {
          selectedSizeTypeId: sizeTypeId,
          selectedSizeId: null,
          selectedColorId: null,
        },
        { emitEvent: false },
      );

      if (!sizeTypeId) {
        this.catalogSizes.set([]);
        this.syncCatalogSizeOptions();
        this.refreshColorsAfterSizeChange();
        return;
      }

      this.catalog
        .getSizesBySizeType(sizeTypeId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (sizes) => {
            this.catalogSizes.set(sizes ?? []);
            this.syncCatalogSizeOptions();
            if (sizeMode === 'existing' && sizeId != null) {
              this.lineDraft.patchValue({ selectedSizeId: sizeId }, { emitEvent: false });
            }
            this.refreshColorsAfterSizeChange();
          },
          error: () => {
            this.catalogSizes.set([]);
            this.syncCatalogSizeOptions();
            this.refreshColorsAfterSizeChange();
          },
        });
    };

    if (sizeTypeFromRow != null) {
      applySizeContext(sizeTypeFromRow);
      return;
    }

    if (sizeMode === 'existing' && sizeId != null) {
      applySizeContext(this.firstProductSizeTypeId(product));
      return;
    }

    applySizeContext(this.firstProductSizeTypeId(product));
  }

  private firstProductSizeTypeId(product?: Product | null): number | null {
    const types = product?.sizeTypeId ?? [];
    if (!Array.isArray(types) || types.length === 0) {
      return null;
    }
    const first = Number(types[0]);
    return Number.isFinite(first) && first > 0 ? first : null;
  }

  private buildBulkPayload(): { payload: PurchaseBulkPayload } | null {
    if (this.lines.length === 0) {
      return null;
    }
    const rawLines = this.collectLinesForPayload();
    const payload = buildPurchaseBulkPayload(
      {
        supplierName: this.header.value.supplierName ?? '',
        vendorId: this.header.value.vendorId ?? null,
        documentNote: this.header.value.documentNote || null,
        registeredAt: this.header.value.registeredAt ?? this.todayIso(),
        warehouseId: Number(this.header.value.warehouseId) || 1,
      },
      rawLines,
    );
    return { payload };
  }

  private collectLinesForPayload(): PurchaseLineFormValue[] {
    return this.lines.controls.map((group) => {
      const value = group.getRawValue();
      const colors = (value.colors as Record<string, unknown>[]).map((c) => ({
        displayLabel: String(c['displayLabel'] ?? ''),
        colorId: (c['colorId'] as number | null) ?? null,
        colorTempId: (c['colorTempId'] as string | null) ?? null,
        colorHash: (c['colorHash'] as string | null) ?? null,
        quantity: Number(c['quantity']) || 0,
      }));
      const sumQty = colors.reduce((acc, c) => acc + (Number(c.quantity) || 0), 0);
      const price = Number(value.purchasePrice) || 0;
      const rawSub = Number(value.subtotal);
      const subtotal =
        Number.isFinite(rawSub) && rawSub > 0.00001
          ? rawSub
          : Math.round(sumQty * price * 100) / 100;
      return {
        lineId: value.lineId,
        productName: value.productName,
        sizeLabel: value.sizeLabel,
        productMode: value.productMode,
        productId: value.productId,
        productTempId: value.productTempId,
        productGenderId: value.productGenderId,
        sizeMode: value.sizeMode,
        sizeId: value.sizeId,
        sizeTempId: value.sizeTempId,
        sizeTypeId: value.sizeTypeId,
        productSizeId: value.productSizeId,
        barcode: value.barcode,
        purchasePrice: Number(value.purchasePrice) || 0,
        salePrice: Number(value.salePrice) || 0,
        minSalePrice: Number(value.minSalePrice) || 0,
        subtotal,
        colors,
      };
    });
  }

  private requestPersistDraft(): void {
    if (this.persistDraftEnabled) {
      this.persistDraft$.next();
    }
  }

  private wireDraftAutoSave(): void {
    merge(
      this.header.valueChanges,
      this.lineDraft.valueChanges,
      this.lines.valueChanges,
      this.persistDraft$,
    )
      .pipe(
        debounceTime(400),
        filter(() => this.persistDraftEnabled),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.persistDraftInMemory());
  }

  private buildDraftSnapshot(): PurchaseRegisterDraftSnapshot {
    const useExisting = this.useExistingProduct();
    const product = this.selectedProduct();
    return {
      version: 2,
      header: this.header.getRawValue() as Record<string, unknown>,
      lineDraft: this.lineDraft.getRawValue() as Record<string, unknown>,
      lines: this.lines.controls.map(
        (c) => (c as FormGroup).getRawValue() as Record<string, unknown>,
      ),
      useExistingProduct: useExisting,
      selectedProductId: useExisting && product ? product.id : null,
      activeNewProductTempId: this.activeNewProductTempId,
      isEditingLine: this.isEditingLine(),
      paymentMethod: this.selectedPaymentMethod(),
    };
  }

  private persistDraftInMemory(): void {
    const snap = this.buildDraftSnapshot();
    const supplier = String(snap.header['supplierName'] ?? '').trim();
    const hasLines = snap.lines.length > 0;
    const queue = snap.lineDraft['draftColorQueue'];
    const hasVariants = Array.isArray(queue) && queue.length > 0;
    const ld = snap.lineDraft;
    const newName = String(ld['newProductName'] ?? '').trim();
    const hasSizeType =
      ld['selectedSizeTypeId'] != null && Number(ld['selectedSizeTypeId']) > 0;
    const hasCatalogSize =
      ld['selectedSizeId'] != null && Number(ld['selectedSizeId']) > 0;
    const hasPricesOrBarcode =
      Number(ld['purchasePrice']) > 0 ||
      Number(ld['salePrice']) > 0 ||
      Number(ld['minSalePrice']) > 0 ||
      !!String(ld['barcode'] ?? '').trim();
    const hasMeaningfulConstructor =
      hasVariants ||
      hasSizeType ||
      hasCatalogSize ||
      !!newName ||
      hasPricesOrBarcode ||
      snap.selectedProductId != null;

    if (!hasLines && !supplier && !hasMeaningfulConstructor) {
      this.purchaseDraft.clear();
      return;
    }

    this.purchaseDraft.save(snap);
  }

  private purgeLegacyBrowserDraft(): void {
    try {
      for (const key of LEGACY_DRAFT_STORAGE_KEYS) {
        localStorage.removeItem(key);
      }
    } catch {
      /* ignore */
    }
  }

  private enablePersistDraft(): void {
    this.persistDraftEnabled = true;
  }

  private tryRestoreDraftFromMemory(): void {
    this.purgeLegacyBrowserDraft();

    const parsed = this.purchaseDraft.read();
    if (!parsed || parsed.version !== 2) {
      this.enablePersistDraft();
      this.wireDraftAutoSave();
      return;
    }

    this.persistDraftEnabled = false;

    const header = parsed.header ?? {};
    const vidRaw = header['vendorId'];
    const vendorId =
      vidRaw != null && vidRaw !== '' && Number(vidRaw) > 0 ? Number(vidRaw) : null;
    const supName = String(header['supplierName'] ?? '').trim();
    this.header.patchValue(
      {
        supplierName: supName,
        vendorId,
        documentNote: String(header['documentNote'] ?? ''),
        registeredAt: header['registeredAt']
          ? String(header['registeredAt']).slice(0, 10)
          : this.todayIso(),
        warehouseId: Number(header['warehouseId']) > 0 ? Number(header['warehouseId']) : 1,
      },
      { emitEvent: false },
    );
    this.supplierNameLockedForVendorId =
      vendorId != null && supName ? supName : null;

    if (parsed.paymentMethod) {
      this.selectedPaymentMethod.set(parsed.paymentMethod);
    }

    this.applyLineDraftFromSnapshot((parsed.lineDraft ?? {}) as Record<string, unknown>);
    this.useExistingProduct.set(!!parsed.useExistingProduct);
    this.activeNewProductTempId = parsed.activeNewProductTempId ?? null;
    this.isEditingLine.set(!!parsed.isEditingLine);
    this.rebuildLinesFromSnapshot(parsed.lines ?? []);

    const afterCatalogSizes = (): void => {
      if (parsed.useExistingProduct && parsed.selectedProductId != null) {
        this.hydrateSelectedProductForDraft(parsed.selectedProductId, () => {
          this.enablePersistDraft();
          this.wireDraftAutoSave();
          this.toast.show(
            'success',
            'Se recuperó el borrador de esta sesión (cabecera, producto y líneas).',
          );
        });
      } else {
        this.selectedProduct.set(null);
        this.productResults.set([]);
        this.productPivotBySizeId.set(new Map());
        this.colorOptions.set([]);
        this.refreshColorsAfterSizeChange();
        this.enablePersistDraft();
        this.wireDraftAutoSave();
        this.toast.show('success', 'Se recuperó el borrador de esta sesión.');
      }
    };

    const typeId = this.lineDraft.get('selectedSizeTypeId')?.value;
    if (typeId) {
      this.catalog
        .getSizesBySizeType(Number(typeId))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (rows) => {
            this.catalogSizes.set(rows ?? []);
            this.syncCatalogSizeOptions();
            afterCatalogSizes();
          },
          error: () => {
            this.catalogSizes.set([]);
            this.syncCatalogSizeOptions();
            afterCatalogSizes();
          },
        });
    } else {
      this.catalogSizes.set([]);
      this.syncCatalogSizeOptions();
      afterCatalogSizes();
    }
  }

  private hydrateSelectedProductForDraft(productId: number, done: () => void): void {
    forkJoin({
      full: this.productService.getOne(productId),
      sizes: this.catalog.getProductSizes(productId),
    })
      .pipe(
        switchMap(({ full, sizes }) => {
          this.selectedProduct.set(full);
          this.productResults.set([full]);
          const pivot = new Map<number, ProductSizeOption>();
          for (const row of sizes ?? []) {
            pivot.set(row.id, row);
          }
          this.productPivotBySizeId.set(pivot);

          const draftType = this.lineDraft.get('selectedSizeTypeId')?.value;
          if (draftType != null && Number(draftType) > 0) {
            return of(void 0);
          }

          const types = full.sizeTypeId ?? [];
          const firstType =
            Array.isArray(types) && types.length > 0 ? Number(types[0]) : null;

          if (firstType != null && Number.isFinite(firstType) && firstType > 0) {
            this.lineDraft.patchValue(
              { selectedSizeTypeId: firstType },
              { emitEvent: false },
            );
            return this.catalog.getSizesBySizeType(firstType).pipe(
              tap((rows) => {
                this.catalogSizes.set(rows ?? []);
                this.syncCatalogSizeOptions();
              }),
              catchError(() => {
                this.catalogSizes.set([]);
                this.syncCatalogSizeOptions();
                return of([]);
              }),
              map(() => void 0),
            );
          }

          return of(void 0);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.refreshColorsAfterSizeChange();
          done();
        },
        error: () => {
          this.toast.show('error', 'Borrador: no se pudo recargar el producto guardado.');
          this.selectedProduct.set(null);
          this.productResults.set([]);
          done();
        },
      });
  }

  private createDraftColorQueueGroup(row: Record<string, unknown>): FormGroup {
    const mode = row['colorMode'] === 'new' ? 'new' : 'existing';
    const qty = Number(row['quantity']);
    return this.fb.group({
      id: [String(row['id'] ?? genTempId('dv'))],
      displayLabel: [String(row['displayLabel'] ?? '')],
      colorMode: [mode as 'existing' | 'new'],
      colorId: [row['colorId'] != null ? Number(row['colorId']) : null],
      colorTempId: [(row['colorTempId'] as string | null) ?? null],
      colorHash: [(row['colorHash'] as string | null) ?? null],
      quantity: [
        !Number.isFinite(qty) || qty < 1 ? 1 : qty,
        [Validators.required, Validators.min(1)],
      ],
    });
  }

  private draftQueueRawRows(): PurchaseDraftColorVariant[] {
    return this.draftColorQueue.controls.map((control) => {
      const value = (control as FormGroup).getRawValue() as Record<string, unknown>;
      return {
        id: String(value['id'] ?? ''),
        displayLabel: String(value['displayLabel'] ?? ''),
        colorMode: value['colorMode'] === 'new' ? 'new' : 'existing',
        colorId: value['colorId'] != null ? Number(value['colorId']) : null,
        colorTempId: (value['colorTempId'] as string | null) ?? null,
        colorHash: (value['colorHash'] as string | null) ?? null,
        quantity: Number(value['quantity']) || 0,
      };
    });
  }

  private applyLineDraftFromSnapshot(rawLineDraft: Record<string, unknown>): void {
    const queueRaw = rawLineDraft['draftColorQueue'];
    const queueSnapshot: Record<string, unknown>[] = Array.isArray(queueRaw)
      ? (queueRaw as Record<string, unknown>[])
      : [];

    this.draftColorQueue.clear({ emitEvent: false });

    this.lineDraft.patchValue(
      {
        newProductName: String(rawLineDraft['newProductName'] ?? ''),
        newProductGenderId:
          rawLineDraft['newProductGenderId'] != null
            ? Number(rawLineDraft['newProductGenderId'])
            : null,
        selectedSizeTypeId:
          rawLineDraft['selectedSizeTypeId'] != null
            ? Number(rawLineDraft['selectedSizeTypeId'])
            : null,
        sizeNewToggle: !!rawLineDraft['sizeNewToggle'],
        newSizeDescription: String(rawLineDraft['newSizeDescription'] ?? ''),
        colorNewToggle: !!rawLineDraft['colorNewToggle'],
        useColorVariant: rawLineDraft['useColorVariant'] !== false,
        newColorDescription: String(rawLineDraft['newColorDescription'] ?? ''),
        newColorHash: String(rawLineDraft['newColorHash'] ?? ''),
        selectedSizeId:
          rawLineDraft['selectedSizeId'] != null
            ? Number(rawLineDraft['selectedSizeId'])
            : null,
        selectedColorId:
          rawLineDraft['selectedColorId'] != null
            ? Number(rawLineDraft['selectedColorId'])
            : null,
        barcode: String(rawLineDraft['barcode'] ?? ''),
        purchasePrice: Number(rawLineDraft['purchasePrice']) || 0,
        salePrice: Number(rawLineDraft['salePrice']) || 0,
        minSalePrice: Number(rawLineDraft['minSalePrice']) || 0,
        variantQuantity: Math.max(1, Number(rawLineDraft['variantQuantity']) || 1),
        sizeOnlyQuantity: Math.max(1, Number(rawLineDraft['sizeOnlyQuantity']) || 1),
      },
      { emitEvent: false },
    );

    for (const row of queueSnapshot) {
      this.draftColorQueue.push(this.createDraftColorQueueGroup(row));
    }
  }

  private rebuildLinesFromSnapshot(rows: Record<string, unknown>[]): void {
    this.lines.clear({ emitEvent: false });
    for (const raw of rows) {
      const colorsRaw = (raw['colors'] as Record<string, unknown>[]) ?? [];
      const colorsArr = this.fb.array<FormGroup>([]);
      for (const color of colorsRaw) {
        colorsArr.push(
          this.fb.group({
            _rowKey: [String(color['_rowKey'] ?? genTempId('kc'))],
            displayLabel: [String(color['displayLabel'] ?? '')],
            colorId: [color['colorId'] != null ? Number(color['colorId']) : null],
            colorTempId: [(color['colorTempId'] as string | null) ?? null],
            colorHash: [(color['colorHash'] as string | null) ?? null],
            quantity: [
              Number(color['quantity']) || 1,
              [Validators.required, Validators.min(1)],
            ],
          }),
        );
      }

      const lineGroup = this.fb.group({
        lineId: [String(raw['lineId'] ?? genTempId('l'))],
        productName: [String(raw['productName'] ?? '')],
        sizeLabel: [String(raw['sizeLabel'] ?? '')],
        productMode: [raw['productMode'] ?? 'existing'],
        productId: [raw['productId'] != null ? Number(raw['productId']) : null],
        productTempId: [(raw['productTempId'] as string | null) ?? null],
        productGenderId: [
          raw['productGenderId'] != null ? Number(raw['productGenderId']) : null,
        ],
        sizeMode: [raw['sizeMode'] ?? 'existing'],
        sizeId: [raw['sizeId'] != null ? Number(raw['sizeId']) : null],
        sizeTempId: [(raw['sizeTempId'] as string | null) ?? null],
        sizeTypeId: [raw['sizeTypeId'] != null ? Number(raw['sizeTypeId']) : null],
        productSizeId: [
          raw['productSizeId'] != null ? Number(raw['productSizeId']) : null,
        ],
        barcode: [(raw['barcode'] as string | null) ?? null],
        purchasePrice: [
          Number(raw['purchasePrice']) || 0,
          [Validators.required, Validators.min(0)],
        ],
        salePrice: [Number(raw['salePrice']) || 0, [Validators.min(0)]],
        minSalePrice: [Number(raw['minSalePrice']) || 0, [Validators.min(0)]],
        colors: colorsArr,
        subtotal: [{ value: Number(raw['subtotal']) || 0, disabled: true }],
      });

      this.bindLineTotals(lineGroup);
      this.lines.push(lineGroup);
    }
    this.recalcGrandTotal();
  }

  private syncCatalogSizeOptions(): void {
    this.catalogSizeOptions.set(
      this.catalogSizes().map((size) => ({
        label: this.catalogSizeLabel(size.id),
        value: size.id,
      })),
    );
  }

  private todayIso(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

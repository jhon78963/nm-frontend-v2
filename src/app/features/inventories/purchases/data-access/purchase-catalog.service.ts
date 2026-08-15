import { HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { TABLE_FILTER_KEYS } from '../../../../core/table-filters/table-filter-keys';
import { TableFilterStorageService } from '../../../../core/table-filters/table-filter-storage.service';
import { Vendor } from '../../../directories/vendors/models/vendor.model';
import { adaptVendor, adaptVendorList } from '../../../directories/vendors/data-access/vendor.adapter';
import { Product } from '../../products/models/product.model';
import { adaptProduct, adaptProductList } from '../../products/data-access/product.adapter';
import { SizeDetail } from '../../sizes/models/size.model';
import { adaptSizeDetail, adaptSizeList } from '../../sizes/data-access/size.adapter';
import {
  ProductColorOption,
  ProductSizeOption,
  SizeTypeOption,
} from '../models/purchase.model';
import {
  adaptProductColorOption,
  adaptProductSizeOption,
  unwrapArrayPayload,
} from './purchase.adapter';

export interface PurchaseRegisterDraftSnapshot {
  version: 2;
  header: Record<string, unknown>;
  lineDraft: Record<string, unknown>;
  lines: Record<string, unknown>[];
  useExistingProduct: boolean;
  selectedProductId: number | null;
  activeNewProductTempId: string | null;
  isEditingLine: boolean;
  paymentMethod: string;
}

const PURCHASE_REGISTER_DRAFT_KEY = TABLE_FILTER_KEYS.purchaseRegisterDraft;

export function isPurchaseRegisterDraftSnapshot(
  value: unknown,
): value is PurchaseRegisterDraftSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const draft = value as Record<string, unknown>;
  return (
    draft['version'] === 2 &&
    typeof draft['header'] === 'object' &&
    draft['header'] !== null &&
    typeof draft['lineDraft'] === 'object' &&
    draft['lineDraft'] !== null &&
    Array.isArray(draft['lines']) &&
    typeof draft['useExistingProduct'] === 'boolean' &&
    (draft['selectedProductId'] === null || typeof draft['selectedProductId'] === 'number') &&
    (draft['activeNewProductTempId'] === null ||
      typeof draft['activeNewProductTempId'] === 'string') &&
    typeof draft['isEditingLine'] === 'boolean' &&
    (draft['paymentMethod'] === undefined || typeof draft['paymentMethod'] === 'string')
  );
}

@Service()
export class PurchaseRegisterDraftService {
  private readonly storage = inject(TableFilterStorageService);

  readonly snapshot = signal<PurchaseRegisterDraftSnapshot | null>(null);

  read(): PurchaseRegisterDraftSnapshot | null {
    const cached = this.snapshot();
    if (cached) {
      return cached;
    }

    const saved = this.storage.load(
      PURCHASE_REGISTER_DRAFT_KEY,
      isPurchaseRegisterDraftSnapshot,
    );
    if (saved) {
      this.snapshot.set(saved);
      return saved;
    }

    return null;
  }

  save(draft: PurchaseRegisterDraftSnapshot): void {
    this.snapshot.set(draft);
    this.storage.save(PURCHASE_REGISTER_DRAFT_KEY, draft);
  }

  clear(): void {
    this.snapshot.set(null);
    this.storage.remove(PURCHASE_REGISTER_DRAFT_KEY);
  }
}

@Service()
export class PurchaseCatalogService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  searchProducts(term: string, limit = 15, page = 1): Observable<Product[]> {
    const q = encodeURIComponent(term.trim());
    const url = `${this.api}/products?limit=${limit}&page=${page}&search=${q}`;
    return this.http.get<unknown>(url).pipe(
      map((raw) => adaptProductList(raw).data),
    );
  }

  getProduct(id: number): Observable<Product> {
    return this.http
      .get<unknown>(`${this.api}/products/${id}`)
      .pipe(map(adaptProduct));
  }

  getProductSizes(productId: number): Observable<ProductSizeOption[]> {
    return this.http
      .get<unknown>(`${this.api}/colors/sizes?productId=${productId}`)
      .pipe(
        map((raw) => unwrapArrayPayload(raw).map(adaptProductSizeOption)),
      );
  }

  getColors(productId: number, sizeId: number): Observable<ProductColorOption[]> {
    return this.http
      .get<unknown>(
        `${this.api}/colors/selected?productId=${productId}&sizeId=${sizeId}`,
      )
      .pipe(
        map((raw) => unwrapArrayPayload(raw).map(adaptProductColorOption)),
      );
  }

  getSizeTypes(): Observable<SizeTypeOption[]> {
    return this.http.get<unknown>(`${this.api}/size-types`).pipe(
      map((raw) =>
        Array.isArray(raw)
          ? raw.map((row) => {
              const r = row as Record<string, unknown>;
              return {
                id: Number(r['id']) || 0,
                description: String(r['description'] ?? ''),
              };
            })
          : [],
      ),
    );
  }

  getSizesBySizeType(sizeTypeId: number, limit = 100): Observable<SizeDetail[]> {
    return this.http
      .get<unknown>(
        `${this.api}/sizes?limit=${limit}&page=1&sizeTypeId=${sizeTypeId}`,
      )
      .pipe(map((raw) => adaptSizeList(raw).data));
  }

  getSizeOne(id: number): Observable<SizeDetail> {
    return this.http
      .get<unknown>(`${this.api}/sizes/${id}`)
      .pipe(map(adaptSizeDetail));
  }

  searchVendors(term: string, limit = 15): Observable<Vendor[]> {
    const q = encodeURIComponent(term.trim());
    return this.http
      .get<unknown>(`${this.api}/vendors?limit=${limit}&page=1&search=${q}`)
      .pipe(map((raw) => adaptVendorList(raw).data));
  }

  getColorsCatalogAll(pageSize = 80): Observable<ProductColorOption[]> {
    const url = (page: number) => `${this.api}/colors?limit=${pageSize}&page=${page}`;

    return this.http
      .get<unknown>(url(1))
      .pipe(
        switchMap((first) => {
          const r = first as {
            data?: unknown[];
            paginate?: { total?: number; pages?: number };
          };
          const rows = r.data ?? [];
          const total = Number(r.paginate?.total);
          const explicitPages = Number(r.paginate?.pages);
          let pages =
            Number.isFinite(explicitPages) && explicitPages > 0
              ? explicitPages
              : 0;
          if (pages < 1 && Number.isFinite(total) && total > 0 && pageSize > 0) {
            pages = Math.ceil(total / pageSize);
          }
          if (pages < 1) {
            pages = 1;
          }
          pages = Math.min(pages, 80);

          const normalizeCatalog = (data: unknown[]): ProductColorOption[] =>
            data.map((row) => {
              const adapted = adaptProductColorOption(row);
              return { ...adapted, isExists: false, stock: null, productSizeId: null };
            });

          if (pages <= 1) {
            return of(normalizeCatalog(rows));
          }

          const restCalls: Observable<{ data?: unknown[] }>[] = [];
          for (let p = 2; p <= pages; p++) {
            restCalls.push(
              this.http.get<{ data?: unknown[] }>(url(p)),
            );
          }

          return forkJoin(restCalls).pipe(
            map((restResponses) => {
              const merged = [
                ...normalizeCatalog(rows),
                ...restResponses.flatMap((resp) =>
                  normalizeCatalog(resp.data ?? []),
                ),
              ];
              const byId = new Map<number, ProductColorOption>();
              for (const c of merged) {
                if (c.id > 0) {
                  byId.set(c.id, c);
                }
              }
              return Array.from(byId.values()).sort((a, b) =>
                a.description.localeCompare(b.description, 'es', {
                  sensitivity: 'base',
                }),
              );
            }),
          );
        }),
      );
  }

  createVendorMinimal(name: string): Observable<Vendor> {
    return this.http
      .post<unknown>(`${this.api}/vendors`, { name: name.trim() })
      .pipe(map(adaptVendor));
  }

  resolveOrCreateVendor(name: string): Observable<Vendor> {
    const trimmed = name.trim();
    return this.searchVendors(trimmed, 25).pipe(
      switchMap((rows) => {
        const exact = rows.find(
          (r) => (r.name ?? '').trim().toLowerCase() === trimmed.toLowerCase(),
        );
        if (exact) {
          return of(exact);
        }
        return this.createVendorMinimal(trimmed);
      }),
    );
  }
}

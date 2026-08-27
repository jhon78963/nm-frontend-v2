import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, firstValueFrom, map, Observable, switchMap, throwError } from 'rxjs';
import { TABLE_FILTER_KEYS } from '../../../../../core/table-filters/table-filter-keys';
import { TableFilterStorageService } from '../../../../../core/table-filters/table-filter-storage.service';
import { isSearchPageFilterState } from '../../../../../core/table-filters/table-filter-state.util';
import { environment } from '../../../../../../environments/environment';
import {
  SaleDetail,
  SaleFilterState,
  SaleListResponse,
  SaleUpdatePayload,
} from '../models/sale.model';
import { adaptSaleDetail, adaptSaleList } from './sale.adapter';
import { prepareReceiptHtmlForPrint } from '../../../pos/utils/receipt-print.util';

const FILTER_STORAGE_KEY = TABLE_FILTER_KEYS.sales;

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'string' && err.trim()) {
    return err;
  }

  const http = err as {
    error?: { message?: string | string[] };
    message?: string;
  };

  const backendMessage = http?.error?.message;
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage;
  }
  if (Array.isArray(backendMessage) && backendMessage.length > 0) {
    return backendMessage[0]?.trim() ?? backendMessage.join(' ');
  }

  return http?.message ?? 'Error al procesar la solicitud.';
}

@Service()
export class SaleService {
  private readonly http = inject(HttpClient);
  private readonly filterStorage = inject(TableFilterStorageService);
  private readonly base = `${environment.apiUrl}/sales`;
  private readonly ticketBase = `${environment.apiUrl}/tickets`;

  getFilterState(): SaleFilterState | null {
    return this.filterStorage.load(FILTER_STORAGE_KEY, isSearchPageFilterState);
  }

  saveFilterState(state: SaleFilterState): void {
    this.filterStorage.save(FILTER_STORAGE_KEY, state);
  }

  clearFilterState(): void {
    this.filterStorage.remove(FILTER_STORAGE_KEY);
  }

  getAll(params: {
    limit: number;
    page: number;
    search?: string;
  }): Observable<SaleListResponse> {
    this.saveFilterState({
      limit: params.limit,
      page: params.page,
      search: params.search?.trim() ?? '',
    });

    let url = `${this.base}?perPage=${params.limit}&page=${params.page}`;
    const search = params.search?.trim();
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    return this.http.get<unknown>(url).pipe(map(adaptSaleList));
  }

  getOne(id: string): Observable<SaleDetail> {
    return this.http.get<unknown>(`${this.base}/${id}`).pipe(map(adaptSaleDetail));
  }

  update(id: string, payload: SaleUpdatePayload): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}`, payload).pipe(
      switchMap(() => this.reloadWithSavedFilters()),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  cancel(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(
      switchMap(() => this.reloadWithSavedFilters()),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  async openTicketPreview(saleId: string): Promise<void> {
    const tab = window.open('', '_blank');
    if (!tab) {
      throw new Error(
        'Permite ventanas emergentes para ver el ticket de la venta.',
      );
    }

    tab.document.open();
    tab.document.write(
      '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"></head><body style="font-family:sans-serif;padding:16px">Cargando ticket…</body></html>',
    );
    tab.document.close();

    try {
      const html = await firstValueFrom(
        this.http.get(`${this.ticketBase}/${saleId}`, {
          responseType: 'text',
        }),
      );
      const previewDocument = prepareReceiptHtmlForPrint(html, false);
      tab.document.open();
      tab.document.write(previewDocument);
      tab.document.close();
    } catch (error) {
      tab.close();
      throw error;
    }
  }

  private reloadWithSavedFilters(): Observable<void> {
    const saved = this.getFilterState();
    return this.getAll({
      limit: saved?.limit ?? 10,
      page: saved?.page ?? 1,
      search: saved?.search ?? '',
    }).pipe(map(() => undefined));
  }
}

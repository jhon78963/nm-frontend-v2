import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ProductInventoryItem,
  ProductsInventoryAiSummary,
} from '../models/products-inventory.model';
import {
  adaptProductsInventoryAiSummary,
  adaptProductsInventoryList,
} from './products-inventory.adapter';

export interface ProductsInventoryWithAiResponse {
  products: ProductInventoryItem[];
  horizonDays: number;
  aiSummary: ProductsInventoryAiSummary | null;
}

@Service()
export class ProductsInventoryService {
  private readonly http = inject(HttpClient);
  private readonly reportsBase = `${environment.apiUrl}/reports`;
  private readonly aiBase = `${environment.apiUrl}/ai`;

  loadInventory(): Observable<ProductInventoryItem[]> {
    return this.http
      .get<unknown>(`${this.reportsBase}/products`)
      .pipe(map((response) => adaptProductsInventoryList(response)));
  }

  loadInventoryWithAi(horizonDays = 30): Observable<ProductsInventoryWithAiResponse> {
    const params = new HttpParams().set('horizon_days', String(horizonDays));

    return this.http.get<unknown>(`${this.aiBase}/reports/products-inventory`, { params }).pipe(
      map((response) => {
        const envelope = response as {
          data?: { products?: unknown[]; horizon_days?: number };
        };

        return {
          products: adaptProductsInventoryList(response),
          horizonDays: Number(envelope?.data?.horizon_days ?? horizonDays),
          aiSummary: adaptProductsInventoryAiSummary(response),
        };
      }),
    );
  }

  downloadPdf(): Observable<Blob> {
    return this.http.get(`${this.reportsBase}/products/export/pdf`, {
      responseType: 'blob',
    });
  }
}

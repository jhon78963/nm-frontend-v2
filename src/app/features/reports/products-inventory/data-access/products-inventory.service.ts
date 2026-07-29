import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ProductInventoryItem } from '../models/products-inventory.model';
import { adaptProductsInventoryList } from './products-inventory.adapter';

@Service()
export class ProductsInventoryService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reports`;

  loadInventory(): Observable<ProductInventoryItem[]> {
    return this.http
      .get<unknown>(`${this.base}/products`)
      .pipe(map((response) => adaptProductsInventoryList(response)));
  }

  downloadPdf(): Observable<Blob> {
    return this.http.get(`${this.base}/products/export/pdf`, {
      responseType: 'blob',
    });
  }
}

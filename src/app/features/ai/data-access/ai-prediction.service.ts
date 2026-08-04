import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AiProductContext,
  AiProductOption,
  DemandPredictionResult,
  PriceOptimizationResult,
} from '../models/ai-prediction.model';
import {
  adaptAiProductContext,
  adaptAiProductSearchResponse,
  adaptDemandPredictionResult,
  adaptPriceOptimizationResult,
} from './ai-prediction.adapter';

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
    return backendMessage.join(' ');
  }

  return http?.message ?? 'No se pudo completar la predicción de IA.';
}

@Service()
export class AiPredictionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  searchProducts(term: string, limit = 15): Observable<AiProductOption[]> {
    const query = encodeURIComponent(term.trim());
    const url = `${this.apiUrl}/products?limit=${limit}&page=1&search=${query}`;

    return this.http.get<unknown>(url).pipe(map(adaptAiProductSearchResponse));
  }

  getProductContext(productId: number): Observable<AiProductContext> {
    return this.http
      .get<unknown>(`${this.apiUrl}/ai/products/${productId}/context`)
      .pipe(
        map(adaptAiProductContext),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  optimizePrice(productId: number): Observable<PriceOptimizationResult> {
    return this.http
      .post<unknown>(`${this.apiUrl}/ai/predict/price`, { product_id: productId })
      .pipe(
        map(adaptPriceOptimizationResult),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  predictDemand(
    productId: number,
    horizonDays: number,
  ): Observable<DemandPredictionResult> {
    return this.http
      .post<unknown>(`${this.apiUrl}/ai/predict/demand`, {
        product_id: productId,
        horizon_days: horizonDays,
      })
      .pipe(
        map(adaptDemandPredictionResult),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }
}

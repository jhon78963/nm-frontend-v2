import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  StoreHeroSlide,
  StoreHeroSlidesPayload,
  StorePromoBanner,
  StorePromoBannersPayload,
} from '../models/store-home-banners.model';
import {
  adaptHeroSlidesResponse,
  adaptPromoBannersResponse,
} from './store-home-banners.adapter';

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

  return http?.message ?? 'Error al procesar la solicitud.';
}

@Service()
export class StoreHomeBannersService {
  private readonly http = inject(HttpClient);
  private readonly heroBase = `${environment.apiUrl}/ecommerce/hero-slides`;
  private readonly promoBase = `${environment.apiUrl}/ecommerce/banners`;

  getHeroSlides(): Observable<StoreHeroSlide[]> {
    return this.http
      .get<unknown>(this.heroBase)
      .pipe(map(adaptHeroSlidesResponse));
  }

  saveHeroSlides(payload: StoreHeroSlidesPayload): Observable<StoreHeroSlide[]> {
    return this.http.put<unknown>(`${this.heroBase}/admin`, payload).pipe(
      map(adaptHeroSlidesResponse),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  getPromoBanners(): Observable<StorePromoBanner[]> {
    return this.http
      .get<unknown>(this.promoBase)
      .pipe(map(adaptPromoBannersResponse));
  }

  savePromoBanners(payload: StorePromoBannersPayload): Observable<StorePromoBanner[]> {
    return this.http.put<unknown>(`${this.promoBase}/admin`, payload).pipe(
      map(adaptPromoBannersResponse),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }
}

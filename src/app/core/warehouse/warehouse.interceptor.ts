import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActiveWarehouseService } from './active-warehouse.service';

const WAREHOUSE_HEADER = 'X-Warehouse-Id';

const WAREHOUSE_SKIP_URL_PARTS = [
  '/sanctum/csrf-cookie',
  '/auth/csrf-token',
  '/auth/login',
  '/auth/me',
  '/auth/refresh',
  '/auth/logout',
];

function shouldAttachWarehouseHeader(url: string): boolean {
  return !WAREHOUSE_SKIP_URL_PARTS.some((part) => url.includes(part));
}

export const warehouseInterceptor: HttpInterceptorFn = (request, next) => {
  if (!shouldAttachWarehouseHeader(request.url)) {
    return next(request);
  }

  if (request.headers.has(WAREHOUSE_HEADER)) {
    return next(request);
  }

  const warehouseId = inject(ActiveWarehouseService).getActiveWarehouseId();
  if (warehouseId == null) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: { [WAREHOUSE_HEADER]: String(warehouseId) },
    }),
  );
};

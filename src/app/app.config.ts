import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';

import { routes } from './app.routes';
import { errorInterceptor } from './core/http/error.interceptor';
import { tokenInterceptor } from './core/auth/token.interceptor';
import { warehouseInterceptor } from './core/warehouse/warehouse.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withInterceptors([
        warehouseInterceptor,  // 1. Inyecta X-Warehouse-Id
        tokenInterceptor,      // 2. Inyecta Authorization: Bearer + maneja refresh
        errorInterceptor,      // 3. Toast de errores + redirect en 403/422/5xx
      ]),
    ),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
};

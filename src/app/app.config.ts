import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { csrfInterceptor } from './core/auth/csrf.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { tokenInterceptor } from './core/auth/token.interceptor';
import { warehouseInterceptor } from './core/warehouse/warehouse.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withInterceptors([
        csrfInterceptor,
        warehouseInterceptor,
        errorInterceptor,
        tokenInterceptor,
      ]),
    ),
    provideRouter(routes),
  ],
};

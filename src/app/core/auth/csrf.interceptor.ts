import { HttpInterceptorFn } from '@angular/common/http';

/**
 * El backend NestJS usa JWT stateless — no requiere CSRF.
 * Interceptor conservado como passthrough para no romper el registro en app.config.ts.
 */
export const csrfInterceptor: HttpInterceptorFn = (request, next) => next(request);

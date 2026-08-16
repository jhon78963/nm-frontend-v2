# Content-Security-Policy (producción) — nm-frontend-v2

**SEC-005.** La CSP de producción se envía por **header HTTP en nginx**, no por `<meta>` en HTML.

| Entorno                 | Dónde vive la CSP                                              |
| ----------------------- | -------------------------------------------------------------- |
| Desarrollo (`ng serve`) | `src/index.html` — meta `http-equiv` (SEC-022)                 |
| Producción (`ng build`) | `deploy/nginx.conf.example` — header `Content-Security-Policy` |

v2 usa **Tailwind + bundles locales** (sin PrimeNG ni CDNs en `index.html`), por lo que la política de producción es más estricta que la de `nm-frontend` legacy.

---

## Política recomendada (producción)

Valor de una sola línea (igual que en `deploy/nginx.conf.example`):

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https:; connect-src 'self' https://api.novedadesmaritex.net.pe https://upload.novedadesmaritex.net.pe; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests
```

En nginx:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https:; connect-src 'self' https://api.novedadesmaritex.net.pe https://upload.novedadesmaritex.net.pe; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests" always;
```

O usa la variable `$nm_csp_v2` del ejemplo en `deploy/nginx.conf.example`.

---

## CSP en desarrollo (SEC-022)

`src/index.html` aplica una política relajada para `ng serve`:

| Directiva                   | Dev                                                              | Prod (nginx)                                   |
| --------------------------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| `upgrade-insecure-requests` | No (API/uploads locales en HTTP)                                 | Sí                                             |
| `script-src`                | `'self' 'unsafe-inline' 'unsafe-eval'` (HMR / Angular dev)       | `'self'` (bundles hasheados)                   |
| `style-src`                 | `'self' 'unsafe-inline'`                                         | `'self' 'unsafe-inline'`                       |
| `img-src`                   | localhost API + upload dev                                       | `'self' data: blob: https:`                    |
| `connect-src`               | `localhost:8000`, `127.0.0.1:3050`, HMR `ws://localhost:4200`    | Solo API/upload HTTPS                          |

`src/index.prod.html` **no** incluye meta CSP; nginx debe aplicarla en producción.

Si usas API en LAN (`environment.ts` con IP), añade ese origen a `connect-src` e `img-src` en tu copia local del meta.

---

## Directivas y excepciones necesarias

### `style-src 'unsafe-inline'`

Angular inyecta estilos en línea en componentes. Sin `'unsafe-inline'` en `style-src`, la UI se rompe.

### `img-src https:` (solo prod)

Permite imágenes de catálogo y uploads en HTTPS. En dev se listan hosts concretos.

### `frame-src 'self' blob:`

Impresión de tickets POS crea `<iframe src="blob:...">`. Sin `blob:` en `frame-src`, la impresión falla.

### `connect-src`

Debe incluir los orígenes de `environment.prod.ts`:

- API: `https://api.novedadesmaritex.net.pe`
- Upload: `https://upload.novedadesmaritex.net.pe`

Cookies Sanctum y `HttpClient` usan estos hosts (CORS + `withCredentials`).

---

## Alineación con recursos de la app

| Recurso                                     | Origen        | Directiva                |
| ------------------------------------------- | ------------- | ------------------------ |
| Bundles Angular (JS/CSS)                    | `'self'`      | `script-src`, `style-src`|
| API Laravel Sanctum                         | API HTTPS     | `connect-src`            |
| Servicio de uploads                         | Upload HTTPS  | `connect-src`            |
| Imágenes de productos                       | `https:`      | `img-src`                |
| Vista previa / impresión POS (blob, iframe) | `blob:`       | `img-src`, `frame-src`   |

Variables de entorno: `src/environments/environment.prod.ts`.

---

## Verificación tras despliegue

1. DevTools → Network → documento principal → Response Headers: `Content-Security-Policy`.
2. Consola sin violaciones CSP en login, listados, POS e impresión de ticket.
3. Peticiones API y upload sin bloqueos (`connect-src`).

```bash
curl -sI "https://adm.tudominio.com/" | grep -i content-security-policy
```

---

## Referencias

- `deploy/nginx.conf.example` — server block listo para copiar
- `src/index.prod.html` — sin meta CSP
- `nm-frontend/docs/CSP.md` — referencia legacy (CDNs PrimeNG)
- `nm-backend` — headers API (`SecurityHeaders` middleware); CSP del SPA es independiente

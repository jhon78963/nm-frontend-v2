import { expect, test, type Page, type Route } from '@playwright/test';

export const E2E_USERNAME = process.env.E2E_USERNAME ?? 'vendedora';
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'password123';

const DEFAULT_E2E_ORIGIN =
  process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.E2E_PORT ?? '4321'}`;

export const MOCK_VENDEDORA = {
  id: 2,
  username: E2E_USERNAME,
  email: 'vendedora@test.com',
  name: 'María',
  surname: 'Vendedora',
  role: 'Vendedora',
  roles: ['Vendedora'],
  permissions: [
    'pos.checkout',
    'pos.searchProduct',
    'pos.searchCustomer',
    'cashflow.getDaily',
    'cashflow.store',
  ],
  tenantId: 1,
  warehouseId: 1,
  mustChangePassword: false,
};

export function corsHeaders(origin = DEFAULT_E2E_ORIGIN): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN, X-Warehouse-Id',
  };
}

function requestOrigin(route: Route): string {
  return route.request().headers()['origin'] ?? DEFAULT_E2E_ORIGIN;
}

export async function fulfillPreflight(route: Route): Promise<boolean> {
  if (route.request().method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: corsHeaders(requestOrigin(route)) });
    return true;
  }
  return false;
}

export async function setupAuthMocks(
  page: Page,
  user = MOCK_VENDEDORA,
): Promise<void> {
  if (process.env.E2E_USE_REAL_API === 'true') {
    return;
  }

  await page.route('**/sanctum/csrf-cookie', async (route) => {
    if (await fulfillPreflight(route)) return;
    await route.fulfill({
      status: 204,
      headers: corsHeaders(requestOrigin(route)),
    });
  });

  await page.route('**/api/auth/csrf-token', async (route) => {
    if (await fulfillPreflight(route)) return;
    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders(requestOrigin(route)),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ csrf_token: 'e2e-csrf-token' }),
    });
  });

  await page.route('**/api/auth/login', async (route) => {
    if (await fulfillPreflight(route)) return;
    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders(requestOrigin(route)),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    });
  });

  await page.route('**/api/auth/me', async (route) => {
    if (await fulfillPreflight(route)) return;
    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders(requestOrigin(route)),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    });
  });

  await page.route('**/api/auth/refresh', async (route) => {
    if (await fulfillPreflight(route)) return;
    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders(requestOrigin(route)),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'Token refreshed' }),
    });
  });

  await page.route('**/api/auth/logout', async (route) => {
    if (await fulfillPreflight(route)) return;
    await route.fulfill({
      status: 200,
      headers: corsHeaders(requestOrigin(route)),
      body: JSON.stringify({ message: 'Logout successfully' }),
    });
  });

  await page.route('**/api/**', async (route) => {
    if (await fulfillPreflight(route)) return;
    const url = route.request().url();
    if (url.includes('/auth/')) return route.fallback();
    await route.fulfill({
      status: 403,
      headers: {
        ...corsHeaders(requestOrigin(route)),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'Acceso denegado (mock QA)' }),
    });
  });
}

export async function fillLoginForm(page: Page): Promise<void> {
  await page.getByTestId('login-username').fill(E2E_USERNAME);
  await page.getByTestId('login-password').fill(E2E_PASSWORD);
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
}

export async function login(page: Page): Promise<void> {
  await page.goto('/auth/login', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('login-username')).toBeVisible({ timeout: 15_000 });
  await fillLoginForm(page);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
    timeout: 15_000,
  });
}

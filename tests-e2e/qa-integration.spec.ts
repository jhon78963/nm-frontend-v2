import { expect, test } from '@playwright/test';
import {
  corsHeaders,
  fulfillPreflight,
  login,
  MOCK_VENDEDORA,
  setupAuthMocks,
} from './helpers/auth-mocks';

test.describe('QA — Protección de rutas (v2 path routing)', () => {
  test('ruta protegida redirige a login sin sesión', async ({ page }) => {
    await page.goto('/inventories/products', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/auth\/login/, { timeout: 15_000 });
  });

  test('vendedora puede acceder a POS con permiso', async ({ page }) => {
    await setupAuthMocks(page);
    await login(page);
    await page.goto('/finances/pos');
    await expect(page).not.toHaveURL(/auth\/login/);
    await expect(page.getByRole('heading', { name: 'Punto de Venta' })).toBeVisible();
  });

  test('vendedora no puede acceder al registro de compras sin permiso', async ({
    page,
  }) => {
    await setupAuthMocks(page);
    await login(page);
    await page.goto('/inventories/purchases/register');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('vendedora no ve inventario de productos en menú', async ({ page }) => {
    await setupAuthMocks(page);
    await login(page);
    await page.goto('/finances/pos');

    const nav = page.locator('#main-navigation');
    await expect(nav.getByRole('link', { name: 'Productos', exact: true })).toHaveCount(
      0,
    );
    await expect(nav.getByRole('link', { name: 'POS', exact: true })).toHaveCount(1);
  });

  test('manipular permisos en localStorage no otorga acceso a gastos admin', async ({
    page,
  }) => {
    await setupAuthMocks(page);
    await login(page);
    await page.evaluate(() => {
      localStorage.setItem(
        'fakePermissions',
        JSON.stringify({ permissions: ['cashflow.getAdminMonthlyReport'] }),
      );
    });
    await page.goto('/expenses/admin-expenses');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });
});

test.describe('QA — Seguridad warehouse / admin / payroll', () => {
  test('warehouse_id arbitrario en localStorage no otorga acceso a inventario', async ({
    page,
  }) => {
    await setupAuthMocks(page);
    await login(page);

    await page.evaluate(() => {
      localStorage.setItem('active_warehouse_id', '9999');
    });

    await page.goto('/inventories/products');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('usuario sin rol admin no puede acceder a /administrations', async ({
    page,
  }) => {
    await setupAuthMocks(page);
    await login(page);
    await page.goto('/administrations');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('usuario sin permiso team.getPaymentByMonth no puede acceder a payroll', async ({
    page,
  }) => {
    const userWithTeamButNoPayroll = {
      ...MOCK_VENDEDORA,
      permissions: [
        ...MOCK_VENDEDORA.permissions,
        'team.getAll',
        'team.get',
      ],
    };

    await setupAuthMocks(page, userWithTeamButNoPayroll);
    await login(page);
    await page.goto('/directories/teams/pagos/1');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });
});

test.describe('QA — Interceptor 401', () => {
  test('401 en API limpia sesión y redirige a login', async ({ page }) => {
    await setupAuthMocks(page);
    await login(page);

    await page.unroute('**/api/auth/me');
    await page.route('**/api/auth/me', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: corsHeaders(route.request().headers()['origin']),
        });
        return;
      }
      await route.fulfill({
        status: 401,
        headers: corsHeaders(route.request().headers()['origin']),
        body: JSON.stringify({ message: 'Unauthenticated.' }),
      });
    });

    await page.unroute('**/api/auth/refresh');
    await page.route('**/api/auth/refresh', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: corsHeaders(route.request().headers()['origin']),
        });
        return;
      }
      await route.fulfill({
        status: 401,
        headers: corsHeaders(route.request().headers()['origin']),
        body: JSON.stringify({ message: 'Unauthenticated.' }),
      });
    });

    await page.reload();
    await expect(page).toHaveURL(/auth\/login/, { timeout: 15_000 });
  });
});

test.describe('QA — Warehouse desde sesión', () => {
  test('active_warehouse_id spoofed se descarta para usuario regular', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('active_warehouse_id', '9999');
    });

    await setupAuthMocks(page);
    await login(page);

    const warehouseInStorage = await page.evaluate(() =>
      localStorage.getItem('active_warehouse_id'),
    );

    expect(warehouseInStorage).not.toBe('9999');
  });
});

test.describe('QA — Listado productos', () => {
  test('carga lista con permiso product.getAll (mock)', async ({ page }) => {
    const userWithProducts = {
      ...MOCK_VENDEDORA,
      permissions: [...MOCK_VENDEDORA.permissions, 'product.getAll'],
    };

    await setupAuthMocks(page, userWithProducts);

    await page.route('**/api/products**', async (route) => {
      if (await fulfillPreflight(route)) return;
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders(route.request().headers()['origin']),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [
            {
              id: 1,
              name: 'Producto E2E',
              sku: 'E2E-001',
              barcode: 'E2E-001',
              stock: 5,
              gender: 'Unisex',
            },
          ],
          paginate: { total: 1, pages: 1 },
        }),
      });
    });

    await page.route('**/api/genders**', async (route) => {
      if (await fulfillPreflight(route)) return;
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders(route.request().headers()['origin']),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: [] }),
      });
    });

    await login(page);
    await page.goto('/inventories/products', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/inventories\/products/);
    await expect(page.getByRole('heading', { name: 'Productos', level: 1 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Producto E2E')).toBeVisible({ timeout: 10_000 });
  });
});

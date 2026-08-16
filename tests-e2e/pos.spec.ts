import { expect, test, type Page, type Route } from '@playwright/test';
import {
  E2E_PASSWORD,
  E2E_USERNAME,
  corsHeaders,
  fillLoginForm,
  fulfillPreflight,
  MOCK_VENDEDORA,
  setupAuthMocks,
} from './helpers/auth-mocks';

const E2E_POS_SKU = process.env.E2E_POS_SKU ?? 'TEST-SKU-001';

async function scanBarcode(page: Page, sku: string): Promise<void> {
  const scannerInput = page.getByLabel('Escáner de código de barras');
  await scannerInput.fill(sku);
  await scannerInput.press('Enter');
}

const MOCK_PRODUCT = {
  id: '101',
  sku: E2E_POS_SKU,
  name: 'Polo Maritex E2E',
  basePrice: 49.9,
  variants: {
    M: [
      {
        product_size_id: 1001,
        color_id: 2001,
        colorName: 'Azul Marino',
        hex: '#1e3a8a',
        price: 49.9,
        sku: E2E_POS_SKU,
        inventory: { available_quantity: 10, warehouse_id: 1 },
      },
    ],
  },
};

async function setupPosApiMocks(page: Page): Promise<void> {
  if (process.env.E2E_USE_REAL_API === 'true') {
    return;
  }

  await setupAuthMocks(page);

  await page.route('**/api/pos/products**', async (route) => {
    if (await fulfillPreflight(route)) return;

    const url = new URL(route.request().url());
    const sku = url.searchParams.get('sku');

    if (sku === E2E_POS_SKU) {
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders(route.request().headers()['origin']),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(MOCK_PRODUCT),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      headers: {
        ...corsHeaders(route.request().headers()['origin']),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'Producto no encontrado' }),
    });
  });

  await page.route('**/api/pos/checkout', async (route) => {
    if (await fulfillPreflight(route)) return;

    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders(route.request().headers()['origin']),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        sale_id: 'E2E-0001',
        ticket_url: 'http://localhost:8000/api/pos/sales/E2E-0001/ticket',
        message: 'Venta registrada correctamente',
      }),
    });
  });

  await page.route('**/api/pos/sales/**/ticket**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/html' },
      body: '<html><body>Ticket E2E</body></html>',
    });
  });
}

async function readSessionFlag(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('authSession');
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw) as { isLoggedIn?: boolean };
      return parsed.isLoggedIn === true;
    } catch {
      return false;
    }
  });
}

test.describe('Flujo crítico POS — cajero (v2)', () => {
  test.beforeEach(async ({ page }) => {
    await setupPosApiMocks(page);
  });

  test('login → escaneo SKU → carrito → cobrar', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByTestId('login-username')).toBeVisible();

    await fillLoginForm(page);

    const loginResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/login') &&
        response.request().method() === 'POST',
    );

    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    const response = await loginResponse;

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`Login HTTP ${response.status()}: ${body}`);
    }

    await expect
      .poll(async () => readSessionFlag(page), { timeout: 5_000 })
      .toBe(true);

    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      timeout: 15_000,
    });

    await page.goto('/finances/pos');
    await expect(
      page.getByPlaceholder('Escanear o ingresar código de producto…'),
    ).toBeVisible();

    const scannerInput = page.getByLabel('Escáner de código de barras');
    const productSearch = page.waitForResponse(
      (response) =>
        response.url().includes('/api/pos/products') &&
        response.request().method() === 'GET',
    );

    await scanBarcode(page, E2E_POS_SKU);
    await productSearch;

    await expect(page.getByText(MOCK_PRODUCT.name)).toBeVisible({
      timeout: 10_000,
    });
    await page.getByText('Toca para agregar').first().click();
    await page.getByRole('button', { name: 'AGREGAR AL CARRITO' }).click();

    await expect(page.locator('.cart-item')).toHaveCount(1);
    await expect(page.locator('.cart-item')).toContainText(MOCK_PRODUCT.name);
    await expect(page.getByText(/Carrito \(1\)/)).toBeVisible();

    await page.getByRole('button', { name: 'COBRAR' }).scrollIntoViewIfNeeded();

    const checkoutResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/pos/checkout') &&
        response.request().method() === 'POST',
      { timeout: 30_000 },
    );

    await page.getByRole('button', { name: 'COBRAR' }).click();
    const checkout = await checkoutResponse;

    if (!checkout.ok()) {
      throw new Error(
        `Checkout HTTP ${checkout.status()}: ${await checkout.text()}`,
      );
    }

    const checkoutBody = (await checkout.json()) as {
      success?: boolean;
      sale_id?: string | number;
    };
    expect(checkoutBody.success).toBeTruthy();

    await expect(page.getByText('Carrito vacío')).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByTestId('pos-toast')).toContainText(/Venta #/, {
      timeout: 5_000,
    });
  });
});

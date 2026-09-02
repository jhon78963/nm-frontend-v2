import {
  StoreCategoryProductBanner,
  StoreCategoryProductLeftPanel,
  StoreCategoryProductRightPanel,
  StoreCategoryProductTab,
  StoreHomeCategoryProductsConfig,
} from '../models/store-home-category-products.model';

function adaptProductIds(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map((id) => String(id)) : [];
}

function adaptTab(raw: unknown): StoreCategoryProductTab {
  const item = raw as Record<string, unknown>;

  return {
    id: String(item['id'] ?? ''),
    name: String(item['name'] ?? ''),
    slug: String(item['slug'] ?? ''),
    productIds: adaptProductIds(item['productIds']),
  };
}

function adaptLeftPanel(raw: unknown): StoreCategoryProductLeftPanel {
  const item = raw as Record<string, unknown>;

  return {
    title: String(item['title'] ?? ''),
    status: item['status'] !== false,
    productIds: adaptProductIds(item['productIds']),
  };
}

function adaptBanner(raw: unknown): StoreCategoryProductBanner {
  const item = raw as Record<string, unknown>;

  return {
    status: item['status'] !== false,
    imageUrl: String(item['imageUrl'] ?? ''),
    href: String(item['href'] ?? ''),
    alt: String(item['alt'] ?? ''),
  };
}

function adaptRightPanel(raw: unknown): StoreCategoryProductRightPanel {
  const panel = raw as Record<string, unknown>;
  const productCategory = panel['productCategory'] as Record<string, unknown> | undefined;
  const tabs = Array.isArray(productCategory?.['tabs'])
    ? productCategory['tabs'].map(adaptTab)
    : [];

  return {
    productCategory: {
      title: String(productCategory?.['title'] ?? ''),
      status: productCategory?.['status'] !== false,
      tabs,
    },
    productBanner: adaptBanner(panel['productBanner']),
  };
}

export function adaptHomeCategoryProductsResponse(
  raw: unknown,
): StoreHomeCategoryProductsConfig {
  const data = raw as Record<string, unknown>;
  const section = data['section'] as Record<string, unknown> | null;

  if (!section) {
    return {
      status: true,
      leftPanel: { title: '', status: true, productIds: [] },
      rightPanel: {
        productCategory: { title: '', status: true, tabs: [] },
        productBanner: { status: false, imageUrl: '', href: '', alt: '' },
      },
    };
  }

  return {
    status: section['status'] !== false,
    leftPanel: adaptLeftPanel(section['leftPanel']),
    rightPanel: adaptRightPanel(section['rightPanel']),
  };
}

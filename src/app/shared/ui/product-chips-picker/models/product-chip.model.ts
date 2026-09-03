export interface ProductChipItem {
  id: string;
  name: string;
  barcode: string;
}

export function toProductChipItem(product: {
  id: string;
  name: string;
  barcode?: string | null;
}): ProductChipItem {
  return {
    id: product.id,
    name: product.name,
    barcode: product.barcode?.trim() ?? '',
  };
}

export function formatProductChipLabel(product: ProductChipItem): string {
  const code = product.barcode.trim();
  return code ? `${product.name} · ${code}` : product.name;
}

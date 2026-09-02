import {
  StoreHomeServiceItem,
  StoreHomeServicesConfig,
} from '../models/store-home-services.model';

function adaptServiceItem(raw: unknown): StoreHomeServiceItem {
  const item = raw as Record<string, unknown>;

  return {
    id: typeof item['id'] === 'string' ? item['id'] : undefined,
    imageUrl: String(item['imageUrl'] ?? ''),
    title: String(item['title'] ?? ''),
    description: String(item['description'] ?? ''),
    status: item['status'] !== false,
    order: Number(item['order'] ?? 0),
  };
}

export function adaptHomeServicesResponse(raw: unknown): StoreHomeServicesConfig {
  const data = raw as Record<string, unknown>;
  const servicesBlock = data['services'] as Record<string, unknown> | null;

  if (!servicesBlock) {
    return { status: true, services: [] };
  }

  const services = Array.isArray(servicesBlock['services'])
    ? servicesBlock['services'].map(adaptServiceItem)
    : [];

  return {
    status: servicesBlock['status'] !== false,
    services: [...services].sort((a, b) => a.order - b.order),
  };
}

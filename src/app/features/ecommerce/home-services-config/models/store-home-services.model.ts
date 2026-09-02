export interface StoreHomeServiceItem {
  id?: string;
  imageUrl: string;
  title: string;
  description: string;
  status: boolean;
  order: number;
}

export interface StoreHomeServicesConfig {
  status: boolean;
  services: StoreHomeServiceItem[];
}

export interface StoreHomeServicesFormModel {
  status: boolean;
  services: StoreHomeServiceItem[];
}

export interface StoreHomeServicesPayload {
  status: boolean;
  services: Array<{
    id?: string;
    imageUrl: string;
    title: string;
    description: string;
    status?: boolean;
    order: number;
  }>;
}

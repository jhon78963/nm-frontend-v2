export interface SocialLinks {
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
}

export interface TenantSetting {
  ruc?: string | null;
  legalName?: string | null;
  tradeName?: string | null;
  address?: string | null;
  district?: string | null;
  province?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  socialLinks?: SocialLinks;
  logoUrl?: string | null;
  ticketFooterNote?: string | null;
}

export interface Tenant {
  id: number;
  name: string;
  isActive: boolean;
  setting?: TenantSetting | null;
}

export interface TenantListResponse {
  data: Tenant[];
  paginate: { total: number; pages: number };
}

export interface TenantPayload {
  name: string;
  isActive?: boolean;
}

export interface TenantSettingPayload {
  ruc?: string | null;
  legalName?: string | null;
  tradeName?: string | null;
  address?: string | null;
  district?: string | null;
  province?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  socialLinks?: SocialLinks;
  logoUrl?: string | null;
  ticketFooterNote?: string | null;
}

export interface TenantFormModel {
  name: string;
  ruc: string;
  legalName: string;
  tradeName: string;
  address: string;
  district: string;
  province: string;
  department: string;
  phone: string;
  email: string;
  website: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  logoUrl: string;
  ticketFooterNote: string;
}

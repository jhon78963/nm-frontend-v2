import {
  SocialLinks,
  Tenant,
  TenantListResponse,
  TenantSetting,
} from '../models/tenant.model';

function adaptSocialLinks(raw: unknown): SocialLinks {
  const links = (raw ?? {}) as SocialLinks;
  return {
    facebook: links.facebook ?? null,
    instagram: links.instagram ?? null,
    tiktok: links.tiktok ?? null,
  };
}

export function adaptTenantSetting(raw: unknown): TenantSetting {
  const r = raw as TenantSetting;
  return {
    ruc: r.ruc ?? null,
    legalName: r.legalName ?? null,
    tradeName: r.tradeName ?? null,
    address: r.address ?? null,
    district: r.district ?? null,
    province: r.province ?? null,
    department: r.department ?? null,
    phone: r.phone ?? null,
    email: r.email ?? null,
    website: r.website ?? null,
    socialLinks: adaptSocialLinks(r.socialLinks),
    logoUrl: r.logoUrl ?? null,
    ticketFooterNote: r.ticketFooterNote ?? null,
    electronicInvoicingEnabled: r.electronicInvoicingEnabled ?? false,
  };
}

export function adaptTenant(raw: unknown): Tenant {
  const r = raw as Tenant & { setting?: unknown };
  return {
    id: r.id,
    name: r.name,
    isActive: r.isActive ?? true,
    setting: r.setting ? adaptTenantSetting(r.setting) : null,
  };
}

export function adaptTenantList(raw: unknown): TenantListResponse {
  const r = raw as {
    data: unknown[];
    paginate: { total: number; pages: number };
  };

  return {
    data: r.data.map(adaptTenant),
    paginate: { total: r.paginate.total, pages: r.paginate.pages },
  };
}

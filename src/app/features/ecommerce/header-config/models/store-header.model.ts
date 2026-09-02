export interface StoreNavigationItem {
  id?: string;
  label: string;
  href: string;
  order: number;
  isActive: boolean;
  parentId?: string | null;
}

export interface StoreHeaderConfig {
  id: string | null;
  topbarMessage: string | null;
  supportPhone: string | null;
  logoText: string;
  logoUrl: string | null;
  topBarEnabled: boolean;
  stickyEnabled: boolean;
  navigationItems: StoreNavigationItem[];
}

export interface StoreHeaderFormModel {
  topbarMessage: string;
  supportPhone: string;
  logoText: string;
  logoUrl: string;
  topBarEnabled: boolean;
  stickyEnabled: boolean;
  navigationItems: StoreNavigationItem[];
}

export type StoreHeaderPayload = {
  topbarMessage?: string | null;
  supportPhone?: string | null;
  logoText: string;
  logoUrl?: string | null;
  topBarEnabled?: boolean;
  stickyEnabled?: boolean;
  navigationItems?: Array<{
    id?: string;
    label: string;
    href: string;
    order: number;
    isActive?: boolean;
    parentId?: string | null;
  }>;
};

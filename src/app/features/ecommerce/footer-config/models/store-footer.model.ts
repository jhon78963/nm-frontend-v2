export interface StoreFooterLinkItem {
  id?: string;
  name: string;
  href: string;
}

export interface StoreFooterConfig {
  newsletterTitle: string;
  newsletterSubtitle: string;
  aboutText: string;
  address: string;
  supportNumber: string;
  supportEmail: string;
  socialMediaEnabled: boolean;
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  pinterestUrl: string;
  tiktokUrl: string;
  categories: StoreFooterLinkItem[];
  usefulLinks: StoreFooterLinkItem[];
  helpCenterLinks: StoreFooterLinkItem[];
  copyrightEnabled: boolean;
  copyrightContent: string;
  paymentImageUrl: string;
}

export type StoreFooterFormModel = StoreFooterConfig;

export type StoreFooterPayload = StoreFooterConfig;

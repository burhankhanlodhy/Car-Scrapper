import type {
  CmsDetection,
  TechStack,
  CaptchaInfo,
  WafInfo,
  WebsiteIntel,
  SocialLinks,
  InventoryInfo,
} from './detection';

export type DealershipStatus = 'complete' | 'partial' | 'failed';

export interface DealershipPhones {
  main: string | null;
  sales: string | null;
  service: string | null;
  parts: string | null;
}

export interface Dealership {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  phones: DealershipPhones;
  emails: string[];
  hours: string | null;
  googleMapsUrl: string | null;
  googlePlaceId: string | null;
  parentGroup: string | null;
  website: WebsiteIntel;
  cms: CmsDetection;
  techStack: TechStack;
  captcha: CaptchaInfo;
  waf: WafInfo;
  inventory: InventoryInfo;
  social: SocialLinks;
  status: DealershipStatus;
  lastScrapedAt: number;
  scrapeDurationMs: number;
  sourceUrls: string[];
  discoveredVia: string;
}

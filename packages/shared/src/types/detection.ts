export type CmsPlatform =
  | 'wordpress'
  | 'drupal'
  | 'joomla'
  | 'squarespace'
  | 'wix'
  | 'webflow'
  | 'shopify'
  | 'dealer.com'
  | 'dealersocket'
  | 'cdk-global'
  | 'dealer-inspire'
  | 'elead'
  | 'dealerfire'
  | 'sincro'
  | 'podium'
  | 'custom'
  | 'unknown';

export interface CmsDetection {
  platform: CmsPlatform;
  confidence: 'high' | 'medium' | 'low';
  signals: string[];
}

export type FrontendFramework = 'react' | 'vue' | 'angular' | 'jquery' | 'svelte' | 'nextjs' | 'nuxt';
export type AnalyticsPlatform = 'ga4' | 'ua' | 'segment' | 'heap' | 'hotjar' | 'mixpanel' | 'amplitude' | 'klaviyo';
export type TagManager = 'gtm' | 'tealium' | 'adobe-dtm';
export type ChatWidget = 'intercom' | 'drift' | 'liveperson' | 'carnow' | 'podium' | 'gubagoo' | 'activengage' | 'dealer-com-chat' | 'talkdesk' | 'tidio' | 'zendesk';
export type CrmHint = 'vinsolutions' | 'dealersocket-crm' | 'elead-crm' | 'tekion' | 'dealertrack';
export type CdnProvider = 'cloudflare' | 'fastly' | 'akamai' | 'cloudfront' | 'bunny' | 'azure-cdn' | 'google-cloud-cdn';
export type AdPixel = 'facebook' | 'tiktok' | 'linkedin' | 'google-ads' | 'pinterest' | 'snapchat';

export interface TechStack {
  frontend: FrontendFramework[];
  analytics: AnalyticsPlatform[];
  tagManagers: TagManager[];
  chatWidgets: ChatWidget[];
  crm: CrmHint[];
  cdn: CdnProvider | null;
  hosting: string | null;
  adPixels: AdPixel[];
}

export type CaptchaType = 'recaptcha-v2' | 'recaptcha-v3' | 'hcaptcha' | 'cloudflare-turnstile' | 'arkose' | 'funcaptcha' | 'friendly-captcha';

export interface CaptchaInfo {
  types: CaptchaType[];
}

export type WafProvider =
  | 'cloudflare-waf'
  | 'cloudflare-bot-management'
  | 'imperva-incapsula'
  | 'datadome'
  | 'perimeterx'
  | 'akamai-bot-manager'
  | 'aws-waf'
  | 'sucuri';

export interface WafInfo {
  providers: WafProvider[];
  jsChallenge: boolean;
  rateLimited: boolean;
  honeypotDetected: boolean;
}

export interface WebsiteIntel {
  url: string;
  subdomains: string[];
  ssl: {
    valid: boolean;
    expiresAt: string | null;
    issuer: string | null;
  } | null;
  redirectChain: string[];
  loadTimeMs: number | null;
  mobileResponsive: boolean | null;
  sitemapUrl: string | null;
  sitemapCount: number | null;
  robotsTxtPresent: boolean | null;
  robotsTxtDisallows: string[];
}

export interface SocialLinks {
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  youtube: string | null;
  tiktok: string | null;
  linkedin: string | null;
}

export interface InventoryInfo {
  vinsFound: string[];
  platform: string | null;
  iframeSources: string[];
  routes: {
    new: boolean | null;
    used: boolean | null;
    cpo: boolean | null;
    inventory: boolean | null;
  };
  vehicleCount: number | null;
}

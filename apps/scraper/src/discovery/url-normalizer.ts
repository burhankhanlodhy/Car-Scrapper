import * as url from 'url';

const UTM_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'msclkid', 'ref', 'referrer',
]);

export function normalizeDomain(rawUrl: string): string | null {
  try {
    const parsed = new url.URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    let hostname = parsed.hostname.toLowerCase();
    hostname = hostname.replace(/^www\./, '');
    if (!hostname || hostname.length < 4) return null;
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return null;
    return hostname;
  } catch {
    return null;
  }
}

export function normalizeUrl(rawUrl: string): string | null {
  try {
    const parsed = new url.URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    // Strip UTM and tracking params
    const cleanParams = new url.URLSearchParams();
    for (const [key, value] of parsed.searchParams) {
      if (!UTM_PARAMS.has(key.toLowerCase())) {
        cleanParams.set(key, value);
      }
    }
    parsed.search = cleanParams.toString() ? `?${cleanParams}` : '';
    // Strip trailing slash
    let href = parsed.href;
    if (href.endsWith('/') && parsed.pathname === '/') {
      href = href.slice(0, -1);
    }
    return href;
  } catch {
    return null;
  }
}

export function extractDomain(rawUrl: string): string | null {
  return normalizeDomain(rawUrl);
}

export function isDealershipUrl(rawUrl: string): boolean {
  const SKIP_DOMAINS = new Set([
    'cars.com', 'autotrader.com', 'carfax.com', 'carmax.com',
    'cargurus.com', 'dealerrater.com', 'yelp.com', 'yellowpages.com',
    'google.com', 'facebook.com', 'instagram.com', 'twitter.com',
    'linkedin.com', 'youtube.com', 'tiktok.com', 'pinterest.com',
    'craigslist.org', 'indeed.com', 'glassdoor.com', 'wikipedia.org',
    'edmunds.com', 'kbb.com', 'motortrend.com', 'caranddriver.com',
    'consumerreports.org', 'nada.com', 'manheim.com', 'adesa.com',
  ]);

  const domain = normalizeDomain(rawUrl);
  if (!domain) return false;

  for (const skip of SKIP_DOMAINS) {
    if (domain === skip || domain.endsWith(`.${skip}`)) return false;
  }

  return true;
}

export function buildDealershipId(rawUrl: string): string | null {
  const domain = normalizeDomain(rawUrl);
  if (!domain) return null;
  return domain.replace(/[^a-z0-9.-]/g, '_');
}

const seenDomains = new Set<string>();

export function isDuplicate(rawUrl: string): boolean {
  const domain = normalizeDomain(rawUrl);
  if (!domain) return true;
  if (seenDomains.has(domain)) return true;
  seenDomains.add(domain);
  return false;
}

export function clearSeenDomains(): void {
  seenDomains.clear();
}

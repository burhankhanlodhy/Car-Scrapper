import * as cheerio from 'cheerio';
import type { DealershipPhones } from '@dealership-scraper/shared';

const PHONE_REGEX = /(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const PHONE_LABEL_PATTERNS: Record<keyof DealershipPhones, RegExp[]> = {
  main: [/main/i, /general/i, /office/i, /dealership/i, /^phone/i],
  sales: [/sales/i, /new car/i, /buy/i, /purchase/i],
  service: [/service/i, /repair/i, /maintenance/i, /parts & service/i],
  parts: [/parts/i, /accessories/i],
};

function classifyPhone(label: string): keyof DealershipPhones {
  for (const [key, patterns] of Object.entries(PHONE_LABEL_PATTERNS)) {
    if (patterns.some(p => p.test(label))) return key as keyof DealershipPhones;
  }
  return 'main';
}

function extractPhones(html: string, $: cheerio.CheerioAPI): DealershipPhones {
  const phones: DealershipPhones = { main: null, sales: null, service: null, parts: null };
  const found = new Set<string>();

  // Schema.org structured data
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() ?? '');
      const entries = Array.isArray(json) ? json : [json];
      for (const entry of entries) {
        if (entry.telephone) {
          const phone = entry.telephone.replace(/[^\d+]/g, '');
          if (!found.has(phone) && phone.length >= 10) {
            found.add(phone);
            phones.main ??= entry.telephone;
          }
        }
      }
    } catch { /* ignore */ }
  });

  // Tel links
  $('a[href^="tel:"]').each((_, el) => {
    const raw = $(el).attr('href')?.replace('tel:', '') ?? '';
    const label = $(el).closest('[class*="phone"], [class*="contact"], li, p').prev().text()
      || $(el).parent().text();
    const digits = raw.replace(/[^\d]/g, '');
    if (digits.length < 10 || found.has(digits)) return;
    found.add(digits);

    const category = classifyPhone(label);
    phones[category] ??= raw.trim();
  });

  // Phone numbers in text
  const textMatches = html.match(PHONE_REGEX) ?? [];
  for (const match of textMatches) {
    const digits = match.replace(/[^\d]/g, '');
    if (digits.length < 10 || found.has(digits)) continue;
    found.add(digits);
    phones.main ??= match.trim();
  }

  return phones;
}

function extractEmails(html: string, $: cheerio.CheerioAPI): string[] {
  const emails = new Set<string>();

  $('a[href^="mailto:"]').each((_, el) => {
    const email = $(el).attr('href')?.replace('mailto:', '').split('?')[0].toLowerCase().trim();
    if (email && email.includes('@')) emails.add(email);
  });

  const matches = html.match(EMAIL_REGEX) ?? [];
  for (const email of matches) {
    const lower = email.toLowerCase();
    if (!lower.includes('example.com') && !lower.includes('youremail') && lower.includes('@')) {
      emails.add(lower);
    }
  }

  return [...emails].slice(0, 10);
}

function extractName($: cheerio.CheerioAPI, url: string): string | null {
  // Try structured data first
  let name: string | null = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (name) return;
    try {
      const json = JSON.parse($(el).html() ?? '');
      const entries = Array.isArray(json) ? json : [json];
      for (const entry of entries) {
        if (entry['@type'] && /dealership|autodealer|localbusiness/i.test(entry['@type'])) {
          if (entry.name) { name = entry.name; break; }
        }
      }
    } catch { /* ignore */ }
  });

  if (!name) name = $('meta[property="og:site_name"]').attr('content') ?? null;
  if (!name) name = $('h1').first().text().trim() || null;
  if (!name) {
    const title = $('title').text().trim();
    name = title.split(/[-|–:|,]/)[0].trim() || null;
  }

  return name && name.length > 2 ? name.slice(0, 120) : null;
}

function extractAddress($: cheerio.CheerioAPI): {
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
} {
  const empty: { address: string | null; city: string | null; state: string | null; zip: string | null; country: string | null } = {
    address: null, city: null, state: null, zip: null, country: null,
  };

  // Schema.org
  let result = { ...empty };
  $('script[type="application/ld+json"]').each((_, el) => {
    if (result.address) return;
    try {
      const json = JSON.parse($(el).html() ?? '');
      const entries = Array.isArray(json) ? json : [json];
      for (const entry of entries) {
        const addr = entry.address;
        if (!addr) continue;
        result = {
          address: (addr.streetAddress as string | undefined) ?? null,
          city: (addr.addressLocality as string | undefined) ?? null,
          state: (addr.addressRegion as string | undefined) ?? null,
          zip: (addr.postalCode as string | undefined) ?? null,
          country: (addr.addressCountry as string | undefined) ?? 'US',
        };
        break;
      }
    } catch { /* ignore */ }
  });

  if (result.address) return result;

  // Microdata
  const streetEl = $('[itemprop="streetAddress"]').first();
  if (streetEl.length) {
    return {
      address: streetEl.text().trim() || null,
      city: $('[itemprop="addressLocality"]').first().text().trim() || null,
      state: $('[itemprop="addressRegion"]').first().text().trim() || null,
      zip: $('[itemprop="postalCode"]').first().text().trim() || null,
      country: $('[itemprop="addressCountry"]').first().text().trim() || 'US',
    };
  }

  // ZIP code from text
  const zipMatch = $('body').text().match(/\b\d{5}(?:-\d{4})?\b/);
  if (zipMatch) {
    result.zip = zipMatch[0];
  }

  return result;
}

function extractHours($: cheerio.CheerioAPI): string | null {
  // Schema.org openingHours
  let hours: string | null = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (hours) return;
    try {
      const json = JSON.parse($(el).html() ?? '');
      const entries = Array.isArray(json) ? json : [json];
      for (const entry of entries) {
        if (entry.openingHours) {
          hours = Array.isArray(entry.openingHours)
            ? entry.openingHours.join(', ')
            : String(entry.openingHours);
          break;
        }
      }
    } catch { /* ignore */ }
  });

  if (!hours) {
    const hoursEl = $('[itemprop="openingHours"], [class*="hours"], [class*="Hours"]').first();
    if (hoursEl.length) hours = hoursEl.text().replace(/\s+/g, ' ').trim().slice(0, 500);
  }

  return hours;
}

function extractParentGroup($: cheerio.CheerioAPI, html: string): string | null {
  const DEALER_GROUPS = [
    'AutoNation', 'Penske', 'Lithia', 'Hendrick', 'Group 1', 'Sonic',
    'Asbury', 'Ken Garff', 'Berkshire Hathaway Automotive', 'David Wilson',
    'Holman', 'Greenway', 'Larry H. Miller', 'Serra', 'AMSI',
    'First Automotive', 'Russ Darrow', 'Rosenthal', 'Lustine',
    'JM Family', 'Rick Case', 'Parks Auto Group', 'Pohanka',
  ];

  for (const group of DEALER_GROUPS) {
    if (html.includes(group)) return group;
  }

  // Logo text or copyright
  const copyright = $('footer').text();
  const copyrightMatch = copyright.match(/©\s*\d{4}\s+([A-Z][A-Za-z\s,]+(?:Auto|Motors|Group|Automotive))/);
  if (copyrightMatch) return copyrightMatch[1].trim().slice(0, 80);

  return null;
}

export interface BusinessInfo {
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  phones: DealershipPhones;
  emails: string[];
  hours: string | null;
  parentGroup: string | null;
}

export function extractBusinessInfo(html: string, url: string): BusinessInfo {
  const $ = cheerio.load(html);

  const { address, city, state, zip, country } = extractAddress($);

  return {
    name: extractName($, url),
    address,
    city,
    state,
    zip,
    country,
    phones: extractPhones(html, $),
    emails: extractEmails(html, $),
    hours: extractHours($),
    parentGroup: extractParentGroup($, html),
  };
}

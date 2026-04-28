import * as cheerio from 'cheerio';
import { fetchPage } from '../http/client';
import { normalizeDomain, isDealershipUrl } from './url-normalizer';
import { sleep } from '../http/retry';
import type { DiscoveredUrl } from './google-cse';

type DiscoveredCallback = (url: DiscoveredUrl) => void;

async function scrapePaginatedDirectory(
  startUrls: string[],
  extractLinks: (html: string, baseUrl: string) => string[],
  getNextPage: (html: string, currentUrl: string) => string | null,
  source: string,
  discovered: Set<string>,
  onDiscovered: DiscoveredCallback,
  maxPages = 20
): Promise<void> {
  for (const startUrl of startUrls) {
    let url: string | null = startUrl;
    let page = 0;

    while (url && page < maxPages) {
      const result = await fetchPage(url);
      await sleep(600);

      if (!result.html) break;

      const links = extractLinks(result.html, url);
      for (const link of links) {
        const domain = normalizeDomain(link);
        if (!domain || discovered.has(domain)) continue;
        if (!isDealershipUrl(link)) continue;
        discovered.add(domain);
        onDiscovered({ url: link, domain, source });
      }

      url = getNextPage(result.html, url);
      page++;
    }
  }
}

export async function scrapeCarscom(onDiscovered: DiscoveredCallback): Promise<void> {
  const states = ['TX', 'CA', 'FL', 'NY', 'OH', 'IL', 'PA', 'GA', 'NC', 'MI'];
  const startUrls = states.map(s => `https://www.cars.com/dealers/?dealer_type=franchised&zip=&state=${s}`);
  const discovered = new Set<string>();

  await scrapePaginatedDirectory(
    startUrls,
    (html) => {
      const $ = cheerio.load(html);
      const links: string[] = [];
      $('a[data-linkname="dealer-website"], a.dealer-website, .dealer-name a, [class*="dealer"] a[href*="://"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.startsWith('http') && !href.includes('cars.com')) {
          links.push(href);
        }
      });
      return links;
    },
    (html, currentUrl) => {
      const $ = cheerio.load(html);
      const next = $('a[rel="next"], a.pagination-next, a:contains("Next")').first().attr('href');
      if (!next) return null;
      return next.startsWith('http') ? next : `https://www.cars.com${next}`;
    },
    'cars.com',
    discovered,
    onDiscovered
  );
}

export async function scrapeAutotrader(onDiscovered: DiscoveredCallback): Promise<void> {
  const cities = [
    { city: 'Houston', state: 'TX' }, { city: 'Los Angeles', state: 'CA' },
    { city: 'Chicago', state: 'IL' }, { city: 'Phoenix', state: 'AZ' },
    { city: 'Dallas', state: 'TX' }, { city: 'Atlanta', state: 'GA' },
    { city: 'Miami', state: 'FL' }, { city: 'Denver', state: 'CO' },
    { city: 'Seattle', state: 'WA' }, { city: 'Nashville', state: 'TN' },
  ];

  for (const { city, state } of cities) {
    const url = `https://www.autotrader.com/car-dealers/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}`;
    const result = await fetchPage(url);
    await sleep(800);

    if (!result.html) continue;

    const $ = cheerio.load(result.html);
    $('a[href*="://"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || href.includes('autotrader.com')) return;
      const domain = normalizeDomain(href);
      if (!domain || !isDealershipUrl(href)) return;
      onDiscovered({ url: href, domain, source: 'autotrader' });
    });
  }
}

export async function scrapeDealerRater(onDiscovered: DiscoveredCallback): Promise<void> {
  const startUrls = [
    'https://www.dealerrater.com/dealer-reviews/',
    'https://www.dealerrater.com/best-car-dealers/',
  ];
  const discovered = new Set<string>();

  for (const startUrl of startUrls) {
    for (let page = 1; page <= 10; page++) {
      const url = page === 1 ? startUrl : `${startUrl}page${page}/`;
      const result = await fetchPage(url);
      await sleep(700);

      if (!result.html) continue;

      const $ = cheerio.load(result.html);
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') ?? '';
        if (href.includes('dealerrater.com') || !href.startsWith('http')) return;
        const domain = normalizeDomain(href);
        if (!domain || discovered.has(domain) || !isDealershipUrl(href)) return;
        discovered.add(domain);
        onDiscovered({ url: href, domain, source: 'dealerrater' });
      });
    }
  }
}

export async function scrapeCarGurus(onDiscovered: DiscoveredCallback): Promise<void> {
  const stateUrls = [
    'https://www.cargurus.com/Cars/dealer/d#listing=y&zip=77001&distance=50',
    'https://www.cargurus.com/Cars/dealer/d#listing=y&zip=90001&distance=50',
    'https://www.cargurus.com/Cars/dealer/d#listing=y&zip=60601&distance=50',
  ];

  for (const startUrl of stateUrls) {
    const result = await fetchPage(startUrl);
    await sleep(600);

    if (!result.html) continue;

    const $ = cheerio.load(result.html);
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') ?? '';
      if (href.includes('cargurus.com') || !href.startsWith('http')) return;
      const domain = normalizeDomain(href);
      if (!domain || !isDealershipUrl(href)) return;
      onDiscovered({ url: href, domain, source: 'cargurus' });
    });
  }
}

export async function scrapeYelp(onDiscovered: DiscoveredCallback): Promise<void> {
  const cities = ['New+York', 'Los+Angeles', 'Chicago', 'Houston', 'Phoenix'];

  for (const city of cities) {
    const url = `https://www.yelp.com/search?find_desc=car+dealerships&find_loc=${city}`;
    const result = await fetchPage(url);
    await sleep(900);

    if (!result.html) continue;

    const $ = cheerio.load(result.html);
    $('a[href*="biz_website"]').each((_, el) => {
      const href = $(el).attr('href') ?? '';
      const domain = normalizeDomain(href);
      if (!domain || !isDealershipUrl(href)) return;
      onDiscovered({ url: href, domain, source: 'yelp' });
    });

    $('span[class*="businessName"] a, .businessName a').each((_, el) => {
      const bizPath = $(el).attr('href');
      if (bizPath?.startsWith('/biz/')) {
        // Queue the biz page for deeper extraction
      }
    });
  }
}

export async function scrapeYellowPages(onDiscovered: DiscoveredCallback): Promise<void> {
  const searches = [
    'https://www.yellowpages.com/search?search_terms=car+dealers&geo_location_terms=United+States',
    'https://www.yellowpages.com/search?search_terms=auto+dealers&geo_location_terms=Texas',
    'https://www.yellowpages.com/search?search_terms=car+dealerships&geo_location_terms=California',
  ];

  for (const url of searches) {
    const result = await fetchPage(url);
    await sleep(700);

    if (!result.html) continue;

    const $ = cheerio.load(result.html);
    $('a.track-visit-website, a[class*="website"]').each((_, el) => {
      const href = $(el).attr('href') ?? '';
      if (!href.startsWith('http') || href.includes('yellowpages.com')) return;
      const domain = normalizeDomain(href);
      if (!domain || !isDealershipUrl(href)) return;
      onDiscovered({ url: href, domain, source: 'yellowpages' });
    });
  }
}

export async function scrapeAllDirectories(
  onDiscovered: DiscoveredCallback
): Promise<void> {
  console.log('[directories] Scraping Cars.com...');
  await scrapeCarscom(onDiscovered);

  console.log('[directories] Scraping Autotrader...');
  await scrapeAutotrader(onDiscovered);

  console.log('[directories] Scraping DealerRater...');
  await scrapeDealerRater(onDiscovered);

  console.log('[directories] Scraping CarGurus...');
  await scrapeCarGurus(onDiscovered);

  console.log('[directories] Scraping Yelp...');
  await scrapeYelp(onDiscovered);

  console.log('[directories] Scraping YellowPages...');
  await scrapeYellowPages(onDiscovered);
}

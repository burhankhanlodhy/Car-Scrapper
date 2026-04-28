import { TOP_300_CITIES } from '@dealership-scraper/shared';
import { discoverViaGoogleCSE } from './google-cse';
import { discoverViaMaps } from './google-maps';
import { scrapeAllDirectories } from './directory-scrapers';
import { enqueueDiscoveryUrls } from '../firebase/queue';
import { isDuplicate, normalizeDomain } from './url-normalizer';
import type { DiscoveredUrl } from './google-cse';

export interface DiscoveryOptions {
  states: string[];
  cities: string[];
  brands: string[];
  limit: number;
}

export async function runDiscovery(opts: DiscoveryOptions): Promise<void> {
  const { states, brands, limit } = opts;
  const targetCities = opts.cities.length
    ? TOP_300_CITIES.filter(c => opts.cities.includes(c.city))
    : TOP_300_CITIES;

  const buffer: DiscoveredUrl[] = [];
  let totalDiscovered = 0;

  function onDiscovered(url: DiscoveredUrl) {
    const domain = normalizeDomain(url.url);
    if (!domain) return;
    if (isDuplicate(url.url)) return;

    buffer.push(url);
    totalDiscovered++;

    if (buffer.length >= 50) {
      const batch = buffer.splice(0, 50);
      enqueueDiscoveryUrls(batch).catch(err =>
        console.error('[discovery] Firestore enqueue error:', err)
      );
    }
  }

  console.log(`[discovery] Starting — states: ${states.length || 'all'}, cities: ${targetCities.length}, brands: ${brands.length || 'default'}`);

  // Run all discovery sources
  const [cseCount, mapsCount] = await Promise.all([
    discoverViaGoogleCSE(states, targetCities, brands, onDiscovered, Math.floor(limit * 0.4)),
    discoverViaMaps(targetCities, states, (url, placeId, address) => onDiscovered(url), Math.floor(limit * 0.2)),
  ]);

  console.log(`[discovery] Google CSE: ${cseCount} URLs, Maps: ${mapsCount} URLs`);

  console.log('[discovery] Scraping dealer directories...');
  await scrapeAllDirectories(onDiscovered);

  // Flush remaining buffer
  if (buffer.length > 0) {
    await enqueueDiscoveryUrls(buffer);
  }

  console.log(`[discovery] Complete — ${totalDiscovered} unique URLs enqueued`);
}

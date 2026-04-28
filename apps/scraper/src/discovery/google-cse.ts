import axios from 'axios';
import { config } from '../config';
import { normalizeDomain, isDealershipUrl } from './url-normalizer';
import { CAR_BRANDS } from '@dealership-scraper/shared';
import { sleep } from '../http/retry';

const SERPAPI_BASE = 'https://serpapi.com/search.json';

export interface DiscoveredUrl {
  url: string;
  domain: string;
  source: string;
  title?: string;
}

interface SerpResult {
  link?: string;
  displayed_link?: string;
  title?: string;
}

interface SerpResponse {
  organic_results?: SerpResult[];
  error?: string;
  search_information?: { total_results?: number };
}

async function searchSerp(query: string): Promise<SerpResult[]> {
  const apiKey = config.serpApiKey;
  if (!apiKey) {
    console.warn('[serp] SERP_API_KEY not set — skipping search discovery');
    return [];
  }

  try {
    const response = await axios.get<SerpResponse>(SERPAPI_BASE, {
      params: {
        api_key: apiKey,
        q: query,
        num: 10,
        engine: 'google',
        gl: 'us',
        hl: 'en',
      },
      timeout: 15_000,
    });

    if (response.data.error) {
      const err = response.data.error;
      if (err.includes('Invalid API key')) {
        console.error('[serp] ❌ Invalid API key — get yours at serpapi.com');
        throw new Error(`SerpAPI auth error: ${err}`);
      }
      if (err.includes('out of searches')) {
        console.warn('[serp] ⚠️  Monthly search limit reached — upgrade at serpapi.com/manage-api-key');
        return [];
      }
      console.warn(`[serp] API error for "${query}": ${err}`);
      return [];
    }

    return response.data.organic_results ?? [];
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const msg = (err.response?.data as { error?: string })?.error ?? err.message;
      if (status === 401 || status === 403) {
        console.error(`[serp] ❌ Auth failed (${status}): ${msg}`);
        throw new Error(`SerpAPI auth: ${msg}`);
      }
      console.warn(`[serp] Request failed (${status}): "${query}" — ${msg}`);
    } else {
      console.warn(`[serp] Query failed: "${query}" — ${err instanceof Error ? err.message : err}`);
    }
    return [];
  }
}

export async function discoverViaGoogleCSE(
  states: string[],
  cities: Array<{ city: string; state: string }>,
  brands: string[],
  onDiscovered: (url: DiscoveredUrl) => void,
  limit = 1000
): Promise<number> {
  const apiKey = config.serpApiKey;
  if (!apiKey) {
    console.warn('[serp] SERP_API_KEY not set — skipping search-based discovery');
    console.warn('[serp] Get a free key at serpapi.com and add SERP_API_KEY to .env');
    return 0;
  }

  const targetBrands = brands.length ? brands : CAR_BRANDS.slice(0, 10);
  const discovered = new Set<string>();
  let count = 0;

  const queries: string[] = [];
  for (const brand of targetBrands) {
    for (const { city, state } of cities.slice(0, 30)) {
      if (states.length && !states.includes(state)) continue;
      queries.push(`${brand} dealership ${city} ${state}`);
    }
  }

  console.log(`[serp] Running ${queries.length} search queries...`);

  for (const query of queries) {
    if (count >= limit) break;

    let results: SerpResult[];
    try {
      results = await searchSerp(query);
    } catch {
      console.error('[serp] Stopping search discovery due to fatal error');
      break;
    }

    await sleep(300);

    for (const result of results) {
      const link = result.link;
      if (!link) continue;

      const domain = normalizeDomain(link);
      if (!domain || discovered.has(domain)) continue;
      if (!isDealershipUrl(link)) continue;

      discovered.add(domain);
      onDiscovered({ url: link, domain, source: 'serpapi', title: result.title });
      count++;
      if (count >= limit) break;
    }
  }

  return count;
}

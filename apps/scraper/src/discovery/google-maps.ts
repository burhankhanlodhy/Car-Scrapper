import axios from 'axios';
import { config } from '../config';
import { normalizeDomain } from './url-normalizer';
import { sleep } from '../http/retry';
import type { DiscoveredUrl } from './google-cse';

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

interface PlaceResult {
  name?: string;
  website?: string;
  place_id?: string;
  formatted_address?: string;
  geometry?: { location: { lat: number; lng: number } };
}

interface PlacesSearchResponse {
  results?: PlaceResult[];
  next_page_token?: string;
  status?: string;
}

async function searchPlaces(
  query: string,
  pageToken?: string
): Promise<PlacesSearchResponse> {
  if (!config.googleMapsApiKey) return {};
  try {
    const params: Record<string, string> = {
      key: config.googleMapsApiKey,
      query,
      type: 'car_dealer',
    };
    if (pageToken) params.pagetoken = pageToken;

    const response = await axios.get<PlacesSearchResponse>(`${PLACES_BASE}/textsearch/json`, {
      params,
      timeout: 10_000,
    });
    return response.data;
  } catch (err) {
    console.warn(`[maps] Search failed for "${query}": ${err instanceof Error ? err.message : err}`);
    return {};
  }
}

export async function discoverViaMaps(
  cities: Array<{ city: string; state: string }>,
  states: string[],
  onDiscovered: (url: DiscoveredUrl, placeId: string, address: string) => void,
  limit = 500
): Promise<number> {
  if (!config.googleMapsApiKey) {
    console.warn('[maps] GOOGLE_MAPS_API_KEY not set, skipping Maps discovery');
    return 0;
  }

  const discovered = new Set<string>();
  let count = 0;

  for (const { city, state } of cities) {
    if (count >= limit) break;
    if (states.length && !states.includes(state)) continue;

    const queries = [
      `car dealership ${city} ${state}`,
      `auto dealer ${city} ${state}`,
    ];

    for (const query of queries) {
      if (count >= limit) break;

      const data = await searchPlaces(query);
      await sleep(300);

      for (const place of data.results ?? []) {
        const website = place.website;
        if (!website) continue;

        const domain = normalizeDomain(website);
        if (!domain || discovered.has(domain)) continue;

        discovered.add(domain);
        onDiscovered(
          { url: website, domain, source: 'google-maps', title: place.name },
          place.place_id ?? '',
          place.formatted_address ?? ''
        );

        count++;
        if (count >= limit) break;
      }
    }
  }

  return count;
}

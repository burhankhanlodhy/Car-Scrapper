import * as cheerio from 'cheerio';
import { fetchPage } from '../http/client';
import { normalizeDomain, normalizeUrl } from './url-normalizer';
import { sleep } from '../http/retry';

const TARGET_SUBPATHS = ['/about', '/contact', '/inventory', '/new', '/used', '/cpo', '/team', '/staff'];

export async function crawlSubpages(
  baseUrl: string,
  maxDepth = 2,
  onPageFound?: (url: string, html: string) => void
): Promise<Map<string, string>> {
  const baseDomain = normalizeDomain(baseUrl);
  if (!baseDomain) return new Map();

  const visited = new Set<string>();
  const htmlMap = new Map<string, string>();

  async function crawl(url: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;
    const normalized = normalizeUrl(url);
    if (!normalized || visited.has(normalized)) return;
    visited.add(normalized);

    const result = await fetchPage(url);
    await sleep(400);

    if (!result.html || result.error) return;

    htmlMap.set(url, result.html);
    onPageFound?.(url, result.html);

    if (depth >= maxDepth) return;

    const $ = cheerio.load(result.html);
    const links: string[] = [];

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      let absolute: string;
      try {
        absolute = new URL(href, url).href;
      } catch {
        return;
      }

      const linkDomain = normalizeDomain(absolute);
      if (linkDomain !== baseDomain) return;

      const path = new URL(absolute).pathname.toLowerCase();
      const isTargetPath = TARGET_SUBPATHS.some(t => path === t || path.startsWith(t + '/'));
      if (!isTargetPath) return;

      links.push(absolute);
    });

    for (const link of links.slice(0, 8)) {
      await crawl(link, depth + 1);
    }
  }

  await crawl(baseUrl, 0);

  // Proactively check known subpaths
  for (const subpath of TARGET_SUBPATHS) {
    const candidate = `https://${baseDomain}${subpath}`;
    if (!visited.has(candidate)) {
      const result = await fetchPage(candidate);
      await sleep(300);
      if (result.html && !result.error && result.statusCode < 400) {
        htmlMap.set(candidate, result.html);
        onPageFound?.(candidate, result.html);
      }
    }
  }

  return htmlMap;
}

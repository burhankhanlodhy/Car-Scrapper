import * as cheerio from 'cheerio';
import * as tls from 'tls';
import * as https from 'https';
import axios from 'axios';
import { getRandomUA } from '../http/user-agents';
import type { WebsiteIntel } from '@dealership-scraper/shared';

interface SslInfo {
  valid: boolean;
  expiresAt: string | null;
  issuer: string | null;
}

async function checkSsl(hostname: string): Promise<SslInfo> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname, rejectUnauthorized: false },
      () => {
        try {
          const cert = socket.getPeerCertificate();
          const valid = socket.authorized || true;
          const expiresAt = cert?.valid_to ? new Date(cert.valid_to).toISOString() : null;
          const issuerRaw = cert?.issuer?.O;
    const issuer = Array.isArray(issuerRaw) ? (issuerRaw[0] ?? null) : (issuerRaw ?? null);
          socket.destroy();
          resolve({ valid, expiresAt, issuer });
        } catch {
          socket.destroy();
          resolve({ valid: false, expiresAt: null, issuer: null });
        }
      }
    );
    socket.on('error', () => resolve({ valid: false, expiresAt: null, issuer: null }));
    socket.setTimeout(5000, () => { socket.destroy(); resolve({ valid: false, expiresAt: null, issuer: null }); });
  });
}

async function fetchSitemapCount(baseUrl: string): Promise<{ url: string | null; count: number | null }> {
  const sitemapUrls = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap.xml.gz`,
  ];

  for (const url of sitemapUrls) {
    try {
      const response = await axios.get<string>(url, {
        timeout: 5000,
        headers: { 'User-Agent': getRandomUA() },
        validateStatus: (s) => s < 400,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      });
      if (response.data) {
        const matches = (response.data as string).match(/<loc>/g) ?? [];
        return { url, count: matches.length };
      }
    } catch { /* try next */ }
  }

  return { url: null, count: null };
}

async function fetchRobotsTxt(baseUrl: string): Promise<{ present: boolean; disallows: string[] }> {
  try {
    const response = await axios.get<string>(`${baseUrl}/robots.txt`, {
      timeout: 5000,
      headers: { 'User-Agent': getRandomUA() },
      validateStatus: (s) => s < 400,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
    const text = response.data as string;
    const disallows = (text.match(/^Disallow:\s*(.+)$/gm) ?? [])
      .map(l => l.replace(/^Disallow:\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 20);
    return { present: true, disallows };
  } catch {
    return { present: false, disallows: [] };
  }
}

export async function extractWebsiteIntel(
  fetchResult: {
    finalUrl: string;
    html: string;
    headers: Record<string, string>;
    redirectChain: string[];
    loadTimeMs: number | null;
  },
  baseUrl: string
): Promise<WebsiteIntel> {
  const $ = cheerio.load(fetchResult.html);

  const origin = (() => {
    try {
      const u = new URL(fetchResult.finalUrl.startsWith('http') ? fetchResult.finalUrl : `https://${fetchResult.finalUrl}`);
      return `${u.protocol}//${u.hostname}`;
    } catch {
      return `https://${baseUrl}`;
    }
  })();

  const hostname = (() => {
    try {
      return new URL(origin).hostname;
    } catch {
      return baseUrl;
    }
  })();

  // Check for subdomains
  const subdomains: string[] = [];
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) {
    try {
      const sub = new URL(canonical).hostname;
      if (sub !== hostname && sub.endsWith(`.${hostname.replace(/^www\./, '')}`)) {
        subdomains.push(sub);
      }
    } catch { /* ignore */ }
  }

  const isMobileResponsive =
    $('meta[name="viewport"]').length > 0 &&
    ($('meta[name="viewport"]').attr('content') ?? '').includes('width=device-width');

  const [ssl, sitemap, robots] = await Promise.all([
    baseUrl.startsWith('https') || !baseUrl.startsWith('http')
      ? checkSsl(hostname)
      : Promise.resolve({ valid: false, expiresAt: null, issuer: null }),
    fetchSitemapCount(origin),
    fetchRobotsTxt(origin),
  ]);

  return {
    url: fetchResult.finalUrl,
    subdomains,
    ssl,
    redirectChain: fetchResult.redirectChain,
    loadTimeMs: fetchResult.loadTimeMs,
    mobileResponsive: isMobileResponsive,
    sitemapUrl: sitemap.url,
    sitemapCount: sitemap.count,
    robotsTxtPresent: robots.present,
    robotsTxtDisallows: robots.disallows,
  };
}

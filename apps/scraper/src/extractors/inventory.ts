import * as cheerio from 'cheerio';
import { headRequest } from '../http/client';
import type { InventoryInfo } from '@dealership-scraper/shared';

const VIN_REGEX = /\b[A-HJ-NPR-Z0-9]{17}\b/g;

const INVENTORY_PLATFORMS = [
  { name: 'vAuto', pattern: /vauto\.com|vauto-/i },
  { name: 'vInsolutions', pattern: /vinsolutions\.com/i },
  { name: 'DealerSocket', pattern: /dealersocket\.com|dsplatform\.com/i },
  { name: 'CDK Drive', pattern: /cdkdrive\.com|fortellis\.io/i },
  { name: 'Dealer.com', pattern: /dealer\.com\/inventory|coxauto/i },
  { name: 'Tekion', pattern: /tekion\.com/i },
  { name: 'Gubagoo', pattern: /gubagoo\.com/i },
  { name: 'CarNow', pattern: /carnow\.com/i },
  { name: 'Lotlinx', pattern: /lotlinx\.com/i },
  { name: 'DealerInspire', pattern: /dealerinspire\.com/i },
  { name: 'Dealer eProcess', pattern: /dealerepprocess\.com/i },
  { name: 'Edmunds', pattern: /tracking\.edmunds\.com/i },
];

function extractVins(html: string): string[] {
  const matches = html.match(VIN_REGEX) ?? [];
  const unique = [...new Set(matches)];
  // Basic VIN checksum: skip obvious non-VINs
  return unique.filter(vin => /[0-9]/.test(vin)).slice(0, 20);
}

function detectInventoryPlatform(html: string): string | null {
  for (const { name, pattern } of INVENTORY_PLATFORMS) {
    if (pattern.test(html)) return name;
  }
  return null;
}

function extractIframeSources($: cheerio.CheerioAPI): string[] {
  const sources: string[] = [];
  $('iframe[src]').each((_, el) => {
    const src = $( el).attr('src') ?? '';
    if (src && src.startsWith('http')) sources.push(src);
  });
  return [...new Set(sources)].slice(0, 10);
}

function estimateVehicleCount($: cheerio.CheerioAPI, html: string): number | null {
  // Look for patterns like "123 vehicles", "456 cars in stock"
  const patterns = [
    /(\d{1,4})\s*(?:new|used|certified|vehicles?|cars?|trucks?|SUVs?)\s*(?:in stock|available|found)/i,
    /(?:showing|view)\s*(?:all\s*)?(\d{1,4})\s*(?:vehicles?|results?)/i,
    /(\d{1,4})\s*(?:results?|vehicles?|listings?)\s*found/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > 0 && num < 10000) return num;
    }
  }

  // Count VIN occurrences as proxy
  const vins = html.match(VIN_REGEX);
  if (vins && vins.length >= 3) return vins.length;

  return null;
}

export async function extractInventoryInfo(
  html: string,
  baseUrl: string
): Promise<InventoryInfo> {
  const $ = cheerio.load(html);

  const vinsFound = extractVins(html);
  const platform = detectInventoryPlatform(html);
  const iframeSources = extractIframeSources($);
  const vehicleCount = estimateVehicleCount($, html);

  const origin = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`).origin;

  const [newRoute, usedRoute, cpoRoute, inventoryRoute] = await Promise.all([
    headRequest(`${origin}/new`),
    headRequest(`${origin}/used`),
    headRequest(`${origin}/cpo`),
    headRequest(`${origin}/inventory`),
  ]);

  return {
    vinsFound,
    platform,
    iframeSources,
    routes: {
      new: newRoute.exists,
      used: usedRoute.exists,
      cpo: cpoRoute.exists,
      inventory: inventoryRoute.exists,
    },
    vehicleCount,
  };
}

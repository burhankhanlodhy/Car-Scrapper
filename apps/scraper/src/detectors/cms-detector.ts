import * as cheerio from 'cheerio';
import type { CmsDetection, CmsPlatform } from '@dealership-scraper/shared';

interface Signal {
  type: 'script-src' | 'meta-generator' | 'js-global' | 'css-class' | 'header' | 'html-attr' | 'cookie' | 'comment';
  value: string;
}

interface PlatformFingerprint {
  platform: CmsPlatform;
  checks: Array<{
    test: (html: string, $: cheerio.CheerioAPI, headers: Record<string, string>) => string | null;
    weight: 'high' | 'medium' | 'low';
  }>;
}

const FINGERPRINTS: PlatformFingerprint[] = [
  {
    platform: 'wordpress',
    checks: [
      { test: (html, $) => (/wp-content\/|wp-includes\//i.test(html) ? 'wp-content path' : null), weight: 'high' },
      { test: (html, $) => ($('meta[name="generator"][content*="WordPress"]').length ? 'generator meta' : null), weight: 'high' },
      { test: (html) => (/window\.wpEmojiSettings|wpEmojiSettingsSupports/i.test(html) ? 'wpEmoji global' : null), weight: 'high' },
      { test: (html) => (/\/wp-json\/|\"wp-json\"/i.test(html) ? 'wp-json API' : null), weight: 'medium' },
    ],
  },
  {
    platform: 'drupal',
    checks: [
      { test: (html, $) => ($('meta[name="generator"][content*="Drupal"]').length ? 'generator meta' : null), weight: 'high' },
      { test: (html) => (/Drupal\.settings|drupal\.js|\/sites\/default\/files\//i.test(html) ? 'Drupal global' : null), weight: 'high' },
      { test: (html) => (/data-drupal-selector|class="drupal/i.test(html) ? 'drupal attrs' : null), weight: 'medium' },
    ],
  },
  {
    platform: 'joomla',
    checks: [
      { test: (html, $) => ($('meta[name="generator"][content*="Joomla"]').length ? 'generator meta' : null), weight: 'high' },
      { test: (html) => (/\/media\/jui\/|\/components\/com_/i.test(html) ? 'joomla paths' : null), weight: 'high' },
    ],
  },
  {
    platform: 'squarespace',
    checks: [
      { test: (html, $) => ($('meta[name="generator"][content*="Squarespace"]').length ? 'generator meta' : null), weight: 'high' },
      { test: (html) => (/static\.squarespace\.com/i.test(html) ? 'squarespace CDN' : null), weight: 'high' },
      { test: (html) => (/window\.Squarespace|Squarespace\.after/i.test(html) ? 'Squarespace global' : null), weight: 'high' },
    ],
  },
  {
    platform: 'wix',
    checks: [
      { test: (html, $, headers) => (headers['x-wix-published-version'] ? 'wix header' : null), weight: 'high' },
      { test: (html) => (/static\.wixstatic\.com|wix-code-/i.test(html) ? 'wixstatic CDN' : null), weight: 'high' },
      { test: (html, $) => ($('meta[name="generator"][content*="Wix.com"]').length ? 'generator meta' : null), weight: 'high' },
    ],
  },
  {
    platform: 'webflow',
    checks: [
      { test: (html) => (/webflow\.com|\.wf-/i.test(html) ? 'webflow pattern' : null), weight: 'high' },
      { test: (html, $) => ($('[data-wf-page], [data-wf-site]').length ? 'wf data attr' : null), weight: 'high' },
      { test: (html, $) => ($('meta[name="generator"][content*="Webflow"]').length ? 'generator meta' : null), weight: 'high' },
    ],
  },
  {
    platform: 'dealer.com',
    checks: [
      { test: (html) => (/dealer\.com|cdkdrive\.com|dealerdirect\.com/i.test(html) ? 'dealer.com domain' : null), weight: 'high' },
      { test: (html) => (/DealerSocket_dealer\.com|ox\.dealer\.com/i.test(html) ? 'dealer.com specific' : null), weight: 'high' },
      { test: (html, $) => ($('meta[name="generator"][content*="Dealer.com"]').length ? 'generator meta' : null), weight: 'high' },
      { test: (html) => (/window\.DDC\b|\"ddc\"|DDCAnalytics/i.test(html) ? 'DDC global' : null), weight: 'high' },
      { test: (html, $, headers) => (/dealer\.com/i.test(headers['x-powered-by'] ?? '') ? 'x-powered-by' : null), weight: 'medium' },
    ],
  },
  {
    platform: 'dealersocket',
    checks: [
      { test: (html) => (/dealersocket\.com|ds-platform\.com|dsp-cdn\.com/i.test(html) ? 'dealersocket domain' : null), weight: 'high' },
      { test: (html) => (/DealerSocket|dsplatform/i.test(html) ? 'dealersocket js' : null), weight: 'high' },
      { test: (html, $) => ($('meta[name="generator"][content*="DealerSocket"]').length ? 'generator meta' : null), weight: 'high' },
    ],
  },
  {
    platform: 'cdk-global',
    checks: [
      { test: (html) => (/cdk\.com|activant\.com|fortellis\.io/i.test(html) ? 'cdk domain' : null), weight: 'high' },
      { test: (html) => (/CDKGlobal|cdk\.digital|\"cdk\"/i.test(html) ? 'cdk js var' : null), weight: 'high' },
      { test: (html, $, headers) => (/cdk/i.test(headers['x-powered-by'] ?? '') ? 'x-powered-by' : null), weight: 'medium' },
    ],
  },
  {
    platform: 'dealer-inspire',
    checks: [
      { test: (html) => (/dealerinspire\.com|di-dms\.com|dealer-inspire/i.test(html) ? 'dealerinspire domain' : null), weight: 'high' },
      { test: (html) => (/d2ycjfkbfim9v5\.cloudfront\.net/i.test(html) ? 'DI cloudfront CDN' : null), weight: 'high' },
      { test: (html, $) => ($('meta[name="generator"][content*="Dealer Inspire"]').length ? 'generator meta' : null), weight: 'high' },
    ],
  },
  {
    platform: 'elead',
    checks: [
      { test: (html) => (/eleadcrm\.com|elead\.com|e-lead/i.test(html) ? 'elead domain' : null), weight: 'high' },
      { test: (html) => (/eLead\.|window\.elead/i.test(html) ? 'elead js' : null), weight: 'high' },
    ],
  },
  {
    platform: 'dealerfire',
    checks: [
      { test: (html) => (/dealerfire\.com/i.test(html) ? 'dealerfire domain' : null), weight: 'high' },
      { test: (html, $) => ($('meta[name="generator"][content*="DealerFire"]').length ? 'generator meta' : null), weight: 'high' },
    ],
  },
  {
    platform: 'sincro',
    checks: [
      { test: (html) => (/sincro\.com|streamlinedealer\.com|\"sincro\"/i.test(html) ? 'sincro domain' : null), weight: 'high' },
      { test: (html, $) => ($('meta[name="generator"][content*="Sincro"]').length ? 'generator meta' : null), weight: 'high' },
    ],
  },
  {
    platform: 'podium',
    checks: [
      { test: (html) => (/connect\.podium\.com|podium-webchat/i.test(html) ? 'podium domain' : null), weight: 'high' },
      { test: (html) => (/window\.podium|PodiumWebChat/i.test(html) ? 'podium js' : null), weight: 'high' },
    ],
  },
  {
    platform: 'shopify',
    checks: [
      { test: (html) => (/cdn\.shopify\.com|myshopify\.com/i.test(html) ? 'shopify CDN' : null), weight: 'high' },
      { test: (html, $) => ($('meta[name="shopify-checkout-api-token"]').length ? 'shopify meta' : null), weight: 'high' },
      { test: (html) => (/Shopify\.theme|window\.Shopify/i.test(html) ? 'shopify global' : null), weight: 'high' },
    ],
  },
];

export function detectCms(
  html: string,
  headers: Record<string, string>
): CmsDetection {
  const $ = cheerio.load(html);
  const scores: Map<CmsPlatform, { score: number; signals: string[] }> = new Map();

  for (const fp of FINGERPRINTS) {
    const signals: string[] = [];
    let score = 0;

    for (const check of fp.checks) {
      const signal = check.test(html, $, headers);
      if (signal) {
        signals.push(signal);
        score += check.weight === 'high' ? 3 : check.weight === 'medium' ? 2 : 1;
      }
    }

    if (signals.length > 0) {
      scores.set(fp.platform, { score, signals });
    }
  }

  if (scores.size === 0) {
    return { platform: 'unknown', confidence: 'low', signals: [] };
  }

  // Sort by score descending
  const sorted = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
  const [topPlatform, { score, signals }] = sorted[0];

  const confidence = score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low';

  return { platform: topPlatform, confidence, signals };
}

import * as cheerio from 'cheerio';
import type { WafInfo, WafProvider } from '@dealership-scraper/shared';

export function detectWaf(
  html: string,
  headers: Record<string, string>,
  statusCode: number
): WafInfo {
  const providers: WafProvider[] = [];
  const headerStr = JSON.stringify(headers).toLowerCase();
  const htmlLower = html.toLowerCase();

  // Cloudflare
  if (headers['cf-ray']) {
    providers.push('cloudflare-waf');
    if (/cf-bot-management|cf-challenge/i.test(headerStr)) {
      providers.push('cloudflare-bot-management');
    }
  }

  // Imperva / Incapsula
  if (headers['x-iinfo'] || headers['x-cdn'] === 'imperva' || /incap_ses|visid_incap/i.test(headerStr)) {
    providers.push('imperva-incapsula');
  }

  // DataDome
  if (/datadome/i.test(headerStr) || /datadome/i.test(htmlLower)) {
    providers.push('datadome');
  }

  // PerimeterX
  if (/perimeterx|_px\d?_vid|pxchallenge/i.test(headerStr) || /perimeterx/i.test(htmlLower)) {
    providers.push('perimeterx');
  }

  // Akamai Bot Manager
  if (headers['x-check-cacheable'] || /ak_bmsc|bm_sz|akamai/i.test(headerStr)) {
    providers.push('akamai-bot-manager');
  }

  // AWS WAF
  if (headers['x-amzn-waf-action'] || /awswaf/i.test(headerStr)) {
    providers.push('aws-waf');
  }

  // Sucuri
  if (/sucuri/i.test(headerStr) || /x-sucuri-id/i.test(headerStr)) {
    providers.push('sucuri');
  }

  // JS Challenge detection (Cloudflare "Checking your browser")
  const jsChallenge =
    /checking your browser|just a moment\.\.\.|cloudflare.*security check|cf-spinner/i.test(html) ||
    statusCode === 403 && /cloudflare|cf-ray/i.test(headerStr);

  // Rate limited
  const rateLimited = statusCode === 429;

  // Honeypot detection
  const $ = cheerio.load(html);
  const honeypotDetected = detectHoneypotFields($);

  return {
    providers: [...new Set(providers)],
    jsChallenge,
    rateLimited,
    honeypotDetected,
  };
}

function detectHoneypotFields($: cheerio.CheerioAPI): boolean {
  let found = false;
  $('input').each((_, el) => {
    const name = ($(el).attr('name') ?? '').toLowerCase();
    const style = ($(el).attr('style') ?? '').toLowerCase();
    const ariaHidden = $(el).attr('aria-hidden');
    const tabIndex = $(el).attr('tabindex');

    const isHidden =
      style.includes('display:none') ||
      style.includes('display: none') ||
      style.includes('visibility:hidden') ||
      ariaHidden === 'true' ||
      tabIndex === '-1';

    const isSuspiciousName = /honeypot|bot_check|website_url|trap|antispam|gotcha|confirm_email|phone2|address2/i.test(name);

    if (isHidden && isSuspiciousName) found = true;
  });
  return found;
}

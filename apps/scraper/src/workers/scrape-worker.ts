import { fetchPage } from '../http/client';
import { extractBusinessInfo } from '../extractors/business-info';
import { extractSocialLinks } from '../extractors/social-links';
import { extractInventoryInfo } from '../extractors/inventory';
import { extractWebsiteIntel } from '../extractors/website-intel';
import { detectCms } from '../detectors/cms-detector';
import { detectTechStack } from '../detectors/tech-stack';
import { detectCaptcha } from '../detectors/captcha-detector';
import { detectWaf } from '../detectors/waf-detector';
import { upsertDealership, wasRecentlyScraped, incrementStats } from '../firebase/dealerships';
import { markUrlDone, updateJobProgress, appendLog } from '../firebase/queue';
import { normalizeDomain } from '../discovery/url-normalizer';
import { delayWithJitter } from '../http/retry';
import { config } from '../config';
import type { Dealership } from '@dealership-scraper/shared';

export interface WorkerTask {
  id: string;
  url: string;
  domain: string;
  jobId: string;
  workerId: number;
  forceRefresh: boolean;
}

export interface WorkerResult {
  success: boolean;
  skipped: boolean;
  error?: string;
  dealership?: Partial<Dealership>;
}

async function log(
  jobId: string,
  workerId: number,
  level: 'info' | 'warn' | 'error' | 'success',
  message: string,
  url?: string,
  meta?: Record<string, unknown>
): Promise<void> {
  console.log(`[worker-${workerId}] [${level.toUpperCase()}] ${message}${url ? ` — ${url}` : ''}`);
  await appendLog(jobId, {
    level,
    message,
    url: url ?? null,
    timestamp: Date.now(),
    workerId,
    meta: meta ?? {},
  });
}

export async function scrapeUrl(task: WorkerTask): Promise<WorkerResult> {
  const { url, domain, jobId, workerId, forceRefresh } = task;
  const startTime = Date.now();

  try {
    // Incremental check
    if (!forceRefresh) {
      const recent = await wasRecentlyScraped(domain).catch(() => false);
      if (recent) {
        await markUrlDone(task.id, 'done');
        await updateJobProgress(jobId, { skipped: 1, currentUrl: url });
        await log(jobId, workerId, 'info', `Skipped (recent)`, url);
        return { success: true, skipped: true };
      }
    }

    await log(jobId, workerId, 'info', `Scraping`, url);
    await updateJobProgress(jobId, { currentUrl: url });

    // Fetch main page
    const fetchResult = await fetchPage(url);

    if (fetchResult.timedOut) {
      await markUrlDone(task.id, 'failed');
      await updateJobProgress(jobId, { failed: 1, currentUrl: null });
      await log(jobId, workerId, 'warn', `Timed out`, url);
      return { success: false, skipped: false, error: 'timeout' };
    }

    if (fetchResult.rateLimited) {
      await log(jobId, workerId, 'warn', `Rate limited (429)`, url);
      // Re-enqueue by leaving status as 'processing' — scheduler will retry
      return { success: false, skipped: false, error: 'rate-limited' };
    }

    if (fetchResult.error && !fetchResult.html) {
      await markUrlDone(task.id, 'failed');
      await updateJobProgress(jobId, { failed: 1, currentUrl: null });
      await log(jobId, workerId, 'error', `Fetch failed: ${fetchResult.error}`, url);
      return { success: false, skipped: false, error: fetchResult.error };
    }

    const html = fetchResult.html;
    const headers = fetchResult.headers;
    const finalUrl = fetchResult.finalUrl || url;

    // Parallel extraction/detection
    const hostname = (() => {
      try { return new URL(finalUrl.startsWith('http') ? finalUrl : `https://${finalUrl}`).hostname; }
      catch { return domain; }
    })();

    const [businessInfo, social, websiteIntel, techStack, inventory] = await Promise.allSettled([
      Promise.resolve(extractBusinessInfo(html, finalUrl)),
      Promise.resolve(extractSocialLinks(html)),
      extractWebsiteIntel(fetchResult, finalUrl),
      detectTechStack(html, headers, hostname),
      extractInventoryInfo(html, finalUrl),
    ]);

    const cms = detectCms(html, headers);
    const captcha = detectCaptcha(html);
    const waf = detectWaf(html, headers, fetchResult.statusCode);

    const scrapeDurationMs = Date.now() - startTime;

    const anyFailed = [businessInfo, social, websiteIntel, techStack, inventory].some(r => r.status === 'rejected');
    const status: Dealership['status'] = anyFailed ? 'partial' : 'complete';

    const biz = businessInfo.status === 'fulfilled' ? businessInfo.value : {
      name: null, address: null, city: null, state: null, zip: null, country: null,
      phones: { main: null, sales: null, service: null, parts: null },
      emails: [], hours: null, parentGroup: null,
    };

    const dealership: Dealership = {
      id: domain.replace(/[^a-z0-9.-]/g, '_'),
      name: biz.name,
      address: biz.address,
      city: biz.city,
      state: biz.state,
      zip: biz.zip,
      country: biz.country,
      phones: biz.phones,
      emails: biz.emails,
      hours: biz.hours,
      googleMapsUrl: null,
      googlePlaceId: null,
      parentGroup: biz.parentGroup,
      website: websiteIntel.status === 'fulfilled' ? websiteIntel.value : {
        url: finalUrl, subdomains: [], ssl: null, redirectChain: fetchResult.redirectChain,
        loadTimeMs: fetchResult.loadTimeMs, mobileResponsive: null,
        sitemapUrl: null, sitemapCount: null, robotsTxtPresent: null, robotsTxtDisallows: [],
      },
      cms,
      techStack: techStack.status === 'fulfilled' ? techStack.value : {
        frontend: [], analytics: [], tagManagers: [], chatWidgets: [], crm: [],
        cdn: null, hosting: null, adPixels: [],
      },
      captcha,
      waf,
      inventory: inventory.status === 'fulfilled' ? inventory.value : {
        vinsFound: [], platform: null, iframeSources: [],
        routes: { new: null, used: null, cpo: null, inventory: null }, vehicleCount: null,
      },
      social: social.status === 'fulfilled' ? social.value : {
        facebook: null, instagram: null, twitter: null, youtube: null, tiktok: null, linkedin: null,
      },
      status,
      lastScrapedAt: Date.now(),
      scrapeDurationMs,
      sourceUrls: [url],
      discoveredVia: 'scraper',
    };

    const isNew = !(await wasRecentlyScraped(domain).catch(() => false));

    await upsertDealership(dealership);
    await incrementStats(isNew).catch(() => {});
    await markUrlDone(task.id, 'done');
    await updateJobProgress(jobId, { done: 1, currentUrl: null });
    await log(jobId, workerId, 'success', `Scraped (${status}) — ${cms.platform}`, url, {
      scrapeDurationMs, techCount: Object.values(dealership.techStack).flat().filter(Boolean).length
    });

    // Jitter delay
    await delayWithJitter(config.delayMs, config.delayJitterMs);

    return { success: true, skipped: false, dealership };

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await markUrlDone(task.id, 'failed').catch(() => {});
    await updateJobProgress(jobId, { failed: 1, currentUrl: null }).catch(() => {});
    await log(jobId, workerId, 'error', `Unhandled error: ${error}`, url);
    return { success: false, skipped: false, error };
  }
}

import * as cheerio from 'cheerio';
import * as dns from 'dns';
import * as net from 'net';
import type {
  TechStack, FrontendFramework, AnalyticsPlatform, TagManager,
  ChatWidget, CrmHint, CdnProvider, AdPixel
} from '@dealership-scraper/shared';

function getAllScriptSrcs(html: string, $: cheerio.CheerioAPI): string {
  const srcs: string[] = [];
  $('script[src]').each((_, el) => { srcs.push($(el).attr('src') ?? ''); });
  return srcs.join('\n') + '\n' + html;
}

export function detectFrontendFrameworks(html: string, $: cheerio.CheerioAPI): FrontendFramework[] {
  const found: FrontendFramework[] = [];
  const all = getAllScriptSrcs(html, $);

  if (/react(?:\.development|\.production\.min)?\.js|data-reactroot|__REACT_DEVTOOLS_GLOBAL_HOOK__|react-dom/i.test(all)) found.push('react');
  if (/next\/dist\/|_next\/static\/__BUILD_MANIFEST/i.test(all)) { if (!found.includes('react')) found.push('react'); found.push('nextjs'); }
  if (/vue(?:\.runtime)?(?:\.min)?\.js|__vue___|v-app[\s>]|vue@\d/i.test(all)) found.push('vue');
  if (/angular(?:\.min)?\.js|ng-version=|_nghost-|ng-app[\s=]/i.test(all)) found.push('angular');
  if (/nuxt|_nuxt\/|\.nuxt\//i.test(all)) found.push('nuxt');
  if (/jquery(?:\.min)?\.js|jquery-\d|\/jquery@/i.test(all)) found.push('jquery');
  if (/svelte(?:-internal)?\.js|__svelte_/i.test(all)) found.push('svelte');

  return [...new Set(found)];
}

export function detectAnalytics(html: string): AnalyticsPlatform[] {
  const found: AnalyticsPlatform[] = [];

  if (/gtag\.js\?id=G-|\"G-[A-Z0-9]{8,}\"/i.test(html)) found.push('ga4');
  if (/analytics\.js|\"UA-\d{5,}-\d{1,}\"/i.test(html)) found.push('ua');
  if (/cdn\.segment\.com|analytics\.segment\.io|window\.analytics\.load/i.test(html)) found.push('segment');
  if (/cdn\.heapanalytics\.com|heap\.load\(|window\.heap/i.test(html)) found.push('heap');
  if (/static\.hotjar\.com|hjSiteSettings|window\.hj\b/i.test(html)) found.push('hotjar');
  if (/cdn\.mxpnl\.com|mixpanel\.init|window\.mixpanel/i.test(html)) found.push('mixpanel');
  if (/cdn\.amplitude\.com|amplitude\.getInstance|window\.amplitude/i.test(html)) found.push('amplitude');
  if (/klaviyo\.com\/media|_learnq\.push|window\._learnq/i.test(html)) found.push('klaviyo');

  return [...new Set(found)];
}

export function detectTagManagers(html: string): TagManager[] {
  const found: TagManager[] = [];

  if (/googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{6,}/i.test(html)) found.push('gtm');
  if (/tags\.tiqcdn\.com|utag(?:\.js|\.sync\.js)/i.test(html)) found.push('tealium');
  if (/assets\.adobedtm\.com|_satellite\.track/i.test(html)) found.push('adobe-dtm');

  return [...new Set(found)];
}

export function detectChatWidgets(html: string): ChatWidget[] {
  const found: ChatWidget[] = [];

  if (/widget\.intercom\.io|intercomSettings|window\.Intercom\b/i.test(html)) found.push('intercom');
  if (/js\.driftt\.com|window\.drift\b|drift\.load/i.test(html)) found.push('drift');
  if (/lpcdn\.lpsnmedia\.net|liveperson\.net|lpTag\.newPage/i.test(html)) found.push('liveperson');
  if (/carnow\.com\/chat|carnow-chat/i.test(html)) found.push('carnow');
  if (/connect\.podium\.com|PodiumWebChat|podium-widget/i.test(html)) found.push('podium');
  if (/gubagoo\.com\/chat|gubagoo-widget/i.test(html)) found.push('gubagoo');
  if (/activengage\.com|\"activengage\"/i.test(html)) found.push('activengage');
  if (/dealer\.com\/chat|ddc-chat|DDCChat/i.test(html)) found.push('dealer-com-chat');
  if (/talkdesk\.com\/web-widget|talkdeskChatSDK/i.test(html)) found.push('talkdesk');
  if (/tidio\.co\/widget|tidioChatApi/i.test(html)) found.push('tidio');
  if (/zopim|zendesk\.com\/embeddable_framework|zE\(/i.test(html)) found.push('zendesk');

  return [...new Set(found)];
}

export function detectCrmHints(html: string): CrmHint[] {
  const found: CrmHint[] = [];

  if (/vinsolutions\.com|VinSolutions/i.test(html)) found.push('vinsolutions');
  if (/dealersocket\.com.*crm|dsplatform.*crm/i.test(html)) found.push('dealersocket-crm');
  if (/eleadcrm\.com|elead\.com.*crm/i.test(html)) found.push('elead-crm');
  if (/tekion\.com|TekionCloud/i.test(html)) found.push('tekion');
  if (/dealertrack\.com|dtims\.com/i.test(html)) found.push('dealertrack');

  return [...new Set(found)];
}

export function detectCdn(headers: Record<string, string>, html: string): CdnProvider | null {
  const server = (headers['server'] ?? '').toLowerCase();
  const via = (headers['via'] ?? '').toLowerCase();
  const allHeaders = JSON.stringify(headers).toLowerCase();

  if (headers['cf-ray'] || server.includes('cloudflare')) return 'cloudflare';
  if (headers['x-served-by']?.includes('cache-') || via.includes('fastly') || html.includes('fastly.net')) return 'fastly';
  if (headers['x-amz-cf-id'] || html.includes('cloudfront.net')) return 'cloudfront';
  if (allHeaders.includes('akamai') || headers['x-check-cacheable']) return 'akamai';
  if (html.includes('bunnycdn.com') || html.includes('b-cdn.net')) return 'bunny';
  if (allHeaders.includes('azure')) return 'azure-cdn';
  if (allHeaders.includes('google-cloud-cdn') || headers['x-guploader-uploadid']) return 'google-cloud-cdn';

  return null;
}

export function detectAdPixels(html: string): AdPixel[] {
  const found: AdPixel[] = [];

  if (/connect\.facebook\.net|fbevents\.js|window\._fbq|window\.fbq\b/i.test(html)) found.push('facebook');
  if (/analytics\.tiktok\.com|ttq\.load|window\.ttq\b/i.test(html)) found.push('tiktok');
  if (/snap\.licdn\.com|_linkedin_data_partner_id/i.test(html)) found.push('linkedin');
  if (/googleadservices\.com|google_conversion_id|\"AW-\d{8,}\"/i.test(html)) found.push('google-ads');
  if (/ct\.pinterest\.com|pintrk\(/i.test(html)) found.push('pinterest');
  if (/tr\.snapchat\.com|snaptr\(/i.test(html)) found.push('snapchat');

  return [...new Set(found)];
}

async function detectHosting(hostname: string): Promise<string | null> {
  return new Promise((resolve) => {
    dns.reverse(hostname, (err, hostnames) => {
      if (err || !hostnames?.length) {
        // Try IP lookup
        dns.lookup(hostname, (err2, address) => {
          if (err2 || !address) { resolve(null); return; }
          dns.reverse(address, (err3, names) => {
            if (err3 || !names?.length) { resolve(null); return; }
            const name = names[0].toLowerCase();
            resolve(detectHostingFromPTR(name));
          });
        });
        return;
      }
      resolve(detectHostingFromPTR(hostnames[0].toLowerCase()));
    });
  });
}

function detectHostingFromPTR(ptr: string): string | null {
  if (ptr.includes('amazonaws.com')) return 'AWS';
  if (ptr.includes('googleusercontent.com') || ptr.includes('googleapis.com')) return 'Google Cloud';
  if (ptr.includes('azure') || ptr.includes('cloudapp.net')) return 'Azure';
  if (ptr.includes('cloudflare')) return 'Cloudflare';
  if (ptr.includes('wpengine.com')) return 'WP Engine';
  if (ptr.includes('kinsta.com')) return 'Kinsta';
  if (ptr.includes('netlify')) return 'Netlify';
  if (ptr.includes('vercel')) return 'Vercel';
  if (ptr.includes('fastly')) return 'Fastly';
  if (ptr.includes('rackspace')) return 'Rackspace';
  if (ptr.includes('digitalocean')) return 'DigitalOcean';
  if (ptr.includes('linode') || ptr.includes('akamai')) return 'Linode/Akamai';
  if (ptr.includes('godaddy')) return 'GoDaddy';
  if (ptr.includes('bluehost')) return 'Bluehost';
  if (ptr.includes('siteground')) return 'SiteGround';
  return ptr.split('.').slice(-3).join('.');
}

export async function detectTechStack(
  html: string,
  headers: Record<string, string>,
  hostname: string
): Promise<TechStack> {
  const $ = cheerio.load(html);

  const hosting = await detectHosting(hostname).catch(() => null);

  return {
    frontend: detectFrontendFrameworks(html, $),
    analytics: detectAnalytics(html),
    tagManagers: detectTagManagers(html),
    chatWidgets: detectChatWidgets(html),
    crm: detectCrmHints(html),
    cdn: detectCdn(headers, html),
    hosting,
    adPixels: detectAdPixels(html),
  };
}

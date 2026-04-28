import * as cheerio from 'cheerio';
import type { SocialLinks } from '@dealership-scraper/shared';

const SOCIAL_PATTERNS: Record<keyof SocialLinks, RegExp> = {
  facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?!sharer|share|dialog|plugins)[\w.-]+\/?/i,
  instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[\w.]+\/?/i,
  twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[\w]+\/?/i,
  youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel|user|c|@)[\w\-]+\/?/i,
  tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.]+\/?/i,
  linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/company\/[\w-]+\/?/i,
};

function cleanUrl(raw: string): string {
  return raw.split('?')[0].replace(/\/$/, '').trim();
}

export function extractSocialLinks(html: string): SocialLinks {
  const $ = cheerio.load(html);
  const links: SocialLinks = {
    facebook: null,
    instagram: null,
    twitter: null,
    youtube: null,
    tiktok: null,
    linkedin: null,
  };

  // Check all anchor hrefs
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS) as [keyof SocialLinks, RegExp][]) {
      if (!links[platform] && pattern.test(href)) {
        const match = href.match(pattern);
        if (match) links[platform] = cleanUrl(match[0]);
      }
    }
  });

  // Also scan full HTML for social URLs not in anchor tags
  for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS) as [keyof SocialLinks, RegExp][]) {
    if (!links[platform]) {
      const match = html.match(pattern);
      if (match) links[platform] = cleanUrl(match[0]);
    }
  }

  return links;
}

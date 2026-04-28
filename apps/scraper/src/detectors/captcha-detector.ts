import * as cheerio from 'cheerio';
import type { CaptchaInfo, CaptchaType } from '@dealership-scraper/shared';

export function detectCaptcha(html: string): CaptchaInfo {
  const $ = cheerio.load(html);
  const types: CaptchaType[] = [];

  // reCAPTCHA
  const hasReCaptchaScript = /google\.com\/recaptcha\/api\.js/i.test(html);
  const hasReCaptchaV3 = /grecaptcha\.execute|recaptcha\/api\.js\?render=/i.test(html);
  const hasReCaptchaWidget = $('[class*="g-recaptcha"], [data-sitekey]').length > 0;

  if (hasReCaptchaV3) {
    types.push('recaptcha-v3');
  } else if (hasReCaptchaScript || hasReCaptchaWidget) {
    types.push('recaptcha-v2');
  }

  // hCaptcha
  if (/hcaptcha\.com\/1\/api\.js|data-hcaptcha-sitekey/i.test(html) || $('[class*="h-captcha"]').length > 0) {
    types.push('hcaptcha');
  }

  // Cloudflare Turnstile
  if (/challenges\.cloudflare\.com\/turnstile|cf-turnstile/i.test(html) || $('[class*="cf-turnstile"]').length > 0) {
    types.push('cloudflare-turnstile');
  }

  // Arkose Labs / FunCaptcha
  if (/arkoselabs\.com|funcaptcha\.com|ArkoseEnforcement/i.test(html)) {
    types.push('arkose');
  }

  // Friendly Captcha
  if (/friendly-challenge\.github\.io|friendlycaptcha\.com|frc-captcha/i.test(html)) {
    types.push('friendly-captcha');
  }

  return { types };
}

export function detectHoneypots($: cheerio.CheerioAPI): boolean {
  // Look for hidden form fields with honeypot-style names
  let found = false;
  $('input[type="hidden"], input[style*="display:none"], input[style*="display: none"]').each((_, el) => {
    const name = ($( el).attr('name') ?? '').toLowerCase();
    if (/honeypot|bot_check|website_url|hp_field|gotcha|trap|antispam/i.test(name)) {
      found = true;
    }
  });
  return found;
}

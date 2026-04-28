'use client';

import { useState } from 'react';
import { cn, formatDate, formatDuration, STATUS_COLORS, CMS_COLORS } from '@/lib/utils';
import {
  Building2, Globe, Phone, Mail, Clock, Shield, Layers,
  BarChart2, MessageSquare, Code2, ShoppingCart, Share2,
  ChevronDown, ChevronRight, ExternalLink, Lock
} from 'lucide-react';
import type { Dealership } from '@dealership-scraper/shared';

function Section({
  title, icon: Icon, iconColor = 'text-muted-foreground', children, defaultOpen = true
}: {
  title: string;
  icon: React.ElementType;
  iconColor?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-secondary/50 hover:bg-secondary transition-colors text-left"
      >
        <Icon className={cn('w-4 h-4 shrink-0', iconColor)} />
        <span className="text-sm font-medium">{title}</span>
        <div className="ml-auto">
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && <div className="px-4 py-3 space-y-2">{children}</div>}
    </div>
  );
}

function Field({ label, value, mono = false, href }: { label: string; value?: string | null; mono?: boolean; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-sm data-row py-1.5">
      <span className="text-muted-foreground text-xs font-mono w-[130px] shrink-0">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cn('text-primary hover:underline flex items-center gap-1', mono && 'font-mono text-xs')}>
          {value} <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <span className={cn('text-foreground break-all', mono && 'font-mono text-xs')}>{value}</span>
      )}
    </div>
  );
}

function Badge({ text, color }: { text: string; color?: string }) {
  return (
    <span className={cn('badge-tech', color ?? 'text-muted-foreground border-border bg-secondary')}>
      {text}
    </span>
  );
}

function BadgeList({ items, colorMap }: { items: string[]; colorMap?: Record<string, string> }) {
  if (!items.length) return <span className="text-xs text-muted-foreground">None detected</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <Badge key={item} text={item} color={colorMap?.[item]} />
      ))}
    </div>
  );
}

export function DealerDetailPanel({ dealer }: { dealer: Dealership }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="glass-card p-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl font-semibold">{dealer.name ?? 'Unknown Dealership'}</h1>
            <span className={cn('badge-tech', STATUS_COLORS[dealer.status])}>{dealer.status}</span>
          </div>
          {dealer.website?.url && (
            <a href={dealer.website.url} target="_blank" rel="noopener noreferrer"
              className="text-sm font-mono text-primary hover:underline flex items-center gap-1">
              {dealer.website.url} <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <div className="flex gap-4 mt-2 text-xs font-mono text-muted-foreground">
            <span>Scraped {formatDate(dealer.lastScrapedAt)}</span>
            <span>Duration: {formatDuration(dealer.scrapeDurationMs)}</span>
            <span>Via: {dealer.discoveredVia}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={cn('badge-tech text-sm', CMS_COLORS[dealer.cms?.platform ?? 'unknown'])}>
            {dealer.cms?.platform ?? 'unknown'}
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            {dealer.cms?.confidence} confidence
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Business Info */}
        <Section title="Business Info" icon={Building2} iconColor="text-primary">
          <Field label="Name" value={dealer.name} />
          <Field label="Address" value={dealer.address} />
          <Field label="City" value={dealer.city} />
          <Field label="State" value={dealer.state} />
          <Field label="ZIP" value={dealer.zip} />
          <Field label="Country" value={dealer.country} />
          <Field label="Parent Group" value={dealer.parentGroup} />
          <Field label="Hours" value={dealer.hours} />
          <Field label="Main Phone" value={dealer.phones?.main} mono />
          <Field label="Sales Phone" value={dealer.phones?.sales} mono />
          <Field label="Service Phone" value={dealer.phones?.service} mono />
          <Field label="Parts Phone" value={dealer.phones?.parts} mono />
          {dealer.emails?.length > 0 && (
            <div className="data-row py-1.5">
              <span className="text-muted-foreground text-xs font-mono">Emails</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {dealer.emails.map(e => <Badge key={e} text={e} />)}
              </div>
            </div>
          )}
          <Field label="Google Maps" value={dealer.googleMapsUrl ? 'View' : null} href={dealer.googleMapsUrl ?? undefined} />
        </Section>

        {/* Website Intelligence */}
        <Section title="Website Intelligence" icon={Globe} iconColor="text-neon-cyan">
          <Field label="Final URL" value={dealer.website?.url} mono href={dealer.website?.url} />
          <Field label="Load Time" value={dealer.website?.loadTimeMs ? `${dealer.website.loadTimeMs}ms` : null} mono />
          <Field label="Mobile Responsive" value={dealer.website?.mobileResponsive != null ? (dealer.website.mobileResponsive ? 'Yes' : 'No') : null} />
          <Field label="SSL Valid" value={dealer.website?.ssl ? (dealer.website.ssl.valid ? 'Valid' : 'Invalid') : null} />
          <Field label="SSL Expires" value={dealer.website?.ssl?.expiresAt} mono />
          <Field label="SSL Issuer" value={dealer.website?.ssl?.issuer} />
          <Field label="Sitemap" value={dealer.website?.sitemapUrl ? `${dealer.website.sitemapCount ?? '?'} URLs` : null} href={dealer.website?.sitemapUrl ?? undefined} />
          <Field label="Robots.txt" value={dealer.website?.robotsTxtPresent != null ? (dealer.website.robotsTxtPresent ? 'Present' : 'Missing') : null} />
          {dealer.website?.redirectChain?.length > 1 && (
            <div className="py-1.5">
              <span className="text-muted-foreground text-xs font-mono block mb-1">Redirect Chain</span>
              <div className="space-y-0.5">
                {dealer.website.redirectChain.map((url, i) => (
                  <div key={i} className="text-xs font-mono text-muted-foreground truncate">
                    {'→'.repeat(i)} {url}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Tech Stack */}
        <Section title="Tech Stack" icon={Code2} iconColor="text-neon-green">
          <div className="space-y-2.5">
            <div>
              <div className="text-xs font-mono text-muted-foreground mb-1">Frontend</div>
              <BadgeList items={dealer.techStack?.frontend ?? []} />
            </div>
            <div>
              <div className="text-xs font-mono text-muted-foreground mb-1">Analytics</div>
              <BadgeList items={dealer.techStack?.analytics ?? []} />
            </div>
            <div>
              <div className="text-xs font-mono text-muted-foreground mb-1">Tag Managers</div>
              <BadgeList items={dealer.techStack?.tagManagers ?? []} />
            </div>
            <div>
              <div className="text-xs font-mono text-muted-foreground mb-1">Chat Widgets</div>
              <BadgeList items={dealer.techStack?.chatWidgets ?? []} />
            </div>
            <div>
              <div className="text-xs font-mono text-muted-foreground mb-1">CRM Hints</div>
              <BadgeList items={dealer.techStack?.crm ?? []} />
            </div>
            <div>
              <div className="text-xs font-mono text-muted-foreground mb-1">Ad Pixels</div>
              <BadgeList items={dealer.techStack?.adPixels ?? []} />
            </div>
            <Field label="CDN" value={dealer.techStack?.cdn} mono />
            <Field label="Hosting" value={dealer.techStack?.hosting} mono />
          </div>
        </Section>

        {/* Security */}
        <Section title="Security & Anti-Bot" icon={Shield} iconColor="text-red-400" defaultOpen={false}>
          <div className="space-y-2.5">
            <div>
              <div className="text-xs font-mono text-muted-foreground mb-1">WAF / CDN</div>
              <BadgeList items={dealer.waf?.providers ?? []} />
            </div>
            <div>
              <div className="text-xs font-mono text-muted-foreground mb-1">Captcha</div>
              <BadgeList items={dealer.captcha?.types ?? []} />
            </div>
            <Field label="JS Challenge" value={dealer.waf?.jsChallenge ? 'Detected' : 'No'} />
            <Field label="Rate Limited" value={dealer.waf?.rateLimited ? 'Yes' : 'No'} />
            <Field label="Honeypot Fields" value={dealer.waf?.honeypotDetected ? 'Detected' : 'No'} />
          </div>
        </Section>

        {/* Inventory */}
        <Section title="Inventory System" icon={ShoppingCart} iconColor="text-yellow-400" defaultOpen={false}>
          <Field label="Platform" value={dealer.inventory?.platform} mono />
          <Field label="VINs Found" value={dealer.inventory?.vinsFound?.length ? String(dealer.inventory.vinsFound.length) : null} />
          <Field label="Vehicle Count" value={dealer.inventory?.vehicleCount != null ? String(dealer.inventory.vehicleCount) : null} />
          <div className="py-1.5">
            <div className="text-xs font-mono text-muted-foreground mb-1">Routes Available</div>
            <div className="flex gap-2">
              {(['inventory', 'new', 'used', 'cpo'] as const).map(route => (
                <span key={route} className={cn('badge-tech',
                  dealer.inventory?.routes?.[route]
                    ? 'text-neon-green border-neon-green/30 bg-neon-green/10'
                    : 'text-muted-foreground border-border bg-secondary'
                )}>
                  /{route}
                </span>
              ))}
            </div>
          </div>
          {(dealer.inventory?.iframeSources?.length ?? 0) > 0 && (
            <div className="py-1.5">
              <div className="text-xs font-mono text-muted-foreground mb-1">Iframe Sources</div>
              {dealer.inventory.iframeSources.map(src => (
                <div key={src} className="text-xs font-mono text-muted-foreground truncate">{src}</div>
              ))}
            </div>
          )}
        </Section>

        {/* Social */}
        <Section title="Social & Marketing" icon={Share2} iconColor="text-pink-400" defaultOpen={false}>
          <Field label="Facebook" value={dealer.social?.facebook} mono href={dealer.social?.facebook ?? undefined} />
          <Field label="Instagram" value={dealer.social?.instagram} mono href={dealer.social?.instagram ?? undefined} />
          <Field label="Twitter / X" value={dealer.social?.twitter} mono href={dealer.social?.twitter ?? undefined} />
          <Field label="YouTube" value={dealer.social?.youtube} mono href={dealer.social?.youtube ?? undefined} />
          <Field label="TikTok" value={dealer.social?.tiktok} mono href={dealer.social?.tiktok ?? undefined} />
          <Field label="LinkedIn" value={dealer.social?.linkedin} mono href={dealer.social?.linkedin ?? undefined} />
        </Section>
      </div>

      {/* Raw JSON */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="w-full flex items-center gap-2 px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
        >
          <Code2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Raw JSON</span>
          <div className="ml-auto">
            {showRaw ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>
        {showRaw && (
          <pre className="px-4 py-3 text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-[400px]">
            {JSON.stringify(dealer, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

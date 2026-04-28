import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Dealership } from '@dealership-scraper/shared';

function getAdminDb() {
  if (getApps().length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      : undefined;
    if (serviceAccount) {
      initializeApp({ credential: cert(serviceAccount), projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'carpilothq' });
    } else {
      initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'carpilothq' });
    }
  }
  return getFirestore();
}

function toCsvRow(d: Dealership): string {
  const fields = [
    d.name,
    d.website?.url,
    d.address,
    d.city,
    d.state,
    d.zip,
    d.phones?.main,
    d.phones?.sales,
    d.phones?.service,
    d.emails?.join('; '),
    d.cms?.platform,
    d.techStack?.frontend?.join('; '),
    d.techStack?.analytics?.join('; '),
    d.techStack?.chatWidgets?.join('; '),
    d.techStack?.crm?.join('; '),
    d.techStack?.cdn,
    d.techStack?.hosting,
    d.captcha?.types?.join('; '),
    d.waf?.providers?.join('; '),
    d.social?.facebook,
    d.social?.instagram,
    d.social?.twitter,
    d.social?.youtube,
    d.inventory?.vehicleCount,
    d.inventory?.platform,
    d.status,
    d.lastScrapedAt ? new Date(d.lastScrapedAt).toISOString() : '',
  ];
  return fields.map(f => {
    const s = String(f ?? '');
    return `"${s.replace(/"/g, '""')}"`;
  }).join(',');
}

const CSV_HEADER = [
  'Name', 'Website', 'Address', 'City', 'State', 'ZIP',
  'Main Phone', 'Sales Phone', 'Service Phone', 'Emails',
  'CMS Platform', 'Frontend', 'Analytics', 'Chat Widgets', 'CRM',
  'CDN', 'Hosting', 'Captcha', 'WAF',
  'Facebook', 'Instagram', 'Twitter', 'YouTube',
  'Vehicle Count', 'Inventory Platform',
  'Status', 'Last Scraped',
].join(',');

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get('state');
    const platform = searchParams.get('platform');

    const db = getAdminDb();
    let q = db.collection('dealerships').orderBy('lastScrapedAt', 'desc').limit(5000);

    // Note: Firestore doesn't support multiple equality filters without composite indexes,
    // so we apply server-side and filter client-side for additional constraints
    const snapshot = await q.get();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(CSV_HEADER + '\n'));

        for (const doc of snapshot.docs) {
          const d = doc.data() as Dealership;
          if (state && d.state !== state) continue;
          if (platform && d.cms?.platform !== platform) continue;
          controller.enqueue(encoder.encode(toCsvRow(d) + '\n'));
        }

        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="dealerships-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error }, { status: 500 });
  }
}

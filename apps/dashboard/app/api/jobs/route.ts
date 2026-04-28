import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      targetStates?: string[];
      targetBrands?: string[];
      concurrency?: number;
      forceRefresh?: boolean;
    };

    const db = getAdminDb();
    const ref = db.collection('scrape_jobs').doc();

    const job = {
      id: ref.id,
      status: 'pending',
      targetStates: body.targetStates ?? [],
      targetBrands: body.targetBrands ?? [],
      targetCities: [],
      concurrency: Math.min(50, Math.max(1, body.concurrency ?? 10)),
      forceRefresh: body.forceRefresh ?? false,
      createdAt: FieldValue.serverTimestamp(),
      startedAt: null,
      completedAt: null,
      progress: { total: 0, done: 0, failed: 0, skipped: 0 },
      currentUrl: null,
      errorMessage: null,
      workerCount: 0,
    };

    await ref.set(job);

    return NextResponse.json({ jobId: ref.id, status: 'pending' }, { status: 201 });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[api/jobs POST]', error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection('scrape_jobs')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const jobs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ jobs });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error }, { status: 500 });
  }
}

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) console.warn(`[config] WARNING: ${key} is not set`);
  return val ?? '';
}

function parseProxyList(raw: string): string[] {
  return raw.split(',').map(p => p.trim()).filter(Boolean);
}

export const config = {
  serpApiKey: process.env.SERP_API_KEY ?? '',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? 'carpilothq',
  serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? path.resolve(process.cwd(), '../../service-account.json'),
  concurrency: Math.min(50, Math.max(1, parseInt(process.env.SCRAPER_CONCURRENCY ?? '10', 10))),
  delayMs: parseInt(process.env.SCRAPER_DELAY_MS ?? '500', 10),
  delayJitterMs: parseInt(process.env.SCRAPER_DELAY_JITTER_MS ?? '200', 10),
  proxyList: parseProxyList(process.env.PROXY_LIST ?? ''),
  proxyRotatingEndpoint: process.env.PROXY_ROTATING_ENDPOINT ?? '',
  timeoutMs: 15_000,
  maxRetries: 3,
  incrementalDays: 30,
} as const;

export type Config = typeof config;

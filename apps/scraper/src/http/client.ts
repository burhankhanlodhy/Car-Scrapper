import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import * as http from 'http';
import * as https from 'https';
import { config } from '../config';
import { getRandomUA, getRandomizedHeaders } from './user-agents';
import { withRetry } from './retry';

let proxyIndex = 0;

function getNextProxy(): string | null {
  const list = config.proxyList;
  if (config.proxyRotatingEndpoint) return config.proxyRotatingEndpoint;
  if (list.length === 0) return null;
  const proxy = list[proxyIndex % list.length];
  proxyIndex++;
  return proxy;
}

function buildAxiosConfig(proxyUrl?: string): AxiosRequestConfig {
  const base: AxiosRequestConfig = {
    timeout: config.timeoutMs,
    maxRedirects: 10,
    decompress: true,
    responseType: 'text',
    validateStatus: (status) => status < 500,
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  };

  if (proxyUrl) {
    try {
      const parsed = new URL(proxyUrl);
      base.proxy = {
        protocol: parsed.protocol.replace(':', ''),
        host: parsed.hostname,
        port: parseInt(parsed.port, 10),
        auth: parsed.username ? { username: parsed.username, password: parsed.password } : undefined,
      };
    } catch {
      // invalid proxy URL, ignore
    }
  }

  return base;
}

export interface FetchResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  html: string;
  headers: Record<string, string>;
  redirectChain: string[];
  loadTimeMs: number;
  timedOut: boolean;
  rateLimited: boolean;
  error: string | null;
}

export async function fetchPage(url: string, referer?: string): Promise<FetchResult> {
  const proxy = getNextProxy();
  const axiosConfig = buildAxiosConfig(proxy ?? undefined);

  const headers = {
    'User-Agent': getRandomUA(),
    ...getRandomizedHeaders(referer),
  };

  const startTime = Date.now();
  const redirectChain: string[] = [url];

  const instance: AxiosInstance = axios.create(axiosConfig);

  instance.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
    cfg.headers = cfg.headers ?? {};
    Object.assign(cfg.headers, headers);
    return cfg;
  });

  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      if (response.request?.res?.responseUrl && response.request.res.responseUrl !== url) {
        redirectChain.push(response.request.res.responseUrl as string);
      }
      return response;
    }
  );

  try {
    const response = await withRetry(
      () => instance.get<string>(url),
      {
        maxRetries: config.maxRetries,
        onRetry: (attempt, err) => {
          console.warn(`[http] Retry ${attempt}/${config.maxRetries} for ${url}: ${err.message}`);
        },
      }
    );

    const loadTimeMs = Date.now() - startTime;
    const finalUrl = response.request?.res?.responseUrl ?? url;
    const html = typeof response.data === 'string' ? response.data : '';

    return {
      url,
      finalUrl: finalUrl as string,
      statusCode: response.status,
      html,
      headers: Object.fromEntries(
        Object.entries(response.headers).map(([k, v]) => [k, String(v)])
      ),
      redirectChain,
      loadTimeMs,
      timedOut: false,
      rateLimited: response.status === 429,
      error: null,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const timedOut = error.message.includes('timeout') || error.message.includes('ETIMEDOUT');
    return {
      url,
      finalUrl: url,
      statusCode: 0,
      html: '',
      headers: {},
      redirectChain,
      loadTimeMs: Date.now() - startTime,
      timedOut,
      rateLimited: false,
      error: error.message,
    };
  }
}

export async function headRequest(url: string): Promise<{ exists: boolean; statusCode: number }> {
  const proxy = getNextProxy();
  const axiosConfig = buildAxiosConfig(proxy ?? undefined);

  try {
    const response = await axios.head(url, {
      ...axiosConfig,
      timeout: 5000,
      headers: { 'User-Agent': getRandomUA() },
    });
    return { exists: response.status < 400, statusCode: response.status };
  } catch {
    return { exists: false, statusCode: 0 };
  }
}

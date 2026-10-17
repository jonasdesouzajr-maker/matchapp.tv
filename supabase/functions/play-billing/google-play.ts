import { importPKCS8, SignJWT } from 'npm:jose@6.1.0';
import { PLAY_PACKAGE, PlayValidationError, object, validProductId, validPurchaseToken } from './play-policy.mjs';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PLAY_BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PLAY_PACKAGE}`;
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

type Credentials = { email: string; privateKey: string; keyId: string | null };
export function serviceCredentials(raw: string): Credentials | null {
  if (!raw || raw.length > 32_768) return null;
  try {
    const value = JSON.parse(raw);
    if (!object(value) || value.type !== 'service_account' || typeof value.client_email !== 'string' ||
        !/^[a-z0-9][a-z0-9-]{1,62}@[a-z0-9][a-z0-9.-]{3,100}\.iam\.gserviceaccount\.com$/.test(value.client_email) ||
        typeof value.private_key !== 'string' || value.private_key.length > 16_384 ||
        !/^-----BEGIN PRIVATE KEY-----\n[\s\S]+\n-----END PRIVATE KEY-----\n?$/.test(value.private_key) ||
        (value.private_key_id != null && (typeof value.private_key_id !== 'string' || !/^[a-f0-9]{16,128}$/.test(value.private_key_id)))) return null;
    return { email: value.client_email, privateKey: value.private_key, keyId: value.private_key_id ?? null };
  } catch (_) { return null; }
}

export class PlayProviderError extends Error {
  constructor(readonly status: number) { super('play_provider_unavailable'); this.name = 'PlayProviderError'; }
}

async function readJson(response: Response, limit = 65_536): Promise<unknown> {
  if (!response.ok) { await response.body?.cancel(); throw new PlayProviderError(response.status); }
  if (!response.body) throw new PlayProviderError(502);
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > limit) { await reader.cancel(); throw new PlayProviderError(502); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch (_) { throw new PlayProviderError(502); }
}

export class GooglePlayPublisher {
  private key: ReturnType<typeof importPKCS8> | null = null;
  private cachedToken: { token: string; expiresAt: number } | null = null;
  private authPending: Promise<string> | null = null;

  constructor(private readonly credentials: Credentials) {}

  private async bearer(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000) return this.cachedToken.token;
    if (this.authPending) return this.authPending;
    const task = this.exchangeToken();
    this.authPending = task;
    try { return await task; }
    finally { if (this.authPending === task) this.authPending = null; }
  }

  private async exchangeToken(): Promise<string> {
    if (!this.key) this.key = importPKCS8(this.credentials.privateKey, 'RS256');
    const now = Math.floor(Date.now() / 1000);
    const assertion = await new SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT', ...(this.credentials.keyId ? { kid: this.credentials.keyId } : {}) })
      .setIssuer(this.credentials.email).setAudience(TOKEN_URL).setIssuedAt(now).setExpirationTime(now + 3600)
      .sign(await this.key);
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 6500);
    try {
      const response = await fetch(TOKEN_URL, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
      });
      const value = await readJson(response, 16_384) as Record<string, unknown>;
      if (!object(value) || typeof value.access_token !== 'string' || !/^[\x21-\x7e]{32,8192}$/.test(value.access_token) ||
          value.token_type !== 'Bearer' || typeof value.expires_in !== 'number' ||
          !Number.isSafeInteger(value.expires_in) || value.expires_in < 120 || value.expires_in > 3600) throw new PlayProviderError(502);
      this.cachedToken = { token: value.access_token, expiresAt: Date.now() + value.expires_in * 1000 };
      return value.access_token;
    } finally { clearTimeout(timer); }
  }

  private async request(path: string, method: 'GET' | 'POST', signal: AbortSignal): Promise<Response> {
    const token = await this.bearer();
    if (signal.aborted) throw new PlayProviderError(504);
    return fetch(`${PLAY_BASE}${path}`, {
      method, redirect: 'error', signal,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
      ...(method === 'POST' ? { body: '{}' } : {})
    });
  }

  async getSubscription(purchaseToken: string, signal: AbortSignal): Promise<unknown> {
    if (!validPurchaseToken(purchaseToken)) throw new PlayValidationError('invalid_request');
    const response = await this.request(`/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`, 'GET', signal);
    return readJson(response);
  }

  async acknowledge(productId: string, purchaseToken: string, signal: AbortSignal): Promise<void> {
    if (!validProductId(productId) || !validPurchaseToken(purchaseToken)) throw new PlayValidationError('invalid_request');
    const response = await this.request(`/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`, 'POST', signal);
    if (!response.ok) { await response.body?.cancel(); throw new PlayProviderError(response.status); }
    await response.body?.cancel();
  }
}

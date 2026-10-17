import { createClient } from 'npm:@supabase/supabase-js@2.105.0';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@6.1.0';
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { verifiedLegacySubscription } from '../_shared/pro-legacy.mjs';
import { createBillingSession, createRetentionSession, verifyPlayPurchase } from './billing-core.mjs';
import { GooglePlayPublisher, PlayProviderError, serviceCredentials } from './google-play.ts';
import { PlayValidationError, playConfiguration, playSalesAllowed, requestBody, rtdnEnvelope, validUserId } from './play-policy.mjs';

const CANONICAL_ORIGIN = 'https://matchapp.tv';
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), {
  timeoutDuration: 5000, cooldownDuration: 30_000, cacheMaxAge: 3_600_000
});
const env = (name: string) => Deno.env.get(name) || '';
const delivered = new Map<string, number>();
let publisher: GooglePlayPublisher | null = null;
let legacyStripe: Stripe | null = null;

function legacyBillingClient(): Stripe {
  if (!legacyStripe) {
    const key = env('STRIPE_SECRET_KEY');
    if (!key) throw new PlayValidationError('legacy_status_unavailable', 503);
    legacyStripe = new Stripe(key, { apiVersion: '2025-01-27.acacia',
      httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 0, timeout: 6500 });
  }
  return legacyStripe;
}

function rtdnConfiguration() {
  if (env('PLAY_RTDN_ENABLED') !== 'true') return null;
  const audience = env('PLAY_RTDN_AUDIENCE'), email = env('PLAY_RTDN_SERVICE_ACCOUNT_EMAIL');
  const subscription = env('PLAY_RTDN_SUBSCRIPTION');
  const expectedAudience = `${env('SUPABASE_URL')}/functions/v1/play-billing?route=rtdn`;
  if (!audience || audience !== expectedAudience ||
      !/^[a-z0-9][a-z0-9-]{1,62}@[a-z0-9][a-z0-9.-]{3,100}\.iam\.gserviceaccount\.com$/.test(email) ||
      !/^projects\/[a-z0-9][a-z0-9.-]{3,100}\/subscriptions\/[A-Za-z][A-Za-z0-9._~+%-]{2,254}$/.test(subscription)) return null;
  return { audience, email, subscription };
}

function bearer(req: Request): string {
  const header = req.headers.get('authorization') || '';
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(header);
  if (!match || match[1].length < 100 || match[1].length > 8192) throw new PlayValidationError('sign_in_required', 401);
  return match[1];
}

async function bodyJson(req: Request, signal: AbortSignal): Promise<unknown> {
  if (!(req.headers.get('content-type') || '').toLowerCase().startsWith('application/json') || !req.body) {
    throw new PlayValidationError('invalid_request');
  }
  const length = Number(req.headers.get('content-length'));
  if (Number.isFinite(length) && length > 32_768) throw new PlayValidationError('request_too_large', 413);
  const reader = req.body.getReader(), chunks: Uint8Array[] = [];
  const abortRead = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abortRead, { once: true });
  let total = 0;
  try {
    while (true) {
      if (signal.aborted) throw new PlayValidationError('request_timeout', 408);
      const { done, value } = await reader.read();
      if (signal.aborted) throw new PlayValidationError('request_timeout', 408);
      if (done) break;
      total += value.length;
      if (total > 32_768) { await reader.cancel(); throw new PlayValidationError('request_too_large', 413); }
      chunks.push(value);
    }
  } finally { signal.removeEventListener('abort', abortRead); reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch (_) { throw new PlayValidationError('invalid_request'); }
}

function rememberDelivery(key: string) {
  const now = Date.now();
  for (const [stored, expiry] of delivered) if (expiry <= now) delivered.delete(stored);
  while (delivered.size >= 512) delivered.delete(delivered.keys().next().value!);
  delivered.set(key, now + 600_000);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const headers = {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization,apikey,x-client-info,content-type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    ...(origin === CANONICAL_ORIGIN ? { 'Access-Control-Allow-Origin': origin } : {})
  };
  const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
  if (origin && origin !== CANONICAL_ORIGIN) return reply({ ok: false, error: 'origin_not_allowed' }, 403);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply({ ok: false, error: 'method_not_allowed' }, 405);
  const route = new URL(req.url).searchParams;
  const rtdn = route.size === 1 && route.get('route') === 'rtdn';
  if (route.size > 0 && !rtdn) return reply({ ok: false, error: 'invalid_request' }, 400);
  const controller = new AbortController(), deadline = setTimeout(() => controller.abort(), 18_000);
  try {
    const config = playConfiguration(env), rtdnConfig = rtdnConfiguration();
    const url = env('SUPABASE_URL'), anon = env('SUPABASE_ANON_KEY'), service = env('SUPABASE_SERVICE_ROLE_KEY');
    if (!config || !url || !anon || !service) return reply({ ok: false, error: 'configuration_unavailable' }, 503);
    if (!publisher) {
      const credentials = serviceCredentials(env('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON'));
      if (!credentials) return reply({ ok: false, error: 'configuration_unavailable' }, 503);
      publisher = new GooglePlayPublisher(credentials);
    }
    const clientFetch: typeof fetch = (input, init) => fetch(input, { ...init, signal: controller.signal });
    const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: clientFetch } };
    const admin = createClient(url, service, options);
    const rpc = async (name: string, args: Record<string, unknown>) => {
      const response = await admin.rpc(name, args);
      if (response.error) throw new PlayValidationError('verification_unavailable', 503);
      return response.data;
    };
    const currentPublisher = publisher;
    const dependencies = {
      now: Date.now,
      getState: (userId: string) => rpc('get_pro_billing_state', { p_user_id: userId }),
      canStartPurchase: async (userId: string) => {
        const settings = await rpc('get_matchapp_user_monetization_config', { p_user_id: userId });
        if (!playSalesAllowed(userId, config, settings, Date.now(), rtdnConfig !== null)) return false;
        const legacy = await verifiedLegacySubscription(admin, legacyBillingClient(), userId);
        return legacy.hasLegacySubscription === false;
      },
      bindAccount: (userId: string, accountId: string) => rpc('bind_play_billing_account', { p_user_id: userId, p_obfuscated_id: accountId }),
      accountUser: (accountId: string) => rpc('get_play_billing_account_user', { p_obfuscated_id: accountId }),
      getRecord: (hash: string) => rpc('get_pro_entitlement_by_external_id', { p_provider: 'play', p_external_id: hash }),
      reserveOffer: (values: Record<string, unknown>) => rpc('reserve_play_pro_offer', values),
      redeemOffer: (values: Record<string, unknown>) => rpc('redeem_play_pro_offer', values),
      upsert: (values: Record<string, unknown>) => rpc('upsert_pro_entitlement', values),
      getSubscription: (token: string) => currentPublisher.getSubscription(token, controller.signal),
      acknowledge: (product: string, token: string) => currentPublisher.acknowledge(product, token, controller.signal)
    };

    if (rtdn) {
      if (!rtdnConfig || origin) return reply({ ok: false, error: 'notification_unavailable' }, 503);
      const token = bearer(req);
      let claims;
      try {
        ({ payload: claims } = await jwtVerify(token, GOOGLE_JWKS, {
          algorithms: ['RS256'], issuer: ['https://accounts.google.com', 'accounts.google.com'],
          audience: rtdnConfig.audience, maxTokenAge: '65m', clockTolerance: 30
        }));
      } catch (_) { return reply({ ok: false, error: 'notification_unauthorized' }, 401); }
      if (claims.email !== rtdnConfig.email || claims.email_verified !== true ||
          typeof claims.sub !== 'string' || !/^[0-9]{1,32}$/.test(claims.sub)) {
        return reply({ ok: false, error: 'notification_unauthorized' }, 401);
      }
      const notice = rtdnEnvelope(await bodyJson(req, controller.signal), rtdnConfig.subscription, Date.now());
      const deliveryKey = `${rtdnConfig.subscription}:${notice.messageId}`;
      if ((delivered.get(deliveryKey) || 0) > Date.now()) return reply({ ok: true, duplicate: true });
      if (notice.kind === 'test' || notice.kind === 'ignored') {
        rememberDelivery(deliveryKey);
        return reply({ ok: true, test: notice.kind === 'test', ignored: notice.kind === 'ignored' });
      }
      try {
        const result = await verifyPlayPurchase({ purchaseToken: notice.purchaseToken,
          providerEventTime: notice.eventTime, config }, dependencies);
        if (result.entitled && !result.acknowledged) return reply({ ok: false, error: 'acknowledgement_pending' }, 503);
        rememberDelivery(deliveryKey);
        return reply({ ok: true, reconciled: true });
      } catch (error) {
        if (error instanceof PlayValidationError && ['unsupported_product', 'unsupported_plan', 'test_purchase_not_allowed'].includes(error.code)) {
          rememberDelivery(deliveryKey);
          return reply({ ok: true, ignored: true });
        }
        throw error;
      }
    }

    const token = bearer(req);
    const auth = createClient(url, anon, { ...options, global: { fetch: clientFetch, headers: { Authorization: `Bearer ${token}` } } });
    const { data, error } = await auth.auth.getUser(token);
    const user = data?.user;
    if (error || !user || !validUserId(user.id) || user.is_anonymous === true) return reply({ ok: false, error: 'sign_in_required' }, 401);
    const body = requestBody(await bodyJson(req, controller.signal), config.productId);
    if (await rpc('reserve_play_billing_request', { p_user_id: user.id }) !== true) {
      return reply({ ok: false, error: 'please_wait' }, 429);
    }
    if (body.action === 'session') {
      // Actual admission still requires service-read policy and catalog in canStartPurchase.
      // QA preparation additionally needs the exact environment tester allowlist.
      // Existing purchase verification remains available if new sales are paused.
      return reply(await createBillingSession(user.id, { ...config,
        purchasesEnabled: (config.purchasesEnabled || (config.qaEnabled && config.testUserIds.includes(user.id))) &&
          rtdnConfig !== null }, dependencies));
    }
    if (body.action === 'retention_session') {
      return reply(await createRetentionSession(user.id, body.purchaseToken, { ...config,
        purchasesEnabled: (config.purchasesEnabled || (config.qaEnabled && config.testUserIds.includes(user.id))) &&
          rtdnConfig !== null }, dependencies));
    }
    return reply(await verifyPlayPurchase({ purchaseToken: body.purchaseToken, expectedUserId: user.id, config }, dependencies));
  } catch (error) {
    const known = error instanceof PlayValidationError;
    const status = known ? error.status : error instanceof PlayProviderError && error.status === 429 ? 429 : 503;
    const code = known ? error.code : 'verification_unavailable';
    // Never log a JWT, Google credential, purchase token, provider body, or token-bearing URL.
    console.error(JSON.stringify({ event: 'play_billing_unavailable', route: rtdn ? 'rtdn' : 'user', code }));
    return reply({ ok: false, error: code }, status);
  } finally { clearTimeout(deadline); }
});

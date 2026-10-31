import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.105.0';
import {handleFounderSupport} from '../_shared/founder-support.mjs';

const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const db = createClient(Deno.env.get('SUPABASE_URL') || '', serviceKey);
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion:'2025-01-27.acacia', httpClient:Stripe.createFetchHttpClient()
});

async function reserve(req: Request) {
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim();
  const salt = Deno.env.get('RATE_LIMIT_SALT') || serviceKey;
  if (!ip || !salt) return false;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':founder:' + ip));
  const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const {data,error} = await db.rpc('check_ai_rate_limit', {p_key:'founder-support:' + key, p_limit:5});
  return !error && data?.allowed === true;
}

Deno.serve((req: Request) => handleFounderSupport(req, reserve,
  (params: Stripe.Checkout.SessionCreateParams) => stripe.checkout.sessions.create(params)));
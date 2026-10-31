// A founder contribution has no associated user, subscription or entitlement.
const campaign = 'founder_support';
const origins = new Set(['https://matchapp.tv', 'https://www.matchapp.tv']);
const languages = new Set(['en','pt','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']);

function returnUrl(language, status) {
  const url = new URL('https://matchapp.tv/founder/');
  url.searchParams.set('lang', language === 'pt' ? 'pt-BR' : language);
  if (status) url.searchParams.set('support', status);
  url.hash = 'help';
  return url.href;
}

function redirect(location) {
  return new Response(null, {status:303, headers:{Location:location, 'Cache-Control':'no-store'}});
}

function amountInCents(value) {
  if (typeof value !== 'string' || !/^\d{1,6}(\.\d{1,2})?$/.test(value)) return 0;
  const [dollars, fraction = ''] = value.split('.');
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, '0'));
  return cents >= 3000 ? cents : 0;
}

export function isFounderSupportSession(session) {
  return session?.metadata?.matchapp_campaign === campaign && session.mode === 'payment' &&
    !session.client_reference_id && !session.metadata.matchapp_product && !session.metadata.matchapp_user &&
    session.currency === 'usd' && Number.isSafeInteger(session.amount_total) && session.amount_total >= 3000;
}

export async function handleFounderSupport(req, reserve, createCheckout) {
  if (req.method !== 'POST') return new Response(null, {status:405, headers:{Allow:'POST'}});
  if (!origins.has(req.headers.get('origin'))) return new Response(null, {status:403});
  if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/x-www-form-urlencoded')
    return new Response(null, {status:415});
  if (Number(req.headers.get('content-length')) > 1024) return new Response(null, {status:413});

  let language = 'en';
  try {
    const reader = req.body?.getReader();
    if (!reader) return redirect(returnUrl(language, 'amount'));
    const bytes = new Uint8Array(1024);
    let size = 0;
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      if (size + value.byteLength > bytes.length) {
        await reader.cancel();
        return new Response(null, {status:413});
      }
      bytes.set(value, size);
      size += value.byteLength;
    }
    const form = new URLSearchParams(new TextDecoder().decode(bytes.subarray(0, size)));
    const requested = (form.get('lang') || '').toLowerCase().split('-')[0];
    if (languages.has(requested)) language = requested;
    const amount = form.getAll('amount').length === 1 ? amountInCents(form.get('amount')) : 0;
    if (!amount) return redirect(returnUrl(language, 'amount'));
    if (!await reserve(req)) return redirect(returnUrl(language, 'unavailable'));

    const session = await createCheckout({
      mode:'payment',
      locale: ['ar','hi'].includes(language) ? 'auto' : language === 'pt' ? 'pt-BR' : language,
      adaptive_pricing:{enabled:false},
      line_items:[{quantity:1, price_data:{currency:'usd', unit_amount:amount,
        product_data:{name:'Adv_Dev_Ops · Jonas Junior'}}}],
      metadata:{matchapp_campaign:campaign},
      success_url:returnUrl(language, ''), cancel_url:returnUrl(language, '')
    });
    const checkout = new URL(session.url);
    if (checkout.origin !== 'https://checkout.stripe.com' || checkout.username || checkout.password) throw Error();
    return redirect(checkout.href);
  } catch {
    return redirect(returnUrl(language, 'unavailable'));
  }
}
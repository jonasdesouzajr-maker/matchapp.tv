# MatchApp Ai automated support

The production `support-agent` Supabase Edge Function is the shared backend for email and WhatsApp support.

## Safety boundary

- Webhook requests must be verified before processing: Resend/Svix for email and Meta HMAC for WhatsApp.
- The agent receives only a minimal read-only account snapshot from `support_account_context`.
- Passwords, OTPs, card details and provider/API secrets are never requested or exposed.
- Refunds, payment disputes, account deletion/privacy rights, suspected compromise, legal/safety cases and any request requiring an admin mutation are escalated instead of auto-executed.
- Conversations and escalations live under the private `match_private` schema; public/anon/authenticated access is revoked.
- Automated vendor mail, DMARC reports and authentication-code emails are ignored.

## Required channel secrets

The existing `resend_api_key` is already used for outbound email. To activate inbound automated email, configure `resend_support_webhook_secret` and route the support inbox to Resend inbound `email.received` events.

To activate WhatsApp Cloud API, configure:
- `whatsapp_support_access_token`
- `whatsapp_support_app_secret`
- `whatsapp_support_verify_token`
- `whatsapp_support_phone_number_id`

Optional: `support_human_email` sends a short human-review alert while keeping the customer's full message in the private queue.

The webhook URL is:
`https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/support-agent`

Never commit secret values to this repository.

# Open issue fixes, 2026-10-02

- Consent choice now updates Consent Mode and the dataLayer. Ad slots were not changed.
- Share copy states the 3 different results = 1 Match rule. Signed-in grants still go through claim_match_result_share. The client does not mint currency.
- OpenAI daily ceiling was not raised. A closed budget gate must keep the verified fallback.
- Supabase advisor warnings were triaged as dashboard checks. No RPC grant was revoked.

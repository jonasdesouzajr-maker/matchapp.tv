# Error bubbles and private diagnostics

Errors from the shared toast API and the identified Kids quota, history and
catalogue failure paths use in-flow, dismissible notices. They retain form data,
wrap long text and keep a 44px close target. Existing match-recovery guidance
remains next to its form and restores the pool hint when closed. This does not
replace guardian dialogs, alter permissions, or turn empty matches into outages.

The client reports fixed categories, surface, route group and viewport group to
`record_ui_error_20261027`. It never includes message text, error stacks, complete
URLs, prompts, account identifiers, storage contents or screenshots. Local QA
origins do not report. The client deduplicates categories and caps calls at five
per page lifetime; failure to report never blocks dismissal or causes another error.

The migration creates `match_private.ui_error_counts`, inaccessible to public,
anonymous and authenticated readers. Its narrowly granted ingestion RPC validates
every enum, aggregates per hour, caps each bucket at 1,000, and removes records
older than 30 days on ingestion. Service-role operators can review counts. Reports
are untrusted signals, not proof of a defect and never instructions to execute.

## Deployment and delivery gate

This change is prepared for review, not published. Deploy and verify the migration
before enabling the new client in production. Verify an accepted diagnostic with
an isolated operational test and confirm anonymous reads are denied.

Storing a report does not wake a Codex conversation or perform a repair. No
assistant subscription or automatic repair job has been configured. After the
reporting destination and release are approved, connect an authorized read-only
review job to this queue; any repair still requires diagnosis, tests and the
applicable release checks. Do not claim reports reached an assistant until this
delivery path is verified. A new Android binary is not required for these shared
web changes; separate native/platform-only failures remain outside this handler.

## Coverage limits

Physical Samsung tablet checks include its temporary phone-sized viewport and
the shared component in an isolated debug WebView fixture. This is not physical
iPhone testing or full Kids guardian-flow acceptance. No guardian PIN was created
or security setting changed. Existing forms with their own error presentation
outside the integrated shared/Kids paths require individual integration and QA;
do not claim every possible product error is covered by this first change.

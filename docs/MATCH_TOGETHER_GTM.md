# Match Together — focused go-to-market plan

Effective: 2026-09-17

This plan deliberately does **not** change the working Match Together product flow. It defines the messaging, landing-page brief and acquisition experiments to run after the critical remediation is stable.

## Positioning

Primary promise:

> Stop scrolling separately. Tell MatchApp what each of you wants, and Match Together finds one title you can both agree on.

Supporting message:

- Two people submit preferences.
- The second person does not need to create an account just to participate.
- The outcome is one shared entertainment recommendation, not another endless catalog.

Avoid positioning Match Together as a giant streaming catalog or JustWatch/Reelgood replacement. The differentiation is **agreement + decision reduction**.

## Landing-page brief

Keep the page focused on one action. Recommended sequence:

1. **Hero:** “One choice you’ll both actually watch.”
2. **Three-step explainer:** Start a session → share the code/link → get one shared match.
3. **Trust detail:** the invited participant does not need an account to submit preferences.
4. **Example use cases:** couples, roommates, friends, family movie night.
5. **Primary CTA:** Start Match Together.
6. **Secondary CTA:** Try a solo match.

Do not add new verticals or unrelated feature sections to this page.

## Onboarding flow

Preserve the existing mechanics. Optimize only copy and measurement first:

1. Host starts Match Together.
2. Host selects preferences and gets a shareable session code/link.
3. Guest opens link, sees a short explanation, submits preferences without mandatory account creation.
4. Both receive the shared recommendation.
5. Post-result prompt offers Watch Later / another shared match using existing capabilities.

Measurement events to use if/when analytics instrumentation is approved:

- `together_start`
- `together_invite_created`
- `together_guest_joined`
- `together_guest_submitted`
- `together_match_completed`
- `together_watch_later`
- `together_repeat_session`

Do not add child-directed tracking to Kids Mode as part of this work.

## Paid acquisition experiment 1 — Couples / decision fatigue

**Hypothesis:** users respond to the pain of spending more time choosing than watching.

Creative message:

> “Still scrolling 30 minutes later? Tell MatchApp what both of you want. Match Together picks one.”

Destination: dedicated Match Together landing page.

Primary KPI: completed Match Together sessions per landing-page visitor.
Secondary KPIs: guest-join rate and cost per completed shared match.

Do not optimize to clicks alone.

## Paid acquisition experiment 2 — Friends / roommates

**Hypothesis:** broader shared-decision framing performs differently from romantic-couple framing.

Creative message:

> “Different tastes. One screen. One match.”

Audience/creative should show friends or roommates rather than a couple.

Destination and funnel stay identical to Experiment 1 so the message is the principal variable.

Primary KPI: completed Match Together sessions per landing-page visitor.
Secondary KPI: repeat shared-session rate within 7 days.

## 30-day experiment rules

- Run only after pricing, Android, indexing and catalog-quality P0 checks are green.
- Keep product mechanics fixed during each experiment window.
- Change one major message variable at a time.
- Record a clean baseline before paid traffic starts.
- Do not declare a winner from tiny samples; use directional findings to decide the next test.
- Do not add another entertainment vertical as an acquisition response.

## Success definition

The GTM is working when Match Together produces an improving sequence of:

landing visit → session start → guest join → both submit → shared match → repeat shared session.

The product should be marketed as a faster agreement engine, not as an exhaustive catalog browser.

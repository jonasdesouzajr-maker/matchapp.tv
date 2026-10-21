# Activity localization and touch targets

## Confirmed defects and adjustments

`activity.js` rendered its empty state, event labels, relative timestamps,
count, deletion confirmation/toast and accessibility text in English regardless
of the selected language. It now contains authored presentation strings for all
14 supported locales and follows the existing selected-language preference and
language-change event. `Intl.RelativeTimeFormat` and `Intl.NumberFormat` format
time and counts in that language. A localized date is used when relative-time
formatting is unavailable; an unreadable legacy timestamp displays an em dash
so one invalid timestamp cannot abort rendering the entire list.

The local-record read/write/capture, filtering, retention, deletion and cloud
contracts remain unchanged. Original event details and metadata remain exact,
including user titles/questions and existing machine-record strings. “Clear
all” still requires confirmation; cancellation performs no deletion.

Populated records revealed 24 × 24 px deletion buttons. A narrowly scoped
`#activity-list .activity-del` adjustment in `patches/reference-pages.css`
provides 48 × 48 px touch targets while keeping each visible × mark and its
quiet ring at 24 px. Below 480 px, the relative timestamp sits beneath the
record detail and the original text wraps inside the existing row.

## Verification

Passed:

```text
node --test tests/activity-language-20261021.test.cjs tests/history-visible-records-20261021.test.cjs tests/native-local-refresh-20261021.test.cjs
node --check activity.js
git diff --check -- activity.js patches/reference-pages.css tests/activity-language-20261021.test.cjs
```

The new Activity test file covers all 14 languages, all 10 event types, selected
language precedence, locale-aware timestamps/counts, filter and node state,
escaping original title content, unchanged stored records, cancelled and
confirmed clear actions, per-entry removal, unchanged automatic capture,
unavailable relative-time support and unreadable legacy timestamps.

Three focused local Chromium cases rendered Portuguese empty and populated
states: 800 × 1180, 320 × 640, and 320 × 640 with the saved 1.4 font preference
(22.4 px root font). Every case had zero page or record-text overflow. All six
measured deletion targets were exactly 48 × 48 px, with a 12 px inset around
the 24 px visible mark and no larger outer ring. Stored fixture bytes remained
unchanged. See `report.json` and the `activity-pt-*-font*-*.png` screenshots.

External requests were blocked. The populated rows are isolated local fixtures,
not production activity or a live account test. Screenshot-only QA scrolls
brought the populated list into view without invoking deletion. All local
browser contexts, processes and servers were closed. The parent agent owns the
physical-device and final integration checks.

## Related History navigation diagnosis

The original `profile.js` tab function changed display and active classes, while
the existing shared hash-navigation owner alone scrolled to the selected panel.
Consequently, ordinary tab clicks could leave their panel below the fold. The
parent approved an explicit-click-only repair; the Android requirements agent
implemented it in `portfolio-history.js` and its focused tab-scroll tests.
Programmatic switching, hydration and local refresh retain their original
non-scrolling behavior.

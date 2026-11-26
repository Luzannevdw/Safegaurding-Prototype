# Safeguarding — Design Prototype

A static, front-end-only design prototype that replicates the visual design
of the internal **Safeguarding** admin tool. There is **no real backend,
authentication, or persistence** — everything is mock data and client-side
interactivity for demo purposes.

## Stack

Plain HTML/CSS/vanilla JS. No build tools, no framework, no dependencies.

## Structure

```
index.html          Login screen
summary.html         Summary page (default landing page after login)
summary-v2.html      Summary V2 — adds the internal reconciliation section
dashboard.html       Entities dashboard
css/styles.css        All styling (design tokens as CSS custom properties)
js/data.js            Seeded mock data generator + formatting helpers
js/login.js           Login form behaviour
js/summary.js         Summary page behaviour (sync times, period stepper, export)
js/reconciliation.js  Reconciliation scenarios + pure calculation layer
js/summary-v2.js      Summary V2 rendering, scenario switcher
js/dashboard.js       Dashboard table/filter/pagination behaviour
```

## Running it

No build step is required. Any static file server works, e.g.:

```bash
# Option 1: Python
python3 -m http.server 8080

# Option 2: Node (npx)
npx serve .
```

Then open `http://localhost:8080/index.html` in your browser.

You can also just double-click `index.html` to open it directly in a browser,
though running a local server avoids any potential quirks with relative
asset paths.

## Using the prototype

1. **Login** — the real Safeguarding tool uses SSO (a single "Log in"
   button that redirects to an identity provider, no email/password form).
   This prototype mirrors that: just click "Log in" to go straight to the
   Summary page — there's nothing to type in and nothing to validate.
2. **Left sidebar** — persistent across both pages: a "Currency" selector
   at the top, "Summary"/"Entities" navigation links below it, and the
   signed-in user's name + "Logout" pinned to the bottom.
3. **Summary page** (default landing page) — a read-only breakdown of the
   safeguarding position for the selected period: a date stepper + "Export"
   button, a period "Status" pill (Open/Opened date), and ~12 bordered
   card sections (Settlement account reconciliation, Held and released
   funds, Adjustments, Exception transactions, Transient funds, Manual
   safeguarding entries, Safeguarding requirement, Safeguarding insurance,
   Safeguarding account, etc.), each showing labelled rows with a bold
   total row where relevant.
4. **Summary V2** — the same summary, plus an **Internal reconciliation**
   section at the top that compares the safeguarding *requirement* against
   the safeguarding *resource* (safeguarded accounts + settlement accounts
   + allocated insurance), and states the outcome:
   **Matched**, **Surplus**, **Shortfall** or **Incomplete**.
   - A single timestamp (00:00 UTC on the selected date) applies to every
     ledger data point in the reconciliation (to be confirmed with OPEX).
   - Requirement and resource breakdowns are collapsed by default and
     expand on demand. Manual entries show inline in the requirement
     breakdown; account-level resource detail is one level deeper.
   - Export uses the existing PDF "Export" button; there is no CSV export.
   - A dashed **"Prototype scenarios"** panel (bottom right, development
     only — not part of the product UI) switches between the four
     scenarios so each outcome state can be reviewed.
   - All arithmetic is performed in integer pence; pounds only appear at
     the formatting boundary. Unavailable values render as "—" and are
     never silently treated as £0.00.
5. **Entities dashboard** — the entity-level table:
   - Search by entity name or ID.
   - Toggle "Exclude Transient Funds" and "Show entities with zero or
     negative balance" checkboxes to filter the table.
   - "Reset" clears all filters and search back to defaults.
   - "Legend" opens a popover explaining the entity status colour chips.
   - Table is horizontally scrollable (20 columns) with the "Entity status"
     and "Entity name" columns frozen/sticky on the left, and a bold
     "Totals" row pinned just below the header.
   - Pagination controls (page size selector + First/Previous/Next/Last)
     paginate the (filtered) mock rows.
   - "Logout" returns to the login screen.

## Notes

- Mock data (~19 entities) is generated with a seeded pseudo-random
  generator in `js/data.js`, so values are stable across page reloads.
- Design tokens (colors, fonts, spacing, exact logo SVGs, sidebar layout,
  card structure) were verified against a real authenticated snapshot of
  the live app (an exported HTML page of the Summary screen), so the
  header, sidebar, login screen, Summary page, and Entities dashboard
  chrome are a close match to production — including the sidebar
  navigation (rather than top tabs), the pale-teal "Status" pill, and the
  bordered card sections used throughout the Summary page. Row labels and
  amounts on the Summary page reuse the real section names/labels from
  that snapshot with representative demo figures.
- `assets/dojo-mark-white.svg` (header logo) and
  `assets/dojo-wordmark-dark.svg` (login screen logo) are the exact vector
  marks used by the real app.
- The real "DOJO Roobert" typeface is used (`assets/fonts/`), sourced from
  the same publicly-hosted asset bucket the live app itself loads on its
  own login screen. "Inter" (via Google Fonts) is kept only as a safety-net
  fallback in case the local font files fail to load.
- This is a visual/interaction prototype only — do not use it as a source
  of truth for real safeguarding figures.

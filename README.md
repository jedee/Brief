# Brief

A case, deadline, hearing and fee manager for a Nigerian law practice. It runs in the browser and works on a phone in court as well as on a desk.

**Open it:** https://jedee.github.io/new/

## What it does

- **Today:** what is overdue, what falls due this week, where you are in court, and how much in fees is still owed.
- **Matters:** suit number, court, division, judge, parties, opposing counsel and notes, with search and status filters.
- **Deadline calculator:** pick a rule, such as *File Statement of Defence, 21 days from service*, and enter the trigger date. Brief works out the due date and explains how:
  - the day of the triggering event is excluded;
  - periods can be counted in calendar days, working days only, or months;
  - when the last day falls on a weekend or public holiday, the deadline moves to the next open day (each rule can turn this off).
- **Court calendar:** Nigerian fixed public holidays plus Good Friday and Easter Monday are built in. You add Eid and other declared holidays in Settings.
- **Hearings:** record what happened at each sitting. Enter the adjourned date and the next hearing is added automatically.
- **Fees:** charges and payments per matter in naira, with a running balance. Amounts can be typed as `250000`, `250,000`, `250k` or `1.2m`.
- **Documents:** fill a template from a matter's details, then copy it, print it to PDF or download it for Word. Built-in templates: letter of demand, letter for adjournment, final written address outline and a short-form tenancy agreement.
- **Calendar:** a month view of every hearing and deadline, which becomes a day-by-day list on phones.
- **Backups:** download everything as one JSON file, and restore it on any device.

> **The deadline periods that come with Brief are examples.** Set each one from the rules of court or statute you rely on (Settings → Deadline rules). Brief does the arithmetic. You decide the law.

## Your data

Everything is stored in the browser's local storage on the device you use. Nothing is sent to a server. As a result:

- clearing the browser's site data deletes your records, so **download a backup regularly** (Settings → Your data);
- to move to another computer or phone, download a backup on one and restore it on the other.

## Running it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm test           # unit tests (date arithmetic, holidays, money, templates, backups)
npm run build      # type-check and build to dist/
npm run preview    # serve the built app
```

The build uses relative paths and hash routing, so `dist/` can be hosted anywhere static: GitHub Pages, Netlify, or a folder on a shared drive.

Every push to `main` runs the tests and publishes the app to GitHub Pages (`.github/workflows/deploy.yml`). A push with failing tests is not published.

## Writing templates

Templates are plain text with placeholders in double braces:

| Write | Gets |
| --- | --- |
| `{{client}}` | the matter's client |
| `{{court\|upper}}` | the court name in capitals |
| `{{firm_phone\|optional}}` | the firm phone, or nothing; a line left empty is removed |
| `{{anything_else}}` | a box to type into when you prepare the document |

Fields filled in automatically include `today`, `today_deed` (“13th day of November, 2026”), `firm_name`, `firm_address`, `counsel_name`, `matter_title`, `suit_number`, `court`, `division`, `judge`, `client`, `client_role`, `opposing_party`, `opposing_role`, `opposing_counsel`, `claimant`, `defendant`, `claimant_label`, `defendant_label`, `hearing_date` and `hearing_purpose`. The template editor lists them all, and clicking one inserts it.

`claimant` and `defendant` follow the side you act for, so a court heading comes out right whether you act for the claimant or the defendant.

## Project layout

```
src/
  types.ts                 data model
  store.tsx                state, saving to the browser, backup/restore
  lib/dates.ts             date arithmetic, holidays, deadline calculation
  lib/templates.ts         placeholder filling
  lib/money.ts             naira formatting and amount parsing
  lib/seed.ts              example rules, built-in templates, sample matters
  pages/                   Today, Matters, Matter, Calendar, Documents, Settings
  components/              shared UI, matter tabs, document generator
```

## Ideas for later

- Optional sign-in and cloud sync, so a chambers can share one diary.
- Reminders by email or WhatsApp the day before a hearing or deadline.
- Court vacation periods in the calendar.
- A printable weekly cause list.
- Invoices and receipts generated from the fees ledger.

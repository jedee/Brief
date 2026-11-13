import type { Firm, Hearing, ISODate, Matter } from '../types';
import { formatDate } from './dates';

/** {{name}} or {{name|upper}} */
const PLACEHOLDER = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*(?:\|\s*([a-z]+)\s*)?\}\}/g;

const FILTERS: Record<string, (s: string) => string> = {
  upper: (s) => s.toUpperCase(),
  lower: (s) => s.toLowerCase(),
  title: (s) => s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase()),
};

/** Unique placeholder names in the order they first appear. */
export function placeholders(body: string): string[] {
  const seen = new Set<string>();
  for (const m of body.matchAll(PLACEHOLDER)) seen.add(m[1]);
  return [...seen];
}

/** "monthly_rent" → "Monthly rent" */
export function labelFor(name: string): string {
  const known = FIELD_HELP[name]?.label;
  if (known) return known;
  const words = name.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Names used with |optional anywhere in the body. Optional fields may be left blank. */
export function optionalPlaceholders(body: string): Set<string> {
  const names = new Set<string>();
  for (const m of body.matchAll(PLACEHOLDER)) if (m[2] === 'optional') names.add(m[1]);
  return names;
}

/**
 * Replace placeholders. Anything left blank shows as [Label] so it stands out,
 * except {{name|optional}}, which disappears; a line left empty by optional
 * fields is removed entirely.
 */
export function fillTemplate(body: string, values: Record<string, string>): string {
  const lines: string[] = [];
  for (const line of body.split('\n')) {
    let hadOptional = false;
    const filled = line.replace(PLACEHOLDER, (_all, name: string, filter?: string) => {
      const raw = values[name]?.trim();
      if (filter === 'optional') {
        hadOptional = true;
        return raw ?? '';
      }
      if (!raw) return `[${labelFor(name)}]`;
      const fn = filter ? FILTERS[filter] : undefined;
      return fn ? fn(raw) : raw;
    });
    if (hadOptional && !filled.trim()) continue;
    lines.push(hadOptional ? filled.replace(/\s+$/, '') : filled);
  }
  return lines.join('\n');
}

/** Placeholders the app can fill in by itself, with a short description for the editor. */
export const FIELD_HELP: Record<string, { label: string; help: string }> = {
  today: { label: 'Today', help: 'e.g. 13th November, 2026' },
  today_deed: { label: 'Today (deed style)', help: 'e.g. 13th day of November, 2026' },
  firm_name: { label: 'Firm name', help: 'From Settings' },
  firm_address: { label: 'Firm address', help: 'From Settings' },
  firm_phone: { label: 'Firm phone', help: 'From Settings' },
  firm_email: { label: 'Firm email', help: 'From Settings' },
  counsel_name: { label: 'Counsel name', help: 'From Settings' },
  matter_title: { label: 'Matter title', help: 'e.g. Adeyemi v. Crestline Homes Ltd' },
  reference: { label: 'Our reference', help: 'Internal file reference' },
  suit_number: { label: 'Suit number', help: '' },
  court: { label: 'Court', help: 'e.g. High Court of the Federal Capital Territory' },
  division: { label: 'Judicial division', help: 'e.g. Abuja Judicial Division' },
  judge: { label: 'Judge', help: '' },
  client: { label: 'Client', help: '' },
  client_role: { label: "Client's role", help: 'e.g. Claimant, Defendant' },
  opposing_party: { label: 'Opposing party', help: '' },
  opposing_role: { label: "Opposing party's role", help: '' },
  opposing_counsel: { label: 'Opposing counsel', help: '' },
  claimant: { label: 'Claimant', help: 'Whoever is on the claimant side' },
  defendant: { label: 'Defendant', help: 'Whoever is on the defendant side' },
  claimant_label: { label: 'Claimant label', help: 'Claimant / Plaintiff / Applicant / Appellant' },
  defendant_label: { label: 'Defendant label', help: 'Defendant / Respondent' },
  hearing_date: { label: 'Next hearing date', help: 'Next hearing on the matter' },
  hearing_purpose: { label: 'Next hearing purpose', help: '' },
};

/** Values the app knows from the matter, the firm settings and today's date. */
export function knownValues(
  firm: Firm,
  today: ISODate,
  matter?: Matter,
  nextHearing?: Hearing,
): Record<string, string> {
  const values: Record<string, string> = {
    today: formatDate(today, 'letter'),
    today_deed: formatDate(today, 'deed'),
    firm_name: firm.name,
    firm_address: firm.address,
    firm_phone: firm.phone,
    firm_email: firm.email,
    counsel_name: firm.counselName,
  };
  if (!matter) return values;

  const ours = matter.side === 'claimant';
  const clientRole = ours ? matter.claimantLabel : matter.defendantLabel;
  const opposingRole = ours ? matter.defendantLabel : matter.claimantLabel;
  Object.assign(values, {
    matter_title: matter.title,
    reference: matter.reference,
    suit_number: matter.suitNumber,
    court: matter.court,
    division: matter.division,
    judge: matter.judge,
    client: matter.client,
    client_role: clientRole,
    opposing_party: matter.opposingParty,
    opposing_role: opposingRole,
    opposing_counsel: matter.opposingCounsel,
    claimant: ours ? matter.client : matter.opposingParty,
    defendant: ours ? matter.opposingParty : matter.client,
    claimant_label: matter.claimantLabel,
    defendant_label: matter.defendantLabel,
  });
  if (nextHearing) {
    values.hearing_date = formatDate(nextHearing.date, 'letter');
    values.hearing_purpose = nextHearing.purpose;
  }
  return values;
}

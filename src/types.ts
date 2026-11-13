/** A calendar date with no time or timezone, written as YYYY-MM-DD. */
export type ISODate = string;

/** Money is stored in kobo (₦1 = 100 kobo) so sums never drift. */
export type Kobo = number;

export type MatterType = 'Litigation' | 'Property' | 'Corporate' | 'Advisory' | 'Other';
export type MatterStatus = 'Active' | 'Pending' | 'Concluded' | 'Closed';
export type Side = 'claimant' | 'defendant';

export interface Matter {
  id: string;
  title: string;
  reference: string;
  type: MatterType;
  status: MatterStatus;
  client: string;
  clientPhone: string;
  clientEmail: string;
  /** Which side of the suit our client is on. */
  side: Side;
  /** e.g. Claimant, Plaintiff, Applicant, Appellant, Petitioner. */
  claimantLabel: string;
  /** e.g. Defendant, Respondent. */
  defendantLabel: string;
  opposingParty: string;
  opposingCounsel: string;
  court: string;
  division: string;
  judge: string;
  suitNumber: string;
  openedOn: ISODate;
  notes: string;
}

export interface Deadline {
  id: string;
  matterId: string;
  title: string;
  dueDate: ISODate;
  /** The event the period runs from (service, judgment…), if computed from a rule. */
  triggerDate?: ISODate;
  ruleId?: string;
  /** Plain-English explanation of how the due date was worked out. */
  basis?: string;
  done: boolean;
  doneOn?: ISODate;
  notes: string;
}

export interface Hearing {
  id: string;
  matterId: string;
  date: ISODate;
  time: string;
  purpose: string;
  outcome: string;
}

export interface Charge {
  id: string;
  matterId: string;
  date: ISODate;
  description: string;
  amount: Kobo;
}

export interface Payment {
  id: string;
  matterId: string;
  date: ISODate;
  amount: Kobo;
  method: string;
  reference: string;
}

/**
 * - calendar: count every day, then (optionally) roll forward off a closed day.
 * - working:  count only days the registry is open.
 * - months:   same date N months later (clamped to month end).
 */
export type Counting = 'calendar' | 'working' | 'months';

export interface DeadlineRule {
  id: string;
  name: string;
  trigger: string;
  days: number;
  counting: Counting;
  rollForward: boolean;
  court: string;
  note: string;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  body: string;
}

export interface Firm {
  name: string;
  address: string;
  counselName: string;
  phone: string;
  email: string;
}

export interface Holiday {
  date: ISODate;
  name: string;
}

export interface CalendarSettings {
  /** 0 = Sunday … 6 = Saturday. */
  closedWeekdays: number[];
  includeStandardHolidays: boolean;
  customHolidays: Holiday[];
  /** Deadlines within this many days are flagged as "due soon". */
  warnDays: number;
}

export interface Data {
  version: 1;
  firm: Firm;
  calendar: CalendarSettings;
  matters: Matter[];
  deadlines: Deadline[];
  hearings: Hearing[];
  charges: Charge[];
  payments: Payment[];
  rules: DeadlineRule[];
  templates: Template[];
}

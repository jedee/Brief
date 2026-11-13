import type { Data, DeadlineRule, ISODate, Template } from '../types';
import { addDays, weekday } from './dates';
import { uid } from './id';

const EXAMPLE = 'Example period. Check it against the rules of court or statute that govern the matter and edit as needed.';

export const defaultRules: DeadlineRule[] = [
  { id: 'rule-defence', name: 'File Statement of Defence', trigger: 'Service of originating process', days: 21, counting: 'calendar', rollForward: true, court: '', note: EXAMPLE },
  { id: 'rule-reply', name: 'File Reply to Statement of Defence', trigger: 'Service of Statement of Defence', days: 14, counting: 'calendar', rollForward: true, court: '', note: EXAMPLE },
  { id: 'rule-counter-affidavit', name: 'File Counter-Affidavit and Written Address', trigger: 'Service of motion on notice', days: 7, counting: 'calendar', rollForward: true, court: '', note: EXAMPLE },
  { id: 'rule-reply-on-points', name: 'File Reply on Points of Law', trigger: "Service of opponent's Written Address", days: 7, counting: 'calendar', rollForward: true, court: '', note: EXAMPLE },
  { id: 'rule-final-address', name: 'File Final Written Address', trigger: 'Close of evidence / order of court', days: 21, counting: 'calendar', rollForward: true, court: '', note: EXAMPLE },
  { id: 'rule-appeal-interlocutory', name: 'File Notice of Appeal (interlocutory decision)', trigger: 'Delivery of ruling', days: 14, counting: 'calendar', rollForward: true, court: 'Court of Appeal', note: EXAMPLE },
  { id: 'rule-appeal-final', name: 'File Notice of Appeal (final decision)', trigger: 'Delivery of judgment', days: 3, counting: 'months', rollForward: true, court: 'Court of Appeal', note: EXAMPLE },
  { id: 'rule-owners-intention', name: "Owner's notice of intention to recover possession expires", trigger: 'Service of 7-day notice', days: 7, counting: 'calendar', rollForward: false, court: '', note: EXAMPLE },
  { id: 'rule-quit-yearly', name: 'Notice to quit expires (yearly tenancy)', trigger: 'Service of notice to quit', days: 6, counting: 'months', rollForward: false, court: '', note: EXAMPLE },
  { id: 'rule-demand', name: 'Demand letter period expires', trigger: 'Receipt of demand letter', days: 7, counting: 'calendar', rollForward: false, court: '', note: 'Whatever period the letter itself gives.' },
];

const signOff = `Yours faithfully,


______________________
{{counsel_name}}
For: {{firm_name}}`;

const letterhead = `{{firm_name|upper}}
{{firm_address}}
{{firm_phone|optional}}  {{firm_email|optional}}

Our Ref: {{reference}}
{{today}}`;

const courtHeading = `IN THE {{court|upper}}
IN THE {{division|upper}}
HOLDEN AT {{holden_at|upper}}

SUIT NO: {{suit_number}}

BETWEEN:

{{claimant|upper}} .............................. {{claimant_label|upper}}

AND

{{defendant|upper}} .............................. {{defendant_label|upper}}`;

export const defaultTemplates: Template[] = [
  {
    id: 'tpl-demand',
    name: 'Letter of demand',
    category: 'Letters',
    body: `${letterhead}

{{recipient_name}}
{{recipient_address}}

Dear Sir/Madam,

RE: DEMAND FOR {{subject|upper}}
OUR CLIENT: {{client|upper}}

We are Solicitors to {{client}} ("our Client"), on whose behalf and instruction we write.

Our Client instructs us that {{facts}}.

Despite repeated demands, the sum of {{amount}} remains outstanding.

TAKE NOTICE that unless the said sum is paid to our Client within {{days_to_comply}} days of your receipt of this letter, we have our Client's firm instructions to commence legal proceedings against you, without further recourse to you, to recover the said sum together with interest and the cost of the action.

We trust that you will treat this matter with the urgency it deserves.

${signOff}`,
  },
  {
    id: 'tpl-adjournment',
    name: 'Letter for adjournment',
    category: 'Letters',
    body: `${letterhead}

The Chief Registrar,
{{court}},
{{division}}.

Attention: {{judge}}

Dear Sir/Madam,

RE: SUIT NO. {{suit_number}} — {{matter_title|upper}}
REQUEST FOR ADJOURNMENT

We are Counsel to the {{client_role}} in the above suit, which is fixed for {{hearing_purpose}} on {{hearing_date}}.

We respectfully request an adjournment of the matter because {{reason}}.

We regret any inconvenience this may cause the Honourable Court. Counsel to the {{opposing_role}} is copied on this letter.

${signOff}

cc: {{opposing_counsel}}`,
  },
  {
    id: 'tpl-written-address',
    name: 'Final written address (outline)',
    category: 'Court processes',
    body: `${courtHeading}

{{client_role|upper}}'S FINAL WRITTEN ADDRESS

1.0  INTRODUCTION
1.1  This is the Final Written Address of the {{client_role}} in this suit.

2.0  BRIEF FACTS
2.1

3.0  ISSUE(S) FOR DETERMINATION
3.1  {{issue_for_determination}}

4.0  ARGUMENT
4.1

5.0  CONCLUSION
5.1  We urge this Honourable Court to resolve the issue(s) for determination in favour of the {{client_role}}.

Dated this {{today_deed}}.


______________________
{{counsel_name}}
{{firm_name}}
{{firm_address}}
Counsel to the {{client_role}}

FOR SERVICE ON:
{{opposing_counsel}}
Counsel to the {{opposing_role}}`,
  },
  {
    id: 'tpl-tenancy',
    name: 'Tenancy agreement (short form)',
    category: 'Property',
    body: `THIS TENANCY AGREEMENT is made this {{today_deed}}

BETWEEN

{{landlord_name|upper}} of {{landlord_address}} (hereinafter called "the Landlord", which expression shall where the context so admits include heirs, successors-in-title and assigns) of the one part;

AND

{{tenant_name|upper}} of {{tenant_address}} (hereinafter called "the Tenant", which expression shall where the context so admits include heirs, personal representatives and assigns) of the other part.

WHEREAS:
1.  The Landlord is the owner of the property known as {{premises}} ("the Premises").
2.  The Landlord has agreed to let, and the Tenant has agreed to take, the Premises on the terms below.

NOW THIS AGREEMENT WITNESSES as follows:

1.  TERM: The Landlord lets the Premises to the Tenant for a term of {{term}}, commencing on {{start_date}} and ending on {{end_date}}.

2.  RENT: The rent is {{rent}} per annum, payable in advance, receipt of which the Landlord acknowledges.

3.  SERVICE CHARGE AND CAUTION DEPOSIT: The Tenant shall pay a service charge of {{service_charge}} per annum and a refundable caution deposit of {{caution_deposit}}.

4.  THE TENANT COVENANTS:
    (a) to pay the rent and other charges as and when due;
    (b) to keep the interior of the Premises in good and tenantable repair, fair wear and tear excepted;
    (c) not to assign, sublet or part with possession of the Premises or any part of it without the Landlord's prior written consent;
    (d) to use the Premises for {{permitted_use}} purposes only;
    (e) not to make structural alterations without the Landlord's prior written consent;
    (f) to pay all utility bills for the Premises during the term;
    (g) to permit the Landlord or the Landlord's agents, on reasonable notice, to enter and inspect the Premises;
    (h) to yield up the Premises at the end of the term in good and tenantable repair.

5.  THE LANDLORD COVENANTS:
    (a) that the Tenant, paying the rent and performing the covenants, shall peaceably hold and enjoy the Premises without interruption;
    (b) to keep the structure and exterior of the Premises in good repair;
    (c) to pay all rates and taxes on the Premises other than those payable by the Tenant.

6.  RENEWAL: The Tenant may renew this tenancy on such terms as the parties may agree, by giving the Landlord written notice not less than {{renewal_notice}} before the term expires.

7.  DETERMINATION: Either party may determine this tenancy by giving the other the notice required by law. If the rent or any part of it remains unpaid for 21 days after it falls due, or the Tenant breaches any covenant, the Landlord may recover possession in accordance with the law.

8.  GOVERNING LAW: This Agreement is governed by the laws of the Federal Republic of Nigeria and the laws in force in {{state}}.

IN WITNESS WHEREOF the parties have set their hands the day and year first above written.

SIGNED by the LANDLORD                    SIGNED by the TENANT

______________________                    ______________________
{{landlord_name}}                         {{tenant_name}}

IN THE PRESENCE OF:                       IN THE PRESENCE OF:
Name: ________________                    Name: ________________
Address: _____________                    Address: _____________
Signature: ___________                    Signature: ___________


Prepared by:
{{counsel_name}}
{{firm_name}}
{{firm_address}}`,
  },
];

export function defaultData(): Data {
  return {
    version: 1,
    firm: { name: '', address: '', counselName: '', phone: '', email: '' },
    calendar: {
      closedWeekdays: [0, 6],
      includeStandardHolidays: true,
      customHolidays: [],
      warnDays: 7,
    },
    matters: [],
    deadlines: [],
    hearings: [],
    charges: [],
    payments: [],
    rules: defaultRules.map((r) => ({ ...r })),
    templates: defaultTemplates.map((t) => ({ ...t })),
  };
}

/** Fictional matters, dated around today so every screen has something to show. */
export function sampleData(today: ISODate): Pick<Data, 'matters' | 'deadlines' | 'hearings' | 'charges' | 'payments'> {
  // Dates n days from today, moved forward to a weekday so no hearing falls on a Sunday.
  const d = (n: number) => {
    let date = addDays(today, n);
    const step = n < 0 ? -1 : 1; // past dates move back, future dates move forward
    while (weekday(date) === 0 || weekday(date) === 6) date = addDays(date, step);
    return date;
  };
  const m1 = uid(), m2 = uid(), m3 = uid();
  return {
    matters: [
      {
        id: m1, title: 'Adeyemi v. Crestline Homes Ltd', reference: 'LIT/2026/014', type: 'Litigation', status: 'Active',
        client: 'Mrs. Funmilayo Adeyemi', clientPhone: '0803 000 0001', clientEmail: '',
        side: 'claimant', claimantLabel: 'Claimant', defendantLabel: 'Defendant',
        opposingParty: 'Crestline Homes Limited', opposingCounsel: 'K. Danjuma Esq., Danjuma & Partners',
        court: 'High Court of the Federal Capital Territory', division: 'Abuja Judicial Division', judge: 'Hon. Justice A. B. Okoro',
        suitNumber: 'FCT/HC/CV/1042/2026', openedOn: d(-120),
        notes: 'Claim for refund of purchase price and damages for failure to deliver a three-bedroom flat.',
      },
      {
        id: m2, title: 'Northgate Supplies Ltd v. Bello', reference: 'LIT/2026/021', type: 'Litigation', status: 'Active',
        client: 'Alhaji Sani Bello', clientPhone: '0805 000 0002', clientEmail: '',
        side: 'defendant', claimantLabel: 'Claimant', defendantLabel: 'Defendant',
        opposingParty: 'Northgate Supplies Limited', opposingCounsel: 'O. Nwachukwu Esq.',
        court: 'High Court of the Federal Capital Territory', division: 'Abuja Judicial Division', judge: 'Hon. Justice R. I. Adamu',
        suitNumber: 'FCT/HC/CV/2210/2026', openedOn: d(-24),
        notes: 'Debt recovery suit. Client disputes delivery of the second consignment.',
      },
      {
        id: m3, title: 'Recovery of premises — Plot 14, Gwarinpa', reference: 'PROP/2026/008', type: 'Property', status: 'Active',
        client: 'Musa Properties Ltd', clientPhone: '0809 000 0003', clientEmail: '',
        side: 'claimant', claimantLabel: 'Claimant', defendantLabel: 'Defendant',
        opposingParty: 'Mr. Tunde Okafor (tenant)', opposingCounsel: '',
        court: 'District Court of the Federal Capital Territory', division: 'Abuja', judge: '',
        suitNumber: '', openedOn: d(-200),
        notes: 'Yearly tenant in arrears. Notice to quit served; 7-day notice to follow on expiry.',
      },
    ],
    deadlines: [
      { id: uid(), matterId: m2, title: 'File Statement of Defence', dueDate: d(-1), triggerDate: d(-22), ruleId: 'rule-defence', basis: '21 days after service of the writ.', done: false, notes: 'Waiting on client for delivery notes. Consider motion for extension.' },
      { id: uid(), matterId: m1, title: 'File Reply to Statement of Defence', dueDate: d(4), triggerDate: d(-10), ruleId: 'rule-reply', basis: '14 days after service of the defence.', done: false, notes: '' },
      { id: uid(), matterId: m3, title: "Serve owner's 7-day notice of intention to recover possession", dueDate: d(9), done: false, notes: 'Notice to quit expires the day before.' },
      { id: uid(), matterId: m1, title: 'File witness statement on oath', dueDate: d(-30), done: true, doneOn: d(-31), notes: '' },
    ],
    hearings: [
      { id: uid(), matterId: m1, date: d(-21), time: '09:00', purpose: 'Mention', outcome: 'Adjourned for hearing of pending motion.' },
      { id: uid(), matterId: m1, date: d(2), time: '09:00', purpose: 'Hearing of motion for interlocutory injunction', outcome: '' },
      { id: uid(), matterId: m2, date: d(6), time: '10:00', purpose: 'Mention', outcome: '' },
      { id: uid(), matterId: m1, date: d(37), time: '09:00', purpose: 'Commencement of trial', outcome: '' },
    ],
    charges: [
      { id: uid(), matterId: m1, date: d(-120), description: 'Professional fee — first instalment', amount: 150_000_000 },
      { id: uid(), matterId: m1, date: d(-60), description: 'Filing fees and service', amount: 8_500_000 },
      { id: uid(), matterId: m2, date: d(-20), description: 'Professional fee', amount: 75_000_000 },
      { id: uid(), matterId: m3, date: d(-200), description: 'Recovery of premises — agreed fee', amount: 40_000_000 },
    ],
    payments: [
      { id: uid(), matterId: m1, date: d(-115), amount: 100_000_000, method: 'Bank transfer', reference: '' },
      { id: uid(), matterId: m1, date: d(-58), amount: 8_500_000, method: 'Bank transfer', reference: '' },
      { id: uid(), matterId: m3, date: d(-195), amount: 40_000_000, method: 'Cheque', reference: '' },
    ],
  };
}

import { describe, expect, it } from 'vitest';
import { amountInput, naira, parseAmount } from './money';
import { fillTemplate, knownValues, labelFor, placeholders } from './templates';
import { defaultTemplates } from './seed';
import { normalize, parseBackup, backupJSON } from '../store';
import type { Firm, Matter } from '../types';

describe('money', () => {
  it('formats kobo as naira', () => {
    expect(naira(46_000_000)).toBe('₦460,000.00');
    expect(naira(0)).toBe('₦0.00');
    expect(naira(150)).toBe('₦1.50');
  });

  it('parses what people type', () => {
    expect(parseAmount('460000')).toBe(46_000_000);
    expect(parseAmount('460,000')).toBe(46_000_000);
    expect(parseAmount('₦460,000.50')).toBe(46_000_050);
    expect(parseAmount('N250k')).toBe(25_000_000);
    expect(parseAmount('1.2m')).toBe(120_000_000);
    expect(parseAmount('0.1')).toBe(10);
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('12.3.4')).toBeNull();
  });

  it('round-trips amounts for editing', () => {
    expect(amountInput(46_000_000)).toBe('460000');
    expect(amountInput(46_000_050)).toBe('460000.50');
  });
});

const firm: Firm = { name: 'Okafor & Bello Chambers', address: '12 Example Close, Wuse II, Abuja', counselName: 'A. B. Okafor Esq.', phone: '', email: '' };
const matter: Matter = {
  id: 'm1', title: 'Northgate Supplies Ltd v. Bello', reference: 'LIT/1', type: 'Litigation', status: 'Active',
  client: 'Sani Bello', clientPhone: '', clientEmail: '', side: 'defendant', claimantLabel: 'Claimant', defendantLabel: 'Defendant',
  opposingParty: 'Northgate Supplies Limited', opposingCounsel: 'O. Nwachukwu Esq.', court: 'High Court of the Federal Capital Territory',
  division: 'Abuja Judicial Division', judge: 'Hon. Justice R. I. Adamu', suitNumber: 'FCT/HC/CV/2210/2026', openedOn: '2026-10-01', notes: '',
};

describe('templates', () => {
  it('lists placeholders once, in order', () => {
    expect(placeholders('{{a}} {{b|upper}} {{ a }} {{c_d}}')).toEqual(['a', 'b', 'c_d']);
  });

  it('fills values, applies filters and brackets blanks', () => {
    expect(fillTemplate('{{x|upper}} / {{x}} / {{y}}', { x: 'Abuja' })).toBe('ABUJA / Abuja / [Y]');
    expect(fillTemplate('{{name|title}}', { name: 'mrs. funmi adeyemi' })).toBe('Mrs. Funmi Adeyemi');
  });

  it('turns field names into labels', () => {
    expect(labelFor('monthly_rent')).toBe('Monthly rent');
    expect(labelFor('suit_number')).toBe('Suit number');
  });

  it('puts parties on the right side when we act for the defendant', () => {
    const v = knownValues(firm, '2026-11-13', matter);
    expect(v.claimant).toBe('Northgate Supplies Limited');
    expect(v.defendant).toBe('Sani Bello');
    expect(v.client_role).toBe('Defendant');
    expect(v.opposing_role).toBe('Claimant');
    expect(v.today).toBe('13th November, 2026');
    expect(v.today_deed).toBe('13th day of November, 2026');
  });

  it('fills the written address heading from the matter', () => {
    const tpl = defaultTemplates.find((t) => t.id === 'tpl-written-address')!;
    const out = fillTemplate(tpl.body, knownValues(firm, '2026-11-13', matter));
    expect(out).toContain('IN THE HIGH COURT OF THE FEDERAL CAPITAL TERRITORY');
    expect(out).toContain('SUIT NO: FCT/HC/CV/2210/2026');
    expect(out).toContain('NORTHGATE SUPPLIES LIMITED .............................. CLAIMANT');
    expect(out).toContain("DEFENDANT'S FINAL WRITTEN ADDRESS");
    expect(out).toContain('Dated this 13th day of November, 2026.');
    expect(out).toContain('[Holden at]'); // not on the matter, so the user is asked
  });

  it('has no malformed placeholders in the built-in templates', () => {
    for (const t of defaultTemplates) {
      const leftovers = fillTemplate(t.body, {}).match(/\{\{|\}\}/g);
      expect(leftovers, t.name).toBeNull();
    }
  });
});

describe('backups', () => {
  it('round-trips through a backup file', () => {
    const data = normalize({ matters: [matter], firm });
    const restored = parseBackup(backupJSON(data));
    expect(restored.matters).toHaveLength(1);
    expect(restored.firm.name).toBe(firm.name);
    expect(restored.rules.length).toBeGreaterThan(0);
  });

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('{"hello": 1}')).toThrow(/not a Brief backup/);
    expect(() => parseBackup('not json')).toThrow();
  });

  it('fills in missing settings from older saves', () => {
    const d = normalize({ matters: [], calendar: { warnDays: 3 } });
    expect(d.calendar.warnDays).toBe(3);
    expect(d.calendar.closedWeekdays).toEqual([0, 6]);
    expect(d.templates.length).toBeGreaterThan(0);
  });
});

describe('sample data', () => {
  it('never puts a sample date on a weekend', async () => {
    const { sampleData } = await import('./seed');
    const { weekday, addDays } = await import('./dates');
    for (let i = 0; i < 7; i++) {
      const s = sampleData(addDays('2026-11-09', i));
      const dates = [...s.hearings.map((h) => h.date), ...s.deadlines.map((d) => d.dueDate)];
      for (const date of dates) expect([0, 6]).not.toContain(weekday(date));
    }
  });
});

describe('lcFirst', () => {
  it('lower-cases only the first letter and leaves acronyms', async () => {
    const { lcFirst } = await import('./text');
    expect(lcFirst('Service of Statement of Defence')).toBe('service of Statement of Defence');
    expect(lcFirst('FCT High Court')).toBe('FCT High Court');
    expect(lcFirst('')).toBe('');
  });
});

describe('sample data on any day of the week', () => {
  it('always has exactly one overdue deadline and nothing in the past marked upcoming', async () => {
    const { sampleData } = await import('./seed');
    const { addDays } = await import('./dates');
    for (let i = 0; i < 7; i++) {
      const today = addDays('2026-11-09', i);
      const open = sampleData(today).deadlines.filter((d) => !d.done);
      expect(open.filter((d) => d.dueDate < today), today).toHaveLength(1);
    }
  });
});

describe('safeFileName', () => {
  it('simplifies dashes and accents and strips unsafe characters', async () => {
    const { safeFileName } = await import('./download');
    expect(safeFileName('Letter for adjournment — Bankfield v. Eze')).toBe('Letter for adjournment - Bankfield v. Eze');
    expect(safeFileName('Adébáyọ̀ v. Ọ̀ṣun State')).toBe('Adebayo v. Osun State');
    expect(safeFileName('a/b:c*?')).toBe('abc');
    expect(safeFileName('———')).toBe('---');
    expect(safeFileName('')).toBe('document');
  });
});

describe('optional fields', () => {
  it('drops blank optional fields and lines they leave empty', () => {
    const body = 'FIRM\n{{phone|optional}}  {{email|optional}}\nRef: {{ref}}';
    expect(fillTemplate(body, {})).toBe('FIRM\nRef: [Ref]');
    expect(fillTemplate(body, { phone: '0803', ref: 'A1' })).toBe('FIRM\n0803\nRef: A1');
    expect(fillTemplate(body, { phone: '0803', email: 'a@b.ng' })).toBe('FIRM\n0803  a@b.ng\nRef: [Ref]');
  });
});

import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { uid } from '../lib/id';
import { todayISO } from '../lib/dates';
import { Card, Field, PageHeader } from '../components/ui';
import type { Matter, MatterStatus, MatterType, Side } from '../types';

const COURTS = [
  'High Court of the Federal Capital Territory',
  'Federal High Court',
  'National Industrial Court of Nigeria',
  'Court of Appeal',
  'Supreme Court of Nigeria',
  'High Court of Lagos State',
  'District Court of the Federal Capital Territory',
  'Magistrate Court',
  'Customary Court of Appeal',
  'Sharia Court of Appeal',
  'Investments and Securities Tribunal',
];
const CLAIMANT_LABELS = ['Claimant', 'Plaintiff', 'Applicant', 'Appellant', 'Petitioner', 'Judgment Creditor'];
const DEFENDANT_LABELS = ['Defendant', 'Respondent', 'Judgment Debtor'];
const TYPES: MatterType[] = ['Litigation', 'Property', 'Corporate', 'Advisory', 'Other'];
const STATUSES: MatterStatus[] = ['Active', 'Pending', 'Concluded', 'Closed'];

function blankMatter(): Matter {
  return {
    id: uid(), title: '', reference: '', type: 'Litigation', status: 'Active',
    client: '', clientPhone: '', clientEmail: '',
    side: 'claimant', claimantLabel: 'Claimant', defendantLabel: 'Defendant',
    opposingParty: '', opposingCounsel: '',
    court: '', division: '', judge: '', suitNumber: '',
    openedOn: todayISO(), notes: '',
  };
}

export default function MatterEdit() {
  const { id } = useParams();
  const { data, upsert } = useStore();
  const navigate = useNavigate();
  const existing = id ? data.matters.find((m) => m.id === id) : undefined;
  const [m, setM] = useState<Matter>(() => existing ?? blankMatter());
  const [error, setError] = useState('');

  if (id && !existing) return <p className="empty">That matter no longer exists. <Link to="/matters">Back to matters</Link></p>;

  const set = <K extends keyof Matter>(key: K, value: Matter[K]) => setM((prev) => ({ ...prev, [key]: value }));
  const text = (key: keyof Matter) => ({
    value: m[key] as string,
    onChange: (e: { target: { value: string } }) => set(key, e.target.value as never),
  });

  const suggestedTitle = (() => {
    const claimant = m.side === 'claimant' ? m.client : m.opposingParty;
    const defendant = m.side === 'claimant' ? m.opposingParty : m.client;
    return claimant && defendant ? `${claimant} v. ${defendant}` : '';
  })();

  const save = (e: FormEvent) => {
    e.preventDefault();
    const title = m.title.trim() || suggestedTitle;
    if (!title) {
      setError('Give the matter a title, or enter the client and the other party.');
      return;
    }
    upsert('matters', { ...m, title });
    navigate(`/matters/${m.id}`, { replace: !!existing });
  };

  const litigation = m.type === 'Litigation' || m.court !== '';

  return (
    <form onSubmit={save}>
      <PageHeader
        title={existing ? `Edit: ${existing.title}` : 'New matter'}
        actions={
          <>
            <Link to={existing ? `/matters/${m.id}` : '/matters'} className="button">Cancel</Link>
            <button type="submit" className="primary">Save matter</button>
          </>
        }
      />
      {error && <div className="banner danger">{error}</div>}

      <Card title="Matter">
        <div className="grid">
          <Field label="Title" hint={!m.title && suggestedTitle ? `Leave blank to use "${suggestedTitle}"` : 'e.g. Adeyemi v. Crestline Homes Ltd'} wide>
            <input {...text('title')} placeholder={suggestedTitle} autoFocus={!existing} />
          </Field>
          <Field label="Type">
            <select value={m.type} onChange={(e) => set('type', e.target.value as MatterType)}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={m.status} onChange={(e) => set('status', e.target.value as MatterStatus)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Our file reference">
            <input {...text('reference')} placeholder="e.g. LIT/2026/014" />
          </Field>
          <Field label="Opened on">
            <input type="date" value={m.openedOn} onChange={(e) => set('openedOn', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card title="Client">
        <div className="grid">
          <Field label="Client name" wide>
            <input {...text('client')} placeholder="Person or company" />
          </Field>
          <Field label="Phone">
            <input {...text('clientPhone')} inputMode="tel" />
          </Field>
          <Field label="Email">
            <input {...text('clientEmail')} type="email" />
          </Field>
        </div>
      </Card>

      <Card title="Parties">
        <div className="grid">
          <Field label="Our client is the…">
            <select value={m.side} onChange={(e) => set('side', e.target.value as Side)}>
              <option value="claimant">{m.claimantLabel || 'Claimant'} side</option>
              <option value="defendant">{m.defendantLabel || 'Defendant'} side</option>
            </select>
          </Field>
          <Field label="Claimant side is called">
            <input list="claimant-labels" {...text('claimantLabel')} />
          </Field>
          <Field label="Defendant side is called">
            <input list="defendant-labels" {...text('defendantLabel')} />
          </Field>
          <Field label="Other party" wide>
            <input {...text('opposingParty')} />
          </Field>
          <Field label="Opposing counsel" wide>
            <input {...text('opposingCounsel')} placeholder="Name and chambers" />
          </Field>
        </div>
        <datalist id="claimant-labels">{CLAIMANT_LABELS.map((l) => <option key={l} value={l} />)}</datalist>
        <datalist id="defendant-labels">{DEFENDANT_LABELS.map((l) => <option key={l} value={l} />)}</datalist>
      </Card>

      <Card title={litigation ? 'Court' : 'Court (if any)'}>
        <div className="grid">
          <Field label="Court" wide>
            <input list="courts" {...text('court')} placeholder="Start typing or pick from the list" />
          </Field>
          <Field label="Judicial division">
            <input {...text('division')} placeholder="e.g. Abuja Judicial Division" />
          </Field>
          <Field label="Suit number">
            <input {...text('suitNumber')} placeholder="e.g. FCT/HC/CV/1042/2026" />
          </Field>
          <Field label="Judge" wide>
            <input {...text('judge')} placeholder="e.g. Hon. Justice A. B. Okoro" />
          </Field>
        </div>
        <datalist id="courts">{COURTS.map((c) => <option key={c} value={c} />)}</datalist>
      </Card>

      <Card title="Notes">
        <textarea rows={5} {...text('notes')} placeholder="Instructions, strategy, anything worth remembering" />
      </Card>

      <div className="form-foot actions">
        <Link to={existing ? `/matters/${m.id}` : '/matters'} className="button">Cancel</Link>
        <button type="submit" className="primary">Save matter</button>
      </div>
    </form>
  );
}

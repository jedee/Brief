import { useState, type FormEvent } from 'react';
import { useStore } from '../../store';
import { hearingOrder } from '../../lib/derive';
import { formatDate, isValidISO, relativeDays, todayISO } from '../../lib/dates';
import { uid } from '../../lib/id';
import { Card, Empty, Field } from '../ui';
import type { Hearing, Matter } from '../../types';
import { lcFirst } from '../../lib/text';

export const PURPOSES = [
  'Mention',
  'Hearing',
  'Hearing of motion',
  'Commencement of trial',
  'Continuation of trial',
  'Cross-examination',
  'Defence',
  'Adoption of final written addresses',
  'Report of settlement',
  'Ruling',
  'Judgment',
];

function NewHearingForm({ matterId }: { matterId: string }) {
  const { upsert } = useStore();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [purpose, setPurpose] = useState('');

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidISO(date)) return;
    upsert('hearings', { id: uid(), matterId, date, time, purpose: purpose.trim() || 'Mention', outcome: '' });
    setDate('');
    setPurpose('');
  };

  return (
    <form onSubmit={add} className="grid">
      <Field label="Date">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </Field>
      <Field label="Time">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field label="Fixed for" wide>
        <input list="purposes" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Hearing of motion" />
      </Field>
      <div className="wide actions">
        <button type="submit" className="primary">Add hearing</button>
      </div>
    </form>
  );
}

/** Record what happened at a sitting, and optionally the date it was adjourned to. */
function OutcomeForm({ hearing, onSaved }: { hearing: Hearing; onSaved: () => void }) {
  const { upsert } = useStore();
  const [outcome, setOutcome] = useState(hearing.outcome);
  const [nextDate, setNextDate] = useState('');
  const [nextPurpose, setNextPurpose] = useState('');
  const [nextTime, setNextTime] = useState(hearing.time || '09:00');

  const save = (e: FormEvent) => {
    e.preventDefault();
    let text = outcome.trim();
    if (isValidISO(nextDate)) {
      const purpose = nextPurpose.trim() || hearing.purpose || 'Mention';
      const adj = `Adjourned to ${formatDate(nextDate)} for ${lcFirst(purpose)}.`;
      if (!text.includes(adj)) text = text ? `${text} ${adj}` : adj;
      upsert('hearings', { id: uid(), matterId: hearing.matterId, date: nextDate, time: nextTime, purpose, outcome: '' });
    }
    upsert('hearings', { ...hearing, outcome: text || 'Sat.' });
    onSaved();
  };

  return (
    <form onSubmit={save} className="grid outcome-form">
      <Field label="What happened" wide>
        <input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="e.g. Motion argued; ruling reserved" />
      </Field>
      <Field label="Adjourned to">
        <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
      </Field>
      <Field label="Time">
        <input type="time" value={nextTime} onChange={(e) => setNextTime(e.target.value)} />
      </Field>
      <Field label="For" wide>
        <input list="purposes" value={nextPurpose} onChange={(e) => setNextPurpose(e.target.value)} placeholder={hearing.purpose} />
      </Field>
      <div className="wide actions">
        <button type="submit" className="primary">Save outcome</button>
      </div>
    </form>
  );
}

export default function HearingsTab({ matter }: { matter: Matter }) {
  const { data, remove } = useStore();
  const today = todayISO();
  const [recording, setRecording] = useState<string | null>(null);
  const all = data.hearings.filter((h) => h.matterId === matter.id).sort(hearingOrder);
  const upcoming = all.filter((h) => h.date >= today);
  const past = all.filter((h) => h.date < today).reverse();
  const needsOutcome = past.filter((h) => !h.outcome);

  const del = (h: Hearing) => {
    if (confirm(`Delete the hearing on ${formatDate(h.date)}?`)) remove('hearings', h.id);
  };

  const row = (h: Hearing) => (
    <li key={h.id} className="row hearing-detail">
      <div className="row-main">
        <span className="row-title">
          {formatDate(h.date, 'long')}
          {h.time && <span className="muted"> · {h.time}</span>}
        </span>
        <span>{h.purpose}</span>
        {h.outcome && <span className="small note">{h.outcome}</span>}
        {recording === h.id && <OutcomeForm hearing={h} onSaved={() => setRecording(null)} />}
      </div>
      <div className="row-side">
        <span className="muted small">{relativeDays(h.date, today)}</span>
        {h.date <= today && (
          <button className="link small" onClick={() => setRecording(recording === h.id ? null : h.id)}>
            {recording === h.id ? 'Close' : h.outcome ? 'Edit outcome' : 'Record outcome'}
          </button>
        )}
        <button className="link danger small" onClick={() => del(h)}>Delete</button>
      </div>
    </li>
  );

  return (
    <>
      <datalist id="purposes">{PURPOSES.map((p) => <option key={p} value={p} />)}</datalist>
      {needsOutcome.length > 0 && (
        <div className="banner warn">
          {needsOutcome.length === 1 ? 'One past sitting has' : `${needsOutcome.length} past sittings have`} no outcome recorded.
          Record what happened and the adjourned date so the next hearing is added automatically.
        </div>
      )}
      <Card title="Add a hearing date">
        <NewHearingForm matterId={matter.id} />
      </Card>
      <Card title={`Upcoming (${upcoming.length})`}>
        {upcoming.length ? <ul className="rows">{upcoming.map(row)}</ul> : <Empty>No upcoming hearings.</Empty>}
      </Card>
      <Card title={`Past sittings (${past.length})`}>
        {past.length ? <ul className="rows">{past.map(row)}</ul> : <Empty>No past sittings recorded.</Empty>}
      </Card>
    </>
  );
}

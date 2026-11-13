import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { backupJSON, parseBackup, useStore } from '../store';
import { WEEKDAYS, computeDueDate, formatDate, holidaysInYear, isValidISO, parts, todayISO } from '../lib/dates';
import { uid } from '../lib/id';
import { defaultData, defaultRules } from '../lib/seed';
import { Card, Empty, Field, PageHeader } from '../components/ui';
import type { Counting, DeadlineRule, Firm } from '../types';
import { lcFirst } from '../lib/text';
import { downloadBlob } from '../lib/download';

function FirmForm() {
  const { data, setFirm } = useStore();
  const [firm, set] = useState<Firm>(data.firm);
  const [saved, setSaved] = useState(false);
  const field = (key: keyof Firm) => ({
    value: firm[key],
    onChange: (e: { target: { value: string } }) => {
      set({ ...firm, [key]: e.target.value });
      setSaved(false);
    },
  });
  const save = (e: FormEvent) => {
    e.preventDefault();
    setFirm(firm);
    setSaved(true);
  };
  return (
    <Card title="Your firm" actions={<span className="muted small">Used on letters and court processes</span>}>
      <form onSubmit={save} className="grid">
        <Field label="Firm / chambers name" wide><input {...field('name')} placeholder="e.g. Okafor & Bello Chambers" /></Field>
        <Field label="Counsel who signs" wide><input {...field('counselName')} placeholder="e.g. A. B. Okafor Esq." /></Field>
        <Field label="Address" wide><textarea rows={2} {...field('address')} /></Field>
        <Field label="Phone"><input {...field('phone')} inputMode="tel" /></Field>
        <Field label="Email"><input {...field('email')} type="email" /></Field>
        <div className="wide actions">
          {saved && <span className="text-ok small">Saved ✓</span>}
          <button type="submit" className="primary">Save firm details</button>
        </div>
      </form>
    </Card>
  );
}

function CourtCalendar() {
  const { data, setCalendar } = useStore();
  const cal = data.calendar;
  const year = parts(todayISO()).year;
  const [date, setDate] = useState('');
  const [name, setName] = useState('');

  const toggleDay = (d: number) =>
    setCalendar({
      ...cal,
      closedWeekdays: cal.closedWeekdays.includes(d) ? cal.closedWeekdays.filter((x) => x !== d) : [...cal.closedWeekdays, d].sort(),
    });

  const addHoliday = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidISO(date) || !name.trim()) return;
    const rest = cal.customHolidays.filter((h) => h.date !== date);
    setCalendar({ ...cal, customHolidays: [...rest, { date, name: name.trim() }].sort((a, b) => a.date.localeCompare(b.date)) });
    setDate('');
    setName('');
  };

  const removeHoliday = (d: string) => setCalendar({ ...cal, customHolidays: cal.customHolidays.filter((h) => h.date !== d) });

  const list = [...holidaysInYear(year, cal), ...holidaysInYear(year + 1, cal)];
  const customDates = new Set(cal.customHolidays.map((h) => h.date));

  return (
    <Card title="Court calendar">
      <p className="small muted">
        Deadlines that land on a closed day move to the next open day (when the rule says so). Eid holidays and any extra
        days the Federal Government declares change every year, so add them below when they are announced.
      </p>
      <div className="grid">
        <Field label="Registry closed on" wide>
          <div className="checks">
            {WEEKDAYS.map((d, i) => (
              <label key={d} className="check">
                <input type="checkbox" checked={cal.closedWeekdays.includes(i)} onChange={() => toggleDay(i)} />
                {d}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Standard holidays">
          <label className="check">
            <input
              type="checkbox"
              checked={cal.includeStandardHolidays}
              onChange={(e) => setCalendar({ ...cal, includeStandardHolidays: e.target.checked })}
            />
            Include fixed Nigerian public holidays and Easter
          </label>
        </Field>
        <Field label="Flag deadlines as due soon within (days)">
          <input
            type="number"
            min={1}
            max={60}
            value={cal.warnDays}
            onChange={(e) => setCalendar({ ...cal, warnDays: Math.max(1, Math.min(60, Number(e.target.value) || 7)) })}
          />
        </Field>
      </div>

      <h3>Add a holiday</h3>
      <form onSubmit={addHoliday} className="grid">
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Eid-el-Fitr" required /></Field>
        <div className="actions align-end"><button type="submit">Add holiday</button></div>
      </form>

      <h3>Holidays {year}–{year + 1}</h3>
      {list.length === 0 ? (
        <Empty>No holidays set.</Empty>
      ) : (
        <ul className="rows compact">
          {list.map((h) => (
            <li key={h.date + h.name} className="row">
              <div className="row-main">
                <span>{h.name}</span>
              </div>
              <div className="row-side">
                <span className="small">{formatDate(h.date, 'long')}</span>
                {customDates.has(h.date) ? (
                  <button className="link danger small" onClick={() => removeHoliday(h.date)}>Remove</button>
                ) : (
                  <span className="muted small">standard</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const blankRule = (): DeadlineRule => ({ id: uid(), name: '', trigger: '', days: 14, counting: 'calendar', rollForward: true, court: '', note: '' });

function RuleEditor({ rule, onClose }: { rule: DeadlineRule; onClose: () => void }) {
  const { data, upsert } = useStore();
  const [r, setR] = useState(rule);
  const example = computeDueDate(todayISO(), r, data.calendar);
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!r.name.trim() || !r.trigger.trim()) return;
    upsert('rules', { ...r, name: r.name.trim(), trigger: r.trigger.trim(), days: Math.max(0, Math.floor(r.days)) });
    onClose();
  };
  return (
    <form onSubmit={save} className="grid rule-editor">
      <Field label="What must be done" wide>
        <input value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder="e.g. File Statement of Defence" required autoFocus />
      </Field>
      <Field label="Counted from" wide>
        <input value={r.trigger} onChange={(e) => setR({ ...r, trigger: e.target.value })} placeholder="e.g. Service of originating process" required />
      </Field>
      <Field label="Period">
        <input type="number" min={0} value={r.days} onChange={(e) => setR({ ...r, days: Number(e.target.value) })} required />
      </Field>
      <Field label="Counted in">
        <select value={r.counting} onChange={(e) => setR({ ...r, counting: e.target.value as Counting })}>
          <option value="calendar">Calendar days</option>
          <option value="working">Working days only</option>
          <option value="months">Months</option>
        </select>
      </Field>
      <Field label="If the last day is closed" wide>
        <label className="check">
          <input type="checkbox" checked={r.rollForward} disabled={r.counting === 'working'} onChange={(e) => setR({ ...r, rollForward: e.target.checked })} />
          Move to the next open day
        </label>
      </Field>
      <Field label="Court / source (optional)"><input value={r.court} onChange={(e) => setR({ ...r, court: e.target.value })} placeholder="e.g. FCT High Court Rules, Order 15" /></Field>
      <Field label="Note (optional)"><input value={r.note} onChange={(e) => setR({ ...r, note: e.target.value })} /></Field>
      <p className="wide small muted">If counted from today: due {formatDate(example.due, 'long')}. {example.basis}</p>
      <div className="wide actions">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="submit" className="primary">Save rule</button>
      </div>
    </form>
  );
}

function Rules() {
  const { data, remove, upsert } = useStore();
  const [editing, setEditing] = useState<DeadlineRule | null>(null);
  const missing = defaultRules.filter((d) => !data.rules.some((r) => r.id === d.id));
  const unit = (r: DeadlineRule) => (r.counting === 'months' ? 'months' : r.counting === 'working' ? 'working days' : 'days');
  return (
    <Card
      title="Deadline rules"
      actions={
        <>
          {missing.length > 0 && <button className="link small" onClick={() => missing.forEach((r) => upsert('rules', { ...r }))}>Restore {missing.length} examples</button>}
          <button onClick={() => setEditing(blankRule())}>New rule</button>
        </>
      }
    >
      <div className="banner warn small">
        The periods that come with Brief are examples. Set each one from the rules of court or statute you rely on. Brief
        excludes the day of the triggering event when it counts.
      </div>
      {editing && !data.rules.some((r) => r.id === editing.id) && <RuleEditor rule={editing} onClose={() => setEditing(null)} />}
      {data.rules.length === 0 ? (
        <Empty>No rules yet.</Empty>
      ) : (
        <ul className="rows">
          {data.rules.map((r) =>
            editing?.id === r.id ? (
              <li key={r.id} className="row editing"><RuleEditor rule={r} onClose={() => setEditing(null)} /></li>
            ) : (
              <li key={r.id} className="row">
                <div className="row-main">
                  <span className="row-title">{r.name}</span>
                  <span className="small">
                    <strong>{r.days} {unit(r)}</strong> from {lcFirst(r.trigger)}
                    {r.counting !== 'working' && (r.rollForward ? ', moved off closed days' : ', even if the last day is closed')}
                  </span>
                  {(r.court || r.note) && <span className="muted small">{[r.court, r.note].filter(Boolean).join(' — ')}</span>}
                </div>
                <div className="row-side">
                  <button className="link small" onClick={() => setEditing(r)}>Edit</button>
                  <button className="link danger small" onClick={() => confirm(`Delete the rule "${r.name}"?`) && remove('rules', r.id)}>Delete</button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </Card>
  );
}

function DataCard() {
  const { data, replaceAll, loadSample } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const download = () => {
    const blob = new Blob([backupJSON(data)], { type: 'application/json' });
    downloadBlob(blob, `brief-backup-${todayISO()}.json`);
    setMessage('Backup downloaded. Keep it somewhere safe, e.g. Google Drive or email it to yourself.');
  };

  const restore = async (file: File) => {
    try {
      const next = parseBackup(await file.text());
      if (!confirm(`Replace everything in this browser with the backup (${next.matters.length} matters)?`)) return;
      replaceAll(next);
      setMessage(`Restored ${next.matters.length} matters from ${file.name}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not read that file.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const eraseAll = () => {
    if (confirm('Erase every matter, deadline, hearing, fee record, rule and template from this browser? Download a backup first if unsure.')) {
      replaceAll(defaultData());
      setMessage('Everything erased.');
    }
  };

  return (
    <Card title="Your data">
      <p className="small muted">
        Brief keeps everything in this browser on this device ({data.matters.length} matters, {data.deadlines.length} deadlines,{' '}
        {data.hearings.length} hearings). Clearing your browser data deletes it, so download a backup regularly. A backup
        also moves your work to another computer or phone.
      </p>
      <div className="actions wrap">
        <button className="primary" onClick={download}>Download backup</button>
        <button onClick={() => fileRef.current?.click()}>Restore from backup…</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
        <button onClick={loadSample}>Add sample matters</button>
        <button className="danger" onClick={eraseAll}>Erase everything</button>
      </div>
      {message && <p className="small">{message}</p>}
    </Card>
  );
}

export default function Settings() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);
  return (
    <>
      <PageHeader title="Settings" />
      <FirmForm />
      <div id="rules"><Rules /></div>
      <CourtCalendar />
      <DataCard />
    </>
  );
}

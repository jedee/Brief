import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store';
import { byDate } from '../../lib/derive';
import { computeDueDate, formatDate, isValidISO, todayISO } from '../../lib/dates';
import { uid } from '../../lib/id';
import { Card, Field } from '../ui';
import { DeadlineList } from '../Lists';
import type { Deadline, Matter } from '../../types';
import { lcFirst } from '../../lib/text';

export default function DeadlinesTab({ matter }: { matter: Matter }) {
  const { data, upsert, remove } = useStore();
  const [mode, setMode] = useState<'rule' | 'custom'>(data.rules.length ? 'rule' : 'custom');
  const [ruleId, setRuleId] = useState(data.rules[0]?.id ?? '');
  const [trigger, setTrigger] = useState(todayISO());
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [notes, setNotes] = useState('');

  const rule = data.rules.find((r) => r.id === ruleId);
  const computed = mode === 'rule' && rule && isValidISO(trigger) ? computeDueDate(trigger, rule, data.calendar) : null;

  const items = data.deadlines.filter((d) => d.matterId === matter.id);
  const open = items.filter((d) => !d.done).sort(byDate((d) => d.dueDate));
  const done = items.filter((d) => d.done).sort(byDate((d) => d.dueDate)).reverse();

  const add = (e: FormEvent) => {
    e.preventDefault();
    let deadline: Deadline;
    if (mode === 'rule') {
      if (!rule || !computed) return;
      deadline = {
        id: uid(), matterId: matter.id, title: title.trim() || rule.name, dueDate: computed.due,
        triggerDate: trigger, ruleId: rule.id, basis: `${rule.trigger}: ${computed.basis}`, done: false, notes: notes.trim(),
      };
    } else {
      if (!title.trim() || !isValidISO(due)) return;
      deadline = { id: uid(), matterId: matter.id, title: title.trim(), dueDate: due, done: false, notes: notes.trim() };
    }
    upsert('deadlines', deadline);
    setTitle('');
    setDue('');
    setNotes('');
  };

  const onDelete = (d: Deadline) => {
    if (confirm(`Delete the deadline "${d.title}"?`)) remove('deadlines', d.id);
  };

  return (
    <>
      <Card title="Add a deadline">
        <div className="segmented" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'rule'} className={mode === 'rule' ? 'on' : ''} onClick={() => setMode('rule')}>
            Work it out from a rule
          </button>
          <button type="button" role="tab" aria-selected={mode === 'custom'} className={mode === 'custom' ? 'on' : ''} onClick={() => setMode('custom')}>
            Enter a date
          </button>
        </div>
        <form onSubmit={add} className="grid">
          {mode === 'rule' ? (
            <>
              <Field label="Rule" wide hint={rule?.note && <>{rule.note} <Link to="/settings#rules">Edit rules</Link></>}>
                <select value={ruleId} onChange={(e) => setRuleId(e.target.value)} required>
                  {data.rules.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.days} {r.counting === 'months' ? 'months' : r.counting === 'working' ? 'working days' : 'days'}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={rule ? `Date of ${lcFirst(rule.trigger)}` : 'Trigger date'}>
                <input type="date" value={trigger} onChange={(e) => setTrigger(e.target.value)} required />
              </Field>
              <Field label="Title (optional)">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={rule?.name} />
              </Field>
              {computed && (
                <div className="computed wide" aria-live="polite">
                  <span className="muted small">Due</span>
                  <strong>{formatDate(computed.due, 'long')}</strong>
                  <span className="small">{computed.basis}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <Field label="What is due" wide>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. File list of documents" />
              </Field>
              <Field label="Due date">
                <input type="date" value={due} onChange={(e) => setDue(e.target.value)} required />
              </Field>
            </>
          )}
          <Field label="Notes (optional)" wide>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="wide actions">
            <button type="submit" className="primary">Add deadline</button>
          </div>
        </form>
      </Card>

      <Card title={`Open (${open.length})`}>
        <DeadlineList items={open} showMatter={false} onDelete={onDelete} empty="No open deadlines on this matter." />
      </Card>
      {done.length > 0 && (
        <Card title={`Done (${done.length})`}>
          <DeadlineList items={done} showMatter={false} onDelete={onDelete} />
        </Card>
      )}
    </>
  );
}

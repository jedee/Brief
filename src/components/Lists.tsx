import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { deadlineStatus } from '../lib/derive';
import { formatDate, todayISO } from '../lib/dates';
import type { Deadline, Hearing } from '../types';
import { Empty, StatusBadge, When } from './ui';

/** Deadlines with a done toggle. Shows the matter name unless `showMatter` is false. */
export function DeadlineList({
  items,
  showMatter = true,
  onDelete,
  empty = 'Nothing due.',
}: {
  items: Deadline[];
  showMatter?: boolean;
  onDelete?: (d: Deadline) => void;
  empty?: string;
}) {
  const { data, upsert } = useStore();
  const today = todayISO();
  if (items.length === 0) return <Empty>{empty}</Empty>;

  const toggle = (d: Deadline) =>
    upsert('deadlines', d.done ? { ...d, done: false, doneOn: undefined } : { ...d, done: true, doneOn: today });

  return (
    <ul className="rows">
      {items.map((d) => {
        const matter = data.matters.find((m) => m.id === d.matterId);
        const status = deadlineStatus(d, today, data.calendar.warnDays);
        return (
          <li key={d.id} className={`row deadline status-${status}`}>
            <input
              type="checkbox"
              checked={d.done}
              onChange={() => toggle(d)}
              aria-label={d.done ? `Mark "${d.title}" not done` : `Mark "${d.title}" done`}
            />
            <div className="row-main">
              <span className="row-title">{d.title}</span>
              {showMatter && matter && (
                <Link to={`/matters/${matter.id}`} className="muted small">
                  {matter.title}
                  {matter.suitNumber && ` · ${matter.suitNumber}`}
                </Link>
              )}
              {d.basis && <span className="muted small">{d.basis}</span>}
              {d.notes && <span className="small note">{d.notes}</span>}
              {d.done && d.doneOn && <span className="muted small">Done {formatDate(d.doneOn)}</span>}
            </div>
            <div className="row-side">
              <When date={d.dueDate} today={today} />
              <StatusBadge status={status} />
              {onDelete && (
                <button className="link danger small" onClick={() => onDelete(d)}>
                  Delete
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function HearingList({ items, showMatter = true, empty = 'No hearings.' }: { items: Hearing[]; showMatter?: boolean; empty?: string }) {
  const { data } = useStore();
  const today = todayISO();
  if (items.length === 0) return <Empty>{empty}</Empty>;
  return (
    <ul className="rows">
      {items.map((h) => {
        const matter = data.matters.find((m) => m.id === h.matterId);
        return (
          <li key={h.id} className="row hearing">
            <span className="time-chip">{h.time || '—'}</span>
            <div className="row-main">
              <span className="row-title">{h.purpose || 'Hearing'}</span>
              {showMatter && matter && (
                <Link to={`/matters/${matter.id}?tab=hearings`} className="muted small">
                  {matter.title}
                  {matter.court && ` · ${matter.court}`}
                  {matter.judge && ` · ${matter.judge}`}
                </Link>
              )}
            </div>
            <div className="row-side">
              <When date={h.date} today={today} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

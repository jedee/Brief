import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { deadlineStatus, hearingOrder } from '../lib/derive';
import { MONTHS, closedReason, formatDate, holidayName, monthGrid, parts, todayISO } from '../lib/dates';
import { Card, Empty, PageHeader } from '../components/ui';
import type { ISODate } from '../types';

interface CalEvent {
  id: string;
  date: ISODate;
  kind: 'hearing' | 'deadline';
  label: string;
  matterId: string;
  matterTitle: string;
  time?: string;
  tone: string;
}

export default function CalendarPage() {
  const { data } = useStore();
  const today = todayISO();
  const now = parts(today);
  const [ym, setYm] = useState({ year: now.year, month: now.month });

  const grid = monthGrid(ym.year, ym.month);
  const monthPrefix = `${ym.year}-${String(ym.month).padStart(2, '0')}`;

  const events = useMemo(() => {
    const title = new Map(data.matters.map((m) => [m.id, m.title]));
    const list: CalEvent[] = [
      ...[...data.hearings].sort(hearingOrder).map((h) => ({
        id: h.id, date: h.date, kind: 'hearing' as const, label: h.purpose || 'Hearing', time: h.time,
        matterId: h.matterId, matterTitle: title.get(h.matterId) ?? '', tone: 'hearing',
      })),
      ...data.deadlines.map((d) => ({
        id: d.id, date: d.dueDate, kind: 'deadline' as const, label: d.title,
        matterId: d.matterId, matterTitle: title.get(d.matterId) ?? '', tone: deadlineStatus(d, today, data.calendar.warnDays),
      })),
    ];
    const byDay = new Map<ISODate, CalEvent[]>();
    for (const e of list) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
    return byDay;
  }, [data, today]);

  const step = (n: number) =>
    setYm(({ year, month }) => {
      const total = year * 12 + (month - 1) + n;
      return { year: Math.floor(total / 12), month: (total % 12) + 1 };
    });

  const agenda = [...events.entries()]
    .filter(([d]) => d.startsWith(monthPrefix))
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <>
      <PageHeader
        title={`${MONTHS[ym.month - 1]} ${ym.year}`}
        subtitle="Hearings and filing deadlines across all matters"
        actions={
          <>
            <button onClick={() => step(-1)} aria-label="Previous month">←</button>
            <button onClick={() => setYm({ year: now.year, month: now.month })}>This month</button>
            <button onClick={() => step(1)} aria-label="Next month">→</button>
          </>
        }
      />

      <div className="legend small">
        <span><i className="dot hearing" /> Hearing</span>
        <span><i className="dot soon" /> Deadline</span>
        <span><i className="dot overdue" /> Overdue</span>
        <span><i className="dot done" /> Done</span>
        <span><i className="dot closed" /> Registry closed</span>
      </div>

      <div className="month" role="grid" aria-label={`${MONTHS[ym.month - 1]} ${ym.year}`}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="dow" role="columnheader">{d}</div>
        ))}
        {grid.map((date) => {
          const inMonth = date.startsWith(monthPrefix);
          const closed = closedReason(date, data.calendar);
          const holiday = holidayName(date, data.calendar);
          const dayEvents = events.get(date) ?? [];
          return (
            <div
              key={date}
              role="gridcell"
              className={['day', inMonth ? '' : 'out', closed ? 'closed' : '', date === today ? 'today' : ''].join(' ')}
            >
              <span className="day-num">{parts(date).day}</span>
              {holiday && <span className="holiday">{holiday}</span>}
              {dayEvents.slice(0, 4).map((e) => (
                <Link
                  key={e.id}
                  to={`/matters/${e.matterId}${e.kind === 'hearing' ? '?tab=hearings' : ''}`}
                  className={`event ${e.tone}`}
                  title={`${e.matterTitle} — ${e.label}`}
                >
                  {e.time && <b>{e.time} </b>}
                  {e.matterTitle || e.label}
                </Link>
              ))}
              {dayEvents.length > 4 && <span className="more">+{dayEvents.length - 4} more</span>}
            </div>
          );
        })}
      </div>

      <Card title="This month, day by day" className="agenda">
        {agenda.length === 0 ? (
          <Empty>Nothing this month.</Empty>
        ) : (
          <ul className="agenda-list">
            {agenda.map(([date, list]) => (
              <li key={date}>
                <h3 className={date === today ? 'text-accent' : ''}>
                  {formatDate(date, 'long')}
                  {date === today && ' · Today'}
                </h3>
                <ul className="rows">
                  {list.map((e) => (
                    <li key={e.id} className={`row ${e.kind}`}>
                      <i className={`dot ${e.tone}`} />
                      <div className="row-main">
                        <span className="row-title">
                          {e.time && <span className="muted">{e.time} · </span>}
                          {e.label}
                        </span>
                        <Link to={`/matters/${e.matterId}`} className="muted small">{e.matterTitle}</Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

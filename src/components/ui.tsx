import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { DeadlineStatus } from '../lib/derive';
import { formatDate, relativeDays } from '../lib/dates';
import type { ISODate } from '../types';

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}

export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function Field({ label, hint, children, wide }: { label: string; hint?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`field${wide ? ' wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Stat({ label, value, tone, to }: { label: string; value: ReactNode; tone?: 'danger' | 'warn' | 'ok'; to?: string }) {
  const body = (
    <>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </>
  );
  const cls = `stat${tone ? ` tone-${tone}` : ''}`;
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

const STATUS_TEXT: Record<DeadlineStatus, string> = {
  done: 'Done',
  overdue: 'Overdue',
  today: 'Due today',
  soon: 'Due soon',
  later: 'Upcoming',
};

export function StatusBadge({ status }: { status: DeadlineStatus }) {
  return <span className={`badge status-${status}`}>{STATUS_TEXT[status]}</span>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}

export function When({ date, today }: { date: ISODate; today: ISODate }) {
  return (
    <span className="when">
      <span>{formatDate(date)}</span>
      <span className="muted small">{relativeDays(date, today)}</span>
    </span>
  );
}

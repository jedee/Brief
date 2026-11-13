import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { ledgerFor, nextEvent } from '../lib/derive';
import { formatDate, relativeDays, todayISO } from '../lib/dates';
import { naira } from '../lib/money';
import { Badge, Card, Empty, PageHeader } from '../components/ui';
import type { MatterStatus } from '../types';

const STATUS_TONE: Record<MatterStatus, string> = { Active: 'ok', Pending: 'warn', Concluded: 'neutral', Closed: 'neutral' };

export default function Matters() {
  const { data } = useStore();
  const navigate = useNavigate();
  const today = todayISO();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'open' | 'all' | MatterStatus>('open');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.matters
      .filter((m) => {
        if (status === 'open' && !(m.status === 'Active' || m.status === 'Pending')) return false;
        if (status !== 'open' && status !== 'all' && m.status !== status) return false;
        if (!q) return true;
        return [m.title, m.suitNumber, m.client, m.opposingParty, m.court, m.judge, m.reference]
          .some((f) => f.toLowerCase().includes(q));
      })
      .map((m) => ({ m, next: nextEvent(data, m.id, today), ledger: ledgerFor(data, m.id) }))
      .sort((a, b) => (a.next?.date ?? '9999').localeCompare(b.next?.date ?? '9999') || a.m.title.localeCompare(b.m.title));
  }, [data, query, status, today]);

  return (
    <>
      <PageHeader
        title="Matters"
        subtitle={`${data.matters.length} on file`}
        actions={<Link to="/matters/new" className="button primary">New matter</Link>}
      />
      <Card>
        <div className="toolbar">
          <input
            type="search"
            placeholder="Search title, suit no., client, court, judge…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search matters"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filter by status">
            <option value="open">Open (active & pending)</option>
            <option value="all">All</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Concluded">Concluded</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {rows.length === 0 ? (
          <Empty>{data.matters.length ? 'No matters match.' : 'No matters yet.'}</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table clickable">
              <thead>
                <tr>
                  <th>Matter</th>
                  <th>Court</th>
                  <th>Next</th>
                  <th className="num">Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ m, next, ledger }) => (
                  <tr key={m.id} onClick={() => navigate(`/matters/${m.id}`)}>
                    <td>
                      <Link to={`/matters/${m.id}`} className="strong" onClick={(e) => e.stopPropagation()}>{m.title}</Link>
                      <div className="muted small">
                        {[m.suitNumber, m.client, m.type].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td className="small">
                      {m.court || <span className="muted">—</span>}
                      {m.judge && <div className="muted">{m.judge}</div>}
                    </td>
                    <td className="small">
                      {next ? (
                        <>
                          <span className={next.date < today ? 'text-danger strong' : ''}>
                            {formatDate(next.date)} · {relativeDays(next.date, today)}
                          </span>
                          <div className="muted">{next.kind === 'hearing' ? '⚖ ' : '⏱ '}{next.label}</div>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className={`num small ${ledger.balance > 0 ? 'strong' : 'muted'}`}>{naira(ledger.balance)}</td>
                    <td><Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { deadlineStatus, ledgerFor, nextHearing } from '../lib/derive';
import { formatDate, todayISO } from '../lib/dates';
import { naira } from '../lib/money';
import { Badge, Card, PageHeader } from '../components/ui';
import DeadlinesTab from '../components/matter/DeadlinesTab';
import HearingsTab from '../components/matter/HearingsTab';
import FeesTab from '../components/matter/FeesTab';
import DocumentGenerator from '../components/DocumentGenerator';
import type { Matter } from '../types';

const TABS = ['deadlines', 'hearings', 'fees', 'documents', 'details'] as const;
type Tab = (typeof TABS)[number];

function Details({ matter }: { matter: Matter }) {
  const { removeMatter } = useStore();
  const navigate = useNavigate();
  const ours = matter.side === 'claimant';
  const rows: [string, string][] = [
    ['Client', [matter.client, matter.clientPhone, matter.clientEmail].filter(Boolean).join(' · ')],
    [ours ? matter.claimantLabel : matter.defendantLabel, matter.client],
    [ours ? matter.defendantLabel : matter.claimantLabel, matter.opposingParty],
    ['Opposing counsel', matter.opposingCounsel],
    ['Court', [matter.court, matter.division].filter(Boolean).join(', ')],
    ['Judge', matter.judge],
    ['Suit number', matter.suitNumber],
    ['Our reference', matter.reference],
    ['Type', matter.type],
    ['Opened', formatDate(matter.openedOn)],
  ];

  const del = () => {
    if (confirm(`Delete "${matter.title}" and all its deadlines, hearings and fee records? This cannot be undone.`)) {
      removeMatter(matter.id);
      navigate('/matters');
    }
  };

  return (
    <>
      <Card title="Details" actions={<Link to={`/matters/${matter.id}/edit`} className="button">Edit</Link>}>
        <dl className="details">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v || <span className="muted">—</span>}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card title="Notes">
        {matter.notes ? <p className="prewrap">{matter.notes}</p> : <p className="muted">No notes. <Link to={`/matters/${matter.id}/edit`}>Add some</Link>.</p>}
      </Card>
      <Card title="Delete matter" className="danger-zone">
        <p className="small muted">Removes this matter with its deadlines, hearings and fee records.</p>
        <button className="danger" onClick={del}>Delete matter</button>
      </Card>
    </>
  );
}

export default function MatterView() {
  const { id } = useParams();
  const { data } = useStore();
  const [params, setParams] = useSearchParams();
  const matter = data.matters.find((m) => m.id === id);
  const today = todayISO();

  if (!matter) return <p className="empty">That matter no longer exists. <Link to="/matters">Back to matters</Link></p>;

  const requested = params.get('tab') as Tab | null;
  const tab: Tab = requested && TABS.includes(requested) ? requested : 'deadlines';

  const openDeadlines = data.deadlines.filter((d) => d.matterId === matter.id && !d.done);
  const overdue = openDeadlines.filter((d) => deadlineStatus(d, today, data.calendar.warnDays) === 'overdue').length;
  const hearing = nextHearing(data, matter.id, today);
  const ledger = ledgerFor(data, matter.id);

  const counts: Partial<Record<Tab, string>> = {
    deadlines: openDeadlines.length ? String(openDeadlines.length) : '',
    hearings: hearing ? formatDate(hearing.date) : '',
    fees: ledger.balance > 0 ? naira(ledger.balance) : '',
  };

  return (
    <>
      <PageHeader
        title={matter.title}
        subtitle={
          <>
            {[matter.suitNumber, matter.court, matter.judge].filter(Boolean).join(' · ') || matter.type}
            {' '}
            <Badge tone={matter.status === 'Active' ? 'ok' : 'neutral'}>{matter.status}</Badge>
            {overdue > 0 && <> <Badge tone="danger">{overdue} overdue</Badge></>}
          </>
        }
        actions={<Link to={`/matters/${matter.id}/edit`} className="button">Edit matter</Link>}
      />

      <nav className="tabs" aria-label="Matter sections">
        {TABS.map((t) => (
          <button
            key={t}
            className={t === tab ? 'on' : ''}
            aria-current={t === tab ? 'page' : undefined}
            onClick={() => setParams(t === 'deadlines' ? {} : { tab: t }, { replace: true })}
          >
            {t[0].toUpperCase() + t.slice(1)}
            {counts[t] && <span className="tab-count">{counts[t]}</span>}
          </button>
        ))}
      </nav>

      {tab === 'deadlines' && <DeadlinesTab matter={matter} />}
      {tab === 'hearings' && <HearingsTab matter={matter} />}
      {tab === 'fees' && <FeesTab matter={matter} />}
      {tab === 'documents' && <DocumentGenerator key={matter.id} initialMatterId={matter.id} lockMatter />}
      {tab === 'details' && <Details matter={matter} />}
    </>
  );
}

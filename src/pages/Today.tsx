import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { byDate, hearingOrder, totalOutstanding } from '../lib/derive';
import { daysBetween, formatDate, todayISO } from '../lib/dates';
import { naira } from '../lib/money';
import { Card, PageHeader, Stat } from '../components/ui';
import { DeadlineList, HearingList } from '../components/Lists';

const LOOKAHEAD = 14;

export default function Today() {
  const { data, loadSample } = useStore();
  const today = todayISO();

  if (data.matters.length === 0) {
    return (
      <>
        <PageHeader title="Welcome to Brief" subtitle={formatDate(today, 'long')} />
        <Card className="welcome">
          <p>
            Brief keeps your matters, filing deadlines, court dates and fees in one place. Everything is saved in this
            browser on this device; nothing is sent anywhere.
          </p>
          <ol>
            <li>Add your firm details in <Link to="/settings">Settings</Link> so letters and processes are signed correctly.</li>
            <li>Check the <Link to="/settings#rules">deadline rules</Link> against the rules of court you practise under.</li>
            <li>Open your first matter and add its deadlines and hearing dates.</li>
          </ol>
          <div className="actions">
            <Link to="/matters/new" className="button primary">Add your first matter</Link>
            <button onClick={loadSample}>Try it with sample matters</button>
          </div>
        </Card>
      </>
    );
  }

  const open = data.deadlines.filter((d) => !d.done).sort(byDate((d) => d.dueDate));
  const overdue = open.filter((d) => d.dueDate < today);
  const upcoming = open.filter((d) => d.dueDate >= today && daysBetween(today, d.dueDate) <= LOOKAHEAD);
  const dueThisWeek = open.filter((d) => d.dueDate >= today && daysBetween(today, d.dueDate) <= 7).length;
  const hearings = data.hearings
    .filter((h) => h.date >= today && daysBetween(today, h.date) <= LOOKAHEAD)
    .sort(hearingOrder);
  const hearingsThisWeek = hearings.filter((h) => daysBetween(today, h.date) <= 7).length;
  const outstanding = totalOutstanding(data);
  const active = data.matters.filter((m) => m.status === 'Active' || m.status === 'Pending').length;

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={formatDate(today, 'long')}
        actions={<Link to="/matters/new" className="button primary">New matter</Link>}
      />

      <div className="stats">
        <Stat label="Overdue" value={overdue.length} tone={overdue.length ? 'danger' : 'ok'} />
        <Stat label="Due in 7 days" value={dueThisWeek} tone={dueThisWeek ? 'warn' : undefined} />
        <Stat label="In court in 7 days" value={hearingsThisWeek} to="/calendar" />
        <Stat label="Fees outstanding" value={naira(outstanding)} />
        <Stat label="Open matters" value={active} to="/matters" />
      </div>

      {overdue.length > 0 && (
        <Card title={`Overdue (${overdue.length})`} className="danger-edge">
          <DeadlineList items={overdue} />
        </Card>
      )}

      <div className="two-col">
        <Card title={`Deadlines — next ${LOOKAHEAD} days`}>
          <DeadlineList items={upcoming} empty={`No filing deadlines in the next ${LOOKAHEAD} days.`} />
        </Card>
        <Card title={`In court — next ${LOOKAHEAD} days`} actions={<Link to="/calendar" className="small">Calendar →</Link>}>
          <HearingList items={hearings} empty={`No hearings in the next ${LOOKAHEAD} days.`} />
        </Card>
      </div>
    </>
  );
}

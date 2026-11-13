import { useState, type FormEvent } from 'react';
import { useStore } from '../../store';
import { ledgerFor } from '../../lib/derive';
import { formatDate, isValidISO, todayISO } from '../../lib/dates';
import { naira, parseAmount } from '../../lib/money';
import { uid } from '../../lib/id';
import { Card, Empty, Field, Stat } from '../ui';
import type { Matter } from '../../types';

const METHODS = ['Bank transfer', 'Cash', 'Cheque', 'POS', 'Draft'];

export default function FeesTab({ matter }: { matter: Matter }) {
  const { data, upsert, remove } = useStore();
  const ledger = ledgerFor(data, matter.id);

  const [kind, setKind] = useState<'charge' | 'payment'>('charge');
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [method, setMethod] = useState(METHODS[0]);
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  const parsed = parseAmount(amount);

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (parsed === null || parsed <= 0) {
      setError('Enter an amount, e.g. 250000 or 250,000 or 250k.');
      return;
    }
    if (!isValidISO(date)) return;
    if (kind === 'charge') {
      if (!description.trim()) {
        setError('Say what the charge is for.');
        return;
      }
      upsert('charges', { id: uid(), matterId: matter.id, date, description: description.trim(), amount: parsed });
    } else {
      upsert('payments', { id: uid(), matterId: matter.id, date, amount: parsed, method, reference: reference.trim() });
    }
    setAmount('');
    setDescription('');
    setReference('');
    setError('');
  };

  const entries = [
    ...data.charges.filter((c) => c.matterId === matter.id).map((c) => ({ kind: 'charge' as const, id: c.id, date: c.date, text: c.description, amount: c.amount })),
    ...data.payments.filter((p) => p.matterId === matter.id).map((p) => ({ kind: 'payment' as const, id: p.id, date: p.date, text: [`Payment — ${p.method}`, p.reference].filter(Boolean).join(' · '), amount: p.amount })),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'charge' ? -1 : 1));

  let running = 0;
  const withBalance = entries.map((e) => {
    running += e.kind === 'charge' ? e.amount : -e.amount;
    return { ...e, balance: running };
  });

  const del = (e: (typeof entries)[number]) => {
    if (confirm(`Delete this ${e.kind} of ${naira(e.amount)}?`)) remove(e.kind === 'charge' ? 'charges' : 'payments', e.id);
  };

  return (
    <>
      <div className="stats">
        <Stat label="Billed" value={naira(ledger.billed)} />
        <Stat label="Received" value={naira(ledger.paid)} />
        <Stat
          label={ledger.balance < 0 ? 'In credit' : 'Balance owed'}
          value={naira(Math.abs(ledger.balance))}
          tone={ledger.balance > 0 ? 'warn' : 'ok'}
        />
      </div>

      <Card title="Record">
        <div className="segmented" role="tablist">
          <button type="button" role="tab" aria-selected={kind === 'charge'} className={kind === 'charge' ? 'on' : ''} onClick={() => setKind('charge')}>
            Fee or expense billed
          </button>
          <button type="button" role="tab" aria-selected={kind === 'payment'} className={kind === 'payment' ? 'on' : ''} onClick={() => setKind('payment')}>
            Payment received
          </button>
        </div>
        <form onSubmit={add} className="grid">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Amount (₦)" hint={parsed ? naira(parsed) : 'e.g. 250,000 or 250k'}>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required />
          </Field>
          {kind === 'charge' ? (
            <Field label="For" wide>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Professional fee, filing fees, transport" />
            </Field>
          ) : (
            <>
              <Field label="Method">
                <select value={method} onChange={(e) => setMethod(e.target.value)}>
                  {METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Reference (optional)">
                <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transfer ref, cheque no." />
              </Field>
            </>
          )}
          {error && <p className="wide text-danger small">{error}</p>}
          <div className="wide actions">
            <button type="submit" className="primary">{kind === 'charge' ? 'Add charge' : 'Add payment'}</button>
          </div>
        </form>
      </Card>

      <Card title="Statement">
        {withBalance.length === 0 ? (
          <Empty>Nothing billed or received yet.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th className="num">Billed</th>
                  <th className="num">Received</th>
                  <th className="num">Balance</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {withBalance.map((e) => (
                  <tr key={e.id}>
                    <td className="nowrap">{formatDate(e.date)}</td>
                    <td>{e.text}</td>
                    <td className="num">{e.kind === 'charge' ? naira(e.amount) : ''}</td>
                    <td className="num text-ok">{e.kind === 'payment' ? naira(e.amount) : ''}</td>
                    <td className="num strong">{naira(e.balance)}</td>
                    <td><button className="link danger small" onClick={() => del(e)}>Delete</button></td>
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

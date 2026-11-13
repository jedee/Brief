import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { nextHearing } from '../lib/derive';
import { todayISO } from '../lib/dates';
import { FIELD_HELP, fillTemplate, knownValues, labelFor, optionalPlaceholders, placeholders } from '../lib/templates';
import { Card, Field } from './ui';
import { downloadBlob, safeFileName } from '../lib/download';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function documentHtml(title: string, text: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 2.5cm 2.2cm; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #000; }
  pre { font: inherit; white-space: pre-wrap; word-wrap: break-word; margin: 0; }
</style></head><body><pre>${escapeHtml(text)}</pre></body></html>`;
}



export default function DocumentGenerator({ initialTemplateId, initialMatterId, lockMatter }: { initialTemplateId?: string; initialMatterId?: string; lockMatter?: boolean }) {
  const { data } = useStore();
  const [templateId, setTemplateId] = useState(initialTemplateId ?? data.templates[0]?.id ?? '');
  const [matterId, setMatterId] = useState(initialMatterId ?? '');
  const [entered, setEntered] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const template = data.templates.find((t) => t.id === templateId);
  const matter = data.matters.find((m) => m.id === matterId);
  const today = todayISO();

  const known = useMemo(
    () => knownValues(data.firm, today, matter, matter ? nextHearing(data, matter.id, today) : undefined),
    [data, today, matter],
  );
  const names = template ? placeholders(template.body) : [];
  const auto = names.filter((n) => known[n]);
  const toFill = names.filter((n) => !known[n]);
  const values = { ...known, ...Object.fromEntries(Object.entries(entered).filter(([, v]) => v.trim())) };
  const output = template ? fillTemplate(template.body, values) : '';
  const optional = template ? optionalPlaceholders(template.body) : new Set<string>();
  const missing = names.filter((n) => !values[n]?.trim() && !optional.has(n));
  const firmMissing = !data.firm.name.trim() || !data.firm.counselName.trim();

  if (data.templates.length === 0) {
    return <p className="empty">No templates yet. Add one on the Documents page.</p>;
  }

  const docTitle = safeFileName([template?.name, matter?.title].filter(Boolean).join(' — '));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert('Copy is blocked in this browser. Select the text in the preview and copy it instead.');
    }
  };

  const print = () => {
    const w = window.open('', '_blank');
    if (!w) {
      alert('Allow pop-ups for this page to print.');
      return;
    }
    w.document.write(documentHtml(docTitle, output));
    w.document.close();
    w.focus();
    w.print();
  };

  const downloadWord = () => {
    const blob = new Blob(['﻿', documentHtml(docTitle, output)], { type: 'application/msword' });
    downloadBlob(blob, `${docTitle}.doc`);
  };

  return (
    <div className="generator">
      <Card title="Prepare a document">
        <div className="grid">
          <Field label="Template" wide={lockMatter}>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {data.templates.map((t) => (
                <option key={t.id} value={t.id}>{t.category ? `${t.category} — ` : ''}{t.name}</option>
              ))}
            </select>
          </Field>
          {!lockMatter && (
            <Field label="Matter">
              <select value={matterId} onChange={(e) => setMatterId(e.target.value)}>
                <option value="">— None —</option>
                {data.matters.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </Field>
          )}
        </div>

        {toFill.length > 0 && (
          <>
            <h3>Fill in</h3>
            <div className="grid">
              {toFill.map((n) => (
                <Field key={n} label={optional.has(n) ? `${labelFor(n)} (optional)` : labelFor(n)}>
                  <input value={entered[n] ?? ''} onChange={(e) => setEntered({ ...entered, [n]: e.target.value })} />
                </Field>
              ))}
            </div>
          </>
        )}

        {auto.length > 0 && (
          <details className="auto-fields">
            <summary>Filled in automatically ({auto.length}) — change any of them</summary>
            <div className="grid">
              {auto.map((n) => (
                <Field key={n} label={labelFor(n)} hint={FIELD_HELP[n]?.help}>
                  <input value={entered[n] ?? ''} placeholder={known[n]} onChange={(e) => setEntered({ ...entered, [n]: e.target.value })} />
                </Field>
              ))}
            </div>
          </details>
        )}

        {firmMissing && names.some((n) => n.startsWith('firm_') || n === 'counsel_name') && (
          <p className="small text-warn">
            Your firm name or signing counsel is not set. <Link to="/settings">Add them in Settings</Link> and they will
            appear on every document.
          </p>
        )}
      </Card>

      <Card
        title="Preview"
        actions={
          <>
            <button onClick={copy}>{copied ? 'Copied ✓' : 'Copy text'}</button>
            <button onClick={print}>Print / PDF</button>
            <button className="primary" onClick={downloadWord}>Download Word</button>
          </>
        }
      >
        {missing.length > 0 && (
          <p className="small muted">
            {missing.length} blank {missing.length === 1 ? 'field shows' : 'fields show'} in [brackets].
          </p>
        )}
        <pre className="paper">{output}</pre>
      </Card>
    </div>
  );
}

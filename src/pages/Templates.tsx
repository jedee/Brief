import { useRef, useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { uid } from '../lib/id';
import { defaultTemplates } from '../lib/seed';
import { FIELD_HELP, placeholders } from '../lib/templates';
import { Card, Empty, Field, PageHeader } from '../components/ui';
import DocumentGenerator from '../components/DocumentGenerator';
import type { Template } from '../types';

function TemplateEditor({ template, onClose }: { template: Template; onClose: () => void }) {
  const { upsert } = useStore();
  const [t, setT] = useState(template);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const insert = (name: string) => {
    const el = bodyRef.current;
    const token = `{{${name}}}`;
    if (!el) return setT({ ...t, body: t.body + token });
    const { selectionStart: a, selectionEnd: b } = el;
    const body = t.body.slice(0, a) + token + t.body.slice(b);
    setT({ ...t, body });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + token.length, a + token.length);
    });
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!t.name.trim()) return;
    upsert('templates', { ...t, name: t.name.trim(), category: t.category.trim() });
    onClose();
  };

  const own = placeholders(t.body).filter((n) => !FIELD_HELP[n]);

  return (
    <Card title={template.name ? `Edit template: ${template.name}` : 'New template'}>
      <form onSubmit={save} className="template-editor">
        <div className="grid">
          <Field label="Name">
            <input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} required autoFocus />
          </Field>
          <Field label="Category">
            <input value={t.category} onChange={(e) => setT({ ...t, category: e.target.value })} list="template-categories" placeholder="e.g. Letters" />
          </Field>
        </div>
        <datalist id="template-categories">
          {['Letters', 'Court processes', 'Property', 'Corporate'].map((c) => <option key={c} value={c} />)}
        </datalist>
        <div className="editor-split">
          <Field label="Text" wide hint={<>Write <code>{'{{name}}'}</code> for anything that changes. Add <code>|upper</code> for capitals, e.g. <code>{'{{client|upper}}'}</code>, or <code>|optional</code> for something that may be left out. Anything Brief can't fill becomes a box to type into.</>}>
            <textarea ref={bodyRef} rows={22} className="mono" value={t.body} onChange={(e) => setT({ ...t, body: e.target.value })} />
          </Field>
          <div className="placeholder-list">
            <span className="field-label">Filled in automatically — click to insert</span>
            <ul>
              {Object.entries(FIELD_HELP).map(([name, f]) => (
                <li key={name}>
                  <button type="button" className="chip" onClick={() => insert(name)} title={f.help}>{`{{${name}}}`}</button>
                </li>
              ))}
            </ul>
            {own.length > 0 && (
              <>
                <span className="field-label">Asked for when used</span>
                <ul>{own.map((n) => <li key={n}><code>{`{{${n}}}`}</code></li>)}</ul>
              </>
            )}
          </div>
        </div>
        <div className="actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">Save template</button>
        </div>
      </form>
    </Card>
  );
}

export default function Templates() {
  const { data, upsert, remove } = useStore();
  const [editing, setEditing] = useState<Template | null>(null);
  const missingBuiltIns = defaultTemplates.filter((d) => !data.templates.some((t) => t.id === d.id));

  const startNew = () => setEditing({ id: uid(), name: '', category: '', body: '' });
  const del = (t: Template) => {
    if (confirm(`Delete the template "${t.name}"?`)) remove('templates', t.id);
  };
  const restore = () => missingBuiltIns.forEach((t) => upsert('templates', { ...t }));

  const sorted = [...data.templates].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="Fill a template from a matter, then copy, print or download it for Word."
        actions={<button className="primary" onClick={startNew}>New template</button>}
      />

      {editing ? (
        <TemplateEditor key={editing.id} template={editing} onClose={() => setEditing(null)} />
      ) : (
        <DocumentGenerator />
      )}

      <Card
        title={`Templates (${data.templates.length})`}
        actions={missingBuiltIns.length > 0 && <button className="link small" onClick={restore}>Restore {missingBuiltIns.length} built-in</button>}
      >
        {sorted.length === 0 ? (
          <Empty>No templates. Create one or restore the built-in set.</Empty>
        ) : (
          <ul className="rows">
            {sorted.map((t) => (
              <li key={t.id} className="row">
                <div className="row-main">
                  <span className="row-title">{t.name}</span>
                  <span className="muted small">
                    {t.category || 'Uncategorised'} · {placeholders(t.body).length} fields
                  </span>
                </div>
                <div className="row-side">
                  <button className="link small" onClick={() => setEditing(t)}>Edit</button>
                  <button
                    className="link small"
                    onClick={() => setEditing({ ...t, id: uid(), name: `${t.name} (copy)` })}
                  >
                    Duplicate
                  </button>
                  <button className="link danger small" onClick={() => del(t)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

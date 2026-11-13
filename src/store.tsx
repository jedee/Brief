import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CalendarSettings, Data, Firm } from './types';
import { defaultData, sampleData } from './lib/seed';
import { todayISO } from './lib/dates';

const STORAGE_KEY = 'brief:data';

export type CollectionKey = 'matters' | 'deadlines' | 'hearings' | 'charges' | 'payments' | 'rules' | 'templates';
export type Item<K extends CollectionKey> = Data[K][number];

/** Fill in anything missing (older saves, hand-edited backups) from the defaults. */
export function normalize(raw: unknown): Data {
  const base = defaultData();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Data>;
  const arr = <T,>(v: T[] | undefined, fallback: T[]) => (Array.isArray(v) ? v : fallback);
  return {
    version: 1,
    firm: { ...base.firm, ...(r.firm ?? {}) },
    calendar: { ...base.calendar, ...(r.calendar ?? {}) },
    matters: arr(r.matters, base.matters),
    deadlines: arr(r.deadlines, base.deadlines),
    hearings: arr(r.hearings, base.hearings),
    charges: arr(r.charges, base.charges),
    payments: arr(r.payments, base.payments),
    rules: arr(r.rules, base.rules),
    templates: arr(r.templates, base.templates),
  };
}

function load(): Data {
  const text = localStorage.getItem(STORAGE_KEY);
  if (!text) return defaultData();
  try {
    return normalize(JSON.parse(text));
  } catch {
    // Keep the unreadable copy so nothing is silently lost.
    localStorage.setItem(`${STORAGE_KEY}:corrupt:${Date.now()}`, text);
    return defaultData();
  }
}

/** Accepts a file written by "Download backup" (or a bare Data object). */
export function parseBackup(text: string): Data {
  const parsed = JSON.parse(text) as { app?: string; data?: unknown; matters?: unknown };
  const payload = parsed && parsed.app === 'brief' ? parsed.data : parsed;
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as Data).matters)) {
    throw new Error('This file is not a Brief backup.');
  }
  return normalize(payload);
}

export function backupJSON(data: Data): string {
  return JSON.stringify({ app: 'brief', exportedAt: new Date().toISOString(), data }, null, 2);
}

interface Store {
  data: Data;
  saveError: string | null;
  upsert<K extends CollectionKey>(key: K, item: Item<K>): void;
  remove(key: CollectionKey, id: string): void;
  removeMatter(id: string): void;
  setFirm(firm: Firm): void;
  setCalendar(calendar: CalendarSettings): void;
  replaceAll(data: Data): void;
  loadSample(): void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(load);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fromOtherTab = useRef(false);

  useEffect(() => {
    if (fromOtherTab.current) {
      fromOtherTab.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaveError(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save to this browser.');
    }
  }, [data]);

  // Keep several open tabs in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        fromOtherTab.current = true;
        setData(normalize(JSON.parse(e.newValue)));
      } catch {
        fromOtherTab.current = false;
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const actions = useMemo(
    () => ({
      upsert<K extends CollectionKey>(key: K, item: Item<K>) {
        setData((d) => {
          const list = d[key] as Item<K>[];
          const i = list.findIndex((x) => x.id === item.id);
          const next = i >= 0 ? list.map((x, j) => (j === i ? item : x)) : [...list, item];
          return { ...d, [key]: next };
        });
      },
      remove(key: CollectionKey, id: string) {
        setData((d) => ({ ...d, [key]: (d[key] as { id: string }[]).filter((x) => x.id !== id) }));
      },
      removeMatter(id: string) {
        setData((d) => ({
          ...d,
          matters: d.matters.filter((m) => m.id !== id),
          deadlines: d.deadlines.filter((x) => x.matterId !== id),
          hearings: d.hearings.filter((x) => x.matterId !== id),
          charges: d.charges.filter((x) => x.matterId !== id),
          payments: d.payments.filter((x) => x.matterId !== id),
        }));
      },
      setFirm(firm: Firm) {
        setData((d) => ({ ...d, firm }));
      },
      setCalendar(calendar: CalendarSettings) {
        setData((d) => ({ ...d, calendar }));
      },
      replaceAll(next: Data) {
        setData(normalize(next));
      },
      loadSample() {
        const s = sampleData(todayISO());
        setData((d) => ({
          ...d,
          matters: [...d.matters, ...s.matters],
          deadlines: [...d.deadlines, ...s.deadlines],
          hearings: [...d.hearings, ...s.hearings],
          charges: [...d.charges, ...s.charges],
          payments: [...d.payments, ...s.payments],
        }));
      },
    }),
    [],
  );

  const value = useMemo(() => ({ data, saveError, ...actions }), [data, saveError, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
}

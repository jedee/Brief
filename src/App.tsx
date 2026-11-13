import { useEffect } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useStore } from './store';
import Today from './pages/Today';
import Matters from './pages/Matters';
import MatterView from './pages/MatterView';
import MatterEdit from './pages/MatterEdit';
import CalendarPage from './pages/CalendarPage';
import Templates from './pages/Templates';
import Settings from './pages/Settings';

const NAV = [
  { to: '/', label: 'Today', icon: '◉', end: true },
  { to: '/matters', label: 'Matters', icon: '▤' },
  { to: '/calendar', label: 'Calendar', icon: '▦' },
  { to: '/templates', label: 'Documents', icon: '✎' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export default function App() {
  const { data, saveError } = useStore();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo" aria-hidden>B</span>
          <div>
            <strong>Brief</strong>
            <span className="muted small">{data.firm.name || 'Your practice'}</span>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <span className="nav-icon" aria-hidden>{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <p className="sidebar-foot muted small">Saved in this browser. Download a backup from Settings.</p>
      </aside>

      <main className="content">
        {saveError && (
          <div className="banner danger">
            Changes could not be saved in this browser ({saveError}). Download a backup from Settings now.
          </div>
        )}
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/matters" element={<Matters />} />
          <Route path="/matters/new" element={<MatterEdit />} />
          <Route path="/matters/:id" element={<MatterView />} />
          <Route path="/matters/:id/edit" element={<MatterEdit />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<p className="empty">Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}

import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ButcherPage } from './features/butcher/ButcherPage';
import { GoalsPage } from './features/goals/GoalsPage';
import { HomePage } from './features/home/HomePage';
import { WeekPage } from './features/week/WeekPage';

// O Painel traz os gráficos (d3): carrega só quando a aba é aberta, para o app abrir mais rápido.
// O arquivo fica guardado pelo service worker, então funciona sem internet.
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/acougue" element={<ButcherPage />} />
        <Route path="/semana" element={<WeekPage />} />
        <Route
          path="/painel"
          element={
            <Suspense fallback={null}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route path="/metas" element={<GoalsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

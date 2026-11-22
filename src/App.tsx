import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ButcherPage } from './features/butcher/ButcherPage';
import { GoalsPage } from './features/goals/GoalsPage';
import { HomePage } from './features/home/HomePage';
import { WeekPage } from './features/week/WeekPage';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/acougue" element={<ButcherPage />} />
        <Route path="/semana" element={<WeekPage />} />
        <Route path="/metas" element={<GoalsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

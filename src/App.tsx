import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ButcherPage } from './features/butcher/ButcherPage';
import { HomePage } from './features/home/HomePage';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/acougue" element={<ButcherPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

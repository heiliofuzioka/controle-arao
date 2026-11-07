import { HashRouter, Route, Routes } from 'react-router-dom';
import { HelloPage } from './features/home/HelloPage';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="*" element={<HelloPage />} />
      </Routes>
    </HashRouter>
  );
}

import { lazy, Suspense, type JSX } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ButcherPage } from './features/butcher/ButcherPage';
import { CatalogPage } from './features/catalog/CatalogPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { GoalsPage } from './features/goals/GoalsPage';
import { HomePage } from './features/home/HomePage';
import { WeekPage } from './features/week/WeekPage';

// O Painel, o Fechamento do mês e o Ano trazem os gráficos (d3): carregam só quando abertos,
// para o app abrir mais rápido.
// O arquivo fica guardado pelo service worker, então funciona sem internet.
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const MonthPage = lazy(() => import('./features/month/MonthPage').then((m) => ({ default: m.MonthPage })));
const YearPage = lazy(() => import('./features/year/YearPage').then((m) => ({ default: m.YearPage })));
// Receitas: telas grandes que o Arão abre pouco.
const recipes = () => import('./features/recipes');
const RecipesPage = lazy(() => recipes().then((m) => ({ default: m.RecipesPage })));
const RecipeDetailPage = lazy(() => recipes().then((m) => ({ default: m.RecipeDetailPage })));
const RecipeFormPage = lazy(() => recipes().then((m) => ({ default: m.RecipeFormPage })));
const PricePage = lazy(() => recipes().then((m) => ({ default: m.PricePage })));
const BelowTargetPage = lazy(() => recipes().then((m) => ({ default: m.BelowTargetPage })));
const IngredientsPage = lazy(() => recipes().then((m) => ({ default: m.IngredientsPage })));

const later = (page: JSX.Element) => <Suspense fallback={null}>{page}</Suspense>;

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/acougue" element={<ButcherPage />} />
        <Route path="/semana" element={<WeekPage />} />
        <Route path="/painel" element={later(<DashboardPage />)} />
        <Route path="/metas" element={<GoalsPage />} />
        <Route path="/mes/:month" element={later(<MonthPage />)} />
        <Route path="/mes" element={later(<MonthPage />)} />
        <Route path="/ano/:year" element={later(<YearPage />)} />
        <Route path="/ano" element={later(<YearPage />)} />
        <Route path="/ajustes" element={<SettingsPage />} />
        <Route path="/produtos" element={<CatalogPage />} />
        <Route path="/receitas" element={later(<RecipesPage />)} />
        <Route path="/receitas/nova" element={later(<RecipeFormPage />)} />
        <Route path="/receitas/abaixo" element={later(<BelowTargetPage />)} />
        <Route path="/receitas/:id" element={later(<RecipeDetailPage />)} />
        <Route path="/receitas/:id/editar" element={later(<RecipeFormPage />)} />
        <Route path="/receitas/:id/preco" element={later(<PricePage />)} />
        <Route path="/ingredientes" element={later(<IngredientsPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

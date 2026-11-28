import { lazy, Suspense, useCallback, useEffect, useState, type JSX } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { db } from './db/db';
import { ButcherPage } from './features/butcher/ButcherPage';
import { CatalogPage } from './features/catalog/CatalogPage';
import { ExpenseCategoriesPage } from './features/settings/ExpenseCategoriesPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { Splash } from './features/splash/Splash';
import { Welcome } from './features/welcome/Welcome';
import { isStandalone } from './lib/standalone';
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
  // Abertura só na abertura a frio (o App não é recriado ao voltar do segundo plano).
  const [splash, setSplash] = useState(true);
  const [dbReady, setDbReady] = useState(false);
  // Boas-vindas ao abrir pelo Safari (fora do modo instalado), depois da abertura.
  const [welcome, setWelcome] = useState(() => !isStandalone());

  useEffect(() => {
    // Mesmo se o banco falhar, a abertura sai: a tela mostra o erro, não fica presa no logo.
    db.open().then(
      () => setDbReady(true),
      () => setDbReady(true),
    );
  }, []);

  const endSplash = useCallback(() => {
    setSplash(false);
    // O index.html começa com o creme da imagem de abertura; depois, a barra de cima fica na cor da página.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#F4F2ED');
  }, []);

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
        <Route path="/categorias-despesa" element={<ExpenseCategoriesPage />} />
        <Route path="/receitas" element={later(<RecipesPage />)} />
        <Route path="/receitas/nova" element={later(<RecipeFormPage />)} />
        <Route path="/receitas/abaixo" element={later(<BelowTargetPage />)} />
        <Route path="/receitas/:id" element={later(<RecipeDetailPage />)} />
        <Route path="/receitas/:id/editar" element={later(<RecipeFormPage />)} />
        <Route path="/receitas/:id/preco" element={later(<PricePage />)} />
        <Route path="/ingredientes" element={later(<IngredientsPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!splash && welcome && <Welcome onContinue={() => setWelcome(false)} />}
      {splash && <Splash ready={dbReady} onDone={endSplash} />}
    </HashRouter>
  );
}

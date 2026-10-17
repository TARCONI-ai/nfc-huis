import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ScrollTopButton, ScrollToTopOnNavigate } from './components/ScrollHelpers';
import HomePage from './pages/HomePage';
import WastePage from './pages/WastePage';
import FreezerPage from './pages/FreezerPage';
import HistoryPage from './pages/HistoryPage';
import ShoppingPage from './pages/ShoppingPage';
import PantryPage from './pages/PantryPage';
import { freezerApi } from './services/freezer';
import { pantryApi } from './services/pantry';
import { pantryLocationLabel } from './types/pantry';

export default function App() {
  return (
    <HashRouter>
      <ScrollToTopOnNavigate />
      <ScrollTopButton />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/afval" element={<WastePage />} />
        <Route path="/vriezer" element={<FreezerPage />} />
        <Route
          path="/vriezer/geschiedenis"
          element={
            <HistoryPage
              title="❄️ Geschiedenis"
              api={freezerApi}
              locationLabel={(location) => location.name}
              backTo="/vriezer"
              backLabel="Terug naar de vriezer"
            />
          }
        />
        <Route path="/voorraden" element={<PantryPage />} />
        <Route
          path="/voorraden/geschiedenis"
          element={
            <HistoryPage
              title="📦 Geschiedenis"
              api={pantryApi}
              locationLabel={pantryLocationLabel}
              backTo="/voorraden"
              backLabel="Terug naar de voorraden"
            />
          }
        />
        <Route path="/boodschappen" element={<ShoppingPage />} />

        {/* Alias en castellano, por si alguna pegatina se grabó con la ruta antigua. */}
        <Route path="/basura" element={<Navigate to="/afval" replace />} />
        <Route path="/congelador" element={<Navigate to="/vriezer" replace />} />
        <Route path="/compra" element={<Navigate to="/boodschappen" replace />} />
        <Route path="/despensa" element={<Navigate to="/voorraden" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

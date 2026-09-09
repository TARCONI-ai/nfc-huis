import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import WastePage from './pages/WastePage';
import FreezerPage from './pages/FreezerPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/afval" element={<WastePage />} />
        <Route path="/vriezer" element={<FreezerPage />} />

        {/* Alias en castellano, por si alguna pegatina se grabó con la ruta antigua. */}
        <Route path="/basura" element={<Navigate to="/afval" replace />} />
        <Route path="/congelador" element={<Navigate to="/vriezer" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

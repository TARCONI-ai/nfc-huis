import { Link } from 'react-router-dom';
import PageTitle from '../components/PageTitle';

export default function HomePage() {
  return (
    <main className="app">
      <PageTitle>🏠 Huis</PageTitle>

      <Link className="big-link" to="/afval">
        <span className="big-link__icon" aria-hidden="true">
          🗑
        </span>
        Afval
      </Link>

      <Link className="big-link" to="/vriezer">
        <span className="big-link__icon" aria-hidden="true">
          ❄️
        </span>
        Vriezer
      </Link>

      <Link className="big-link" to="/voorraden">
        <span className="big-link__icon" aria-hidden="true">
          📦
        </span>
        Voorraden
      </Link>

      <Link className="big-link" to="/boodschappen">
        <span className="big-link__icon" aria-hidden="true">
          🛒
        </span>
        Boodschappen
      </Link>
    </main>
  );
}

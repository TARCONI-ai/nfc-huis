import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <main className="app">
      <h1>🏠 Huis</h1>

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
    </main>
  );
}

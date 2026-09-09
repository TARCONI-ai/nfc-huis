import { Link } from 'react-router-dom';

/** Placeholder: el módulo del congelador se implementa en la siguiente fase. */
export default function FreezerPage() {
  return (
    <main className="app">
      <h1>❄️ Vriezer</h1>
      <section className="notice">
        <p>Deze pagina is nog in de maak.</p>
      </section>
      <Link className="back-link" to="/">
        ← Terug naar huis
      </Link>
    </main>
  );
}

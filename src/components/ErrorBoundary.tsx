import { Component, type ReactNode } from 'react';

/**
 * Última red: si algo revienta al pintar, enseñamos un botón para recargar
 * en vez de dejar la pantalla en blanco.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="app">
        <section className="notice" role="alert">
          <p>Er ging iets mis.</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => window.location.reload()}
          >
            Opnieuw laden
          </button>
        </section>
      </main>
    );
  }
}

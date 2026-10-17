import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Título de página que lleva siempre a la home: tocar el icono (🏠, 🗑, ❄️…)
 * es lo primero que hacen los abuelos cuando se pierden.
 */
export default function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1>
      <Link className="title-link" to="/" aria-label={`${textOf(children)} · naar huis`}>
        {children}
      </Link>
    </h1>
  );
}

function textOf(node: ReactNode): string {
  return typeof node === 'string' ? node : '';
}

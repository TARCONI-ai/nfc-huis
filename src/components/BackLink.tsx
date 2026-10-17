import { Link } from 'react-router-dom';

interface BackLinkProps {
  to: string;
  label: string;
  /** Arriba del todo, encima del título: así no hay que bajar hasta el final para volver. */
  top?: boolean;
}

export default function BackLink({ to, label, top = false }: BackLinkProps) {
  return (
    <Link className={`back-link${top ? ' back-link--top' : ''}`} to={to}>
      ← {label}
    </Link>
  );
}

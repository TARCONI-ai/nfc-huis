import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/** A partir de aquí (en px) aparece el botón de subir. */
const SHOW_AFTER_PX = 600;

/**
 * Al cambiar de página empezamos arriba: si no, al volver desde el final de
 * una lista larga la página nueva se abre a media altura.
 */
export function ScrollToTopOnNavigate() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Botón flotante ↑ que devuelve al principio de la página actual. */
export function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="scroll-top"
      aria-label="Naar boven"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      ↑
    </button>
  );
}

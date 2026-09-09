import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * El módulo de basura debe seguir funcionando aunque falten estas variables,
 * así que aquí no lanzamos: sólo dejamos el cliente a null y la página del
 * congelador enseña un aviso.
 */
export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey, {
      // La app no tiene login: no hay sesión que guardar ni token que refrescar.
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

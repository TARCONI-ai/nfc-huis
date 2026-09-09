# nfc-huis

Dos pegatinas NFC en casa: una abre el calendario de recogida de basura, otra el
inventario del congelador. Pensado para que lo usen mis abuelos, así que la
interfaz está **en holandés**, con letras grandes y botones amplios.

- 🗑 **Afval** — <https://tarconi-ai.github.io/nfc-huis/#/afval>
- ❄️ **Vriezer** — <https://tarconi-ai.github.io/nfc-huis/#/vriezer>

Coste: **0 €/mes** (GitHub Pages + Supabase Free).

## Cómo está montado

```
NFC ──> GitHub Pages (React + Vite, HashRouter)
          │
          ├── Afval    ──> src/data/waste-schedule.json   (estático, sin backend)
          └── Vriezer  ──> Supabase PostgreSQL + RLS
```

El módulo de basura no depende de Supabase: funciona aunque el proyecto esté
pausado o falten las variables de entorno.

Se usa `HashRouter` porque GitHub Pages no hace fallback de rutas SPA: sin el
`#`, entrar directamente en `/afval` daría un 404.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173/nfc-huis/
npm test         # 25 tests
npm run build    # typecheck + build de producción
```

Las variables van en `.env` (ver `.env.example`). Sin ellas, la página del
congelador muestra un aviso y el resto de la web funciona igual.

## Estructura

| Carpeta | Qué hay |
|---|---|
| `src/pages/` | Una pantalla por ruta |
| `src/lib/` | Lógica pura y testeable (fechas, reglas, búsqueda) |
| `src/services/` | Acceso a Supabase y exportación |
| `src/data/` | Calendario de basura en JSON |
| `supabase/` | SQL: esquema, triggers, RLS y seed |

Para renombrar el repositorio hay que cambiar `BASE` en
[`vite.config.ts`](vite.config.ts) y las URLs de las pegatinas.

## Modelo de seguridad

**El congelador es de acceso público. Es una decisión consciente, no un olvido.**

No hay login: cualquiera que abra la URL puede leer y modificar el inventario.
Se aceptó a cambio de que mis abuelos no vean nunca una pantalla de inicio de
sesión. El repositorio es público y la Publishable Key es visible en el bundle,
como debe ser.

RLS sigue activo y acota el daño posible:

- Las **lades** sólo se pueden leer desde la web (se crean por SQL).
- El **historial** sólo se puede leer; lo escribe un trigger `SECURITY DEFINER`,
  así que ni se puede falsear ni borrar desde el navegador.
- Nada más del proyecto Supabase queda expuesto.

Para cerrarlo en el futuro: añadir Supabase Auth, cambiar `anon` por
`authenticated` en [`supabase/rls.sql`](supabase/rls.sql) y volver a desplegar.
Nunca se debe poner una `sb_secret_…` ni una `service_role` en el frontend.

## Puesta en marcha

Ver [MANUAL_STEPS.md](MANUAL_STEPS.md).

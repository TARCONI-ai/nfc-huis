# nfc-huis

Pegatinas NFC en casa: el calendario de recogida de basura, el inventario del
congelador y la despensa del garaje. Pensado para que lo usen mis abuelos, así que la
interfaz está **en holandés**, con letras grandes y botones amplios.

- 🗑 **Afval** — <https://tarconi-ai.github.io/nfc-huis/#/afval>
- ❄️ **Vriezer** — <https://tarconi-ai.github.io/nfc-huis/#/vriezer>
- 📦 **Voorraden** — <https://tarconi-ai.github.io/nfc-huis/#/voorraden> (despensa del garaje)
- 🛒 **Boodschappen** — <https://tarconi-ai.github.io/nfc-huis/#/boodschappen> (lo que está a 0, separado en vriezer y voorraad)

Coste: **0 €/mes** (GitHub Pages + Supabase Free).

## Cómo está montado

```
NFC ──> GitHub Pages (React + Vite, HashRouter)
          │
          ├── Afval    ──> src/data/waste-schedule.json   (estático, sin backend)
          ├── Vriezer  ──> Supabase: freezer_*  (+ RLS)
          └── Voorraden ─> Supabase: pantry_*   (+ RLS)
```

El módulo de basura no depende de Supabase: funciona aunque el proyecto esté
pausado o falten las variables de entorno.

Se usa `HashRouter` porque GitHub Pages no hace fallback de rutas SPA: sin el
`#`, entrar directamente en `/afval` daría un 404.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173/nfc-huis/
npm test         # 37 tests
npm run build    # typecheck + build de producción
```

## Voorraden y prioridad

La despensa sale del Excel `VOORRADEN.xlsx` del abuelo (hoja **OP KAST**). Cada
balda lleva el código de la etiqueta del garaje (`G-KAST2 P3`) para que se
encuentre igual que en el papel.

Vriezer y Voorraden comparten la misma pantalla (`InventoryPage`), con lupa y
dos pestañas: **Per plek** y **Prioriteit**. La prioridad sale del THT con las
mismas reglas que las fórmulas del Excel ([`src/lib/priority.ts`](src/lib/priority.ts)):

| THT | Aviso |
|---|---|
| Sin fecha | nada (no perecedero) |
| > 60 días | 🟢 Bewaren (no se marca) |
| ≤ 60 días | 🟠 Binnenkort gebruiken |
| ≤ 21 días | 🔴 Nu gebruiken |
| Caducado | ⚠️ Over datum |
| Caducado hace > 90 días | ☠️ Weggooien |

Las filas con unidad `AFVAL` (pilas, papel) no salen en la lista de la compra.

Las variables van en `.env` (ver `.env.example`). Sin ellas, la página del
congelador muestra un aviso y el resto de la web funciona igual.

## Estructura

| Carpeta | Qué hay |
|---|---|
| `src/pages/` | Una pantalla por ruta |
| `src/lib/` | Lógica pura y testeable (fechas, reglas, búsqueda) |
| `src/services/` | Acceso a Supabase y exportación |
| `src/data/` | Calendario de basura en JSON |
| `supabase/` | SQL: esquema, triggers, RLS y seed (`voorraden.sql` = despensa) |

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

Ver [MANUAL_STEPS.md](MANUAL_STEPS.md). Para el SQL, lo más fácil es pegar
[`supabase/instalacion-completa.sql`](supabase/instalacion-completa.sql) de una vez.

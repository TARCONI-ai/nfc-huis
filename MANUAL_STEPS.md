# Pasos manuales

Todo lo que sigue lo tienes que hacer tú a mano: yo no puedo entrar en tu cuenta
de Supabase ni grabar las pegatinas.

Lo que **ya está hecho** (9 de septiembre de 2026):

- Repositorio público creado: <https://github.com/TARCONI-ai/nfc-huis>
- GitHub Pages activado con GitHub Actions como origen
- Web publicada en <https://tarconi-ai.github.io/nfc-huis/>
- Proyecto Supabase creado y SQL ejecutado (pasos 1 y 2)
- Variables configuradas en GitHub y web redesplegada (pasos 3 y 4)
- Congelador funcionando con las 6 lades y los 32 productos

**Sólo te queda el paso 6: grabar las pegatinas NFC.**

---

## 1. Crear el proyecto de Supabase ✅ hecho

1. Entra en <https://supabase.com/dashboard> y crea un proyecto nuevo.
2. Plan **Free**. No actives Pro, Custom Domain, PITR, IPv4 dedicado ni ningún add-on.
3. Región: la más cercana (Frankfurt o Londres).
4. Guarda la contraseña de la base de datos en tu gestor de contraseñas.

## 2. Ejecutar el SQL ✅ hecho

Lo más fácil: abre `supabase/instalacion-completa.sql`, copia **todo** el contenido,
pégalo en el **SQL Editor** de Supabase y pulsa **Run**. Ese fichero ya lleva los
cuatro pasos en orden.

Si lo prefieres por separado, ejecuta los cuatro ficheros de la carpeta
`supabase/` **en este orden**:

1. `schema.sql` — tablas
2. `triggers.sql` — `updated_at` y el historial automático
3. `rls.sql` — Row Level Security
4. `seed.sql` — las 6 lades y el contenido de la hoja de la nevera

Los cuatro se pueden reejecutar sin duplicar datos.

## 3. Copiar los datos de conexión ✅ hecho

En **Project Settings → API Keys**, copia:

- **Project URL** → `https://xxxxxxxx.supabase.co`
- **Publishable key** → empieza por `sb_publishable_…`

⚠️ La **Secret key** (`sb_secret_…`) no se copia a ningún sitio de este proyecto.

## 4. Configurar GitHub ✅ hecho

En el repositorio: **Settings → Secrets and variables → Actions → Variables →
New repository variable**. Crea estas dos *variables* (no secretos: acaban dentro
del JavaScript público de todos modos, y como variables se leen mejor):

| Nombre | Valor |
|---|---|
| `VITE_SUPABASE_URL` | tu Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | tu `sb_publishable_…` |

Después, **Actions → Deploy to GitHub Pages → Run workflow** para reconstruir la
web con esas variables.

## 5. Configurar tu portátil (opcional, para desarrollo)

```bash
cp .env.example .env
```

Rellena los dos valores y arranca con `npm run dev`.

## 6. Grabar las pegatinas NFC

Con NFC Tools (iOS/Android), escribe un registro **URL** en cada pegatina:

| Pegatina | URL |
|---|---|
| Basura | `https://tarconi-ai.github.io/nfc-huis/#/afval` |
| Congelador | `https://tarconi-ai.github.io/nfc-huis/#/vriezer` |

Marca las pegatinas como **sólo lectura** al final, para que nadie las
reescriba sin querer.

## 7. Comprobación final

- [ ] Tocar la pegatina de basura abre la próxima recogida sin login
- [ ] Tocar la del congelador muestra las 6 lades con su contenido
- [ ] Los botones − / + cambian la cantidad y el cambio sigue ahí al recargar
- [ ] El mismo cambio se ve desde otro móvil

---

## Mantenimiento

**Cada final de año: actualizar el calendario de basura.**
Edita `src/data/waste-schedule.json` con las fechas del nuevo calendario
municipal y haz push a `main`. Se despliega solo. Si se acaban las fechas, la
página avisa en vez de quedarse en blanco.

**Cada pocos meses: exportar una copia.**
En la página del congelador, botón ⚙︎ → **Exporteren**. Descarga un `.json` con
todo el inventario. El plan gratuito de Supabase no tiene backups automáticos.

**Si el congelador deja de cargar.**
Supabase pausa los proyectos Free tras ~7 días sin actividad. No cuesta dinero:
entra en el dashboard y pulsa **Resume project**. La página de basura sigue
funcionando igualmente porque no depende de Supabase.

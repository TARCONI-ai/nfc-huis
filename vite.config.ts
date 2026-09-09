import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// ⚠️ El nombre del repositorio de GitHub. Si renombras el repo, cambia SOLO esta línea.
// Si algún día usas un repo raíz (USUARIO.github.io), pon BASE = '/'.
const BASE = '/nfc-huis/';

export default defineConfig({
  plugins: [react()],
  base: BASE,
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});


import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Vite definisce queste costanti a tempo di compilazione.
    // Usiamo bracket notation su any per bypassare i limiti di tsc durante la build di Vercel.
    'process.env.API_KEY': JSON.stringify((process as any).env.API_KEY)
  }
});

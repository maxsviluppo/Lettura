
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Assicura che process.env sia definito per la compatibilità con l'SDK Gemini
    'process.env': process.env
  }
});

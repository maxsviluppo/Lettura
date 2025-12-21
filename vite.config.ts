
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Vite defines these at compile time. 
    // We use a check to avoid errors if process is undefined in certain environments
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Alias local: o app é servido em http://contabilis.local (porta 80).
// O host "contabilis.local" é resolvido para 127.0.0.1 pelo arquivo hosts
// (o script setup-windows.ps1 cria essa entrada automaticamente).
// Para desenvolvimento em outra porta, defina FRONTEND_PORT (ex.: 5173).
const port = Number(process.env.FRONTEND_PORT ?? 80);

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // escuta em todas as interfaces (necessário para o alias)
    port,
    allowedHosts: ['contabilis.local', 'localhost'],
  },
  preview: {
    host: true,
    port,
    allowedHosts: ['contabilis.local', 'localhost'],
  },
});

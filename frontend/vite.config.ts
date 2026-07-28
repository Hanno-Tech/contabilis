import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Prefixo vazio: carrega também as variáveis sem VITE_ (usadas só aqui, na
  // configuração — não vão para o bundle do app).
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };

  // Alias local: o app é servido em http://contabilis.local (porta 80).
  // O host "contabilis.local" é resolvido para 127.0.0.1 pelo arquivo hosts
  // (o script setup-windows.ps1 cria essa entrada automaticamente).
  // Para desenvolvimento em outra porta, defina FRONTEND_PORT (ex.: 5173).
  const port = Number(env.FRONTEND_PORT ?? 80);

  // Proxy de `/api` para o backend local, espelhando o que o Vercel faz em
  // produção (frontend e API no mesmo domínio). Assim o app usa sempre a mesma
  // URL relativa e não existe CORS em desenvolvimento.
  const proxy = {
    '/api': {
      target: env.API_PROXY_TARGET || 'http://localhost:3333',
      changeOrigin: true,
    },
  };

  return {
    plugins: [react()],
    server: {
      host: true, // escuta em todas as interfaces (necessário para o alias)
      port,
      allowedHosts: ['contabilis.local', 'localhost'],
      proxy,
    },
    preview: {
      host: true,
      port,
      allowedHosts: ['contabilis.local', 'localhost'],
      proxy,
    },
  };
});

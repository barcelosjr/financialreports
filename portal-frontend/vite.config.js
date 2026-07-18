import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Encaminha /api ao PHP local (php -S, ver portal-backend-php/public/router.php)
      // -- front chama /api/... relativo, sem CORS em dev nem em produção.
      '/api': {
        // 127.0.0.1 explícito (não "localhost") -- em algumas máquinas
        // Windows, "localhost" resolve para ::1 (IPv6) no Node e falha
        // contra o servidor embutido do PHP, que por padrão escuta só em
        // IPv4 (127.0.0.1), causando 502 no proxy.
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})

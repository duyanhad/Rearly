import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Đọc từ .env / .env.local — đổi backend mà không phải sửa code.
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_PROXY_TARGET || 'http://localhost:5157'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: Number(env.VITE_PORT || 5173),
      // host: true + allowedHosts: cho phép mở từ điện thoại trong LAN hoặc qua tunnel HTTPS.
      // shortcut: allowedHosts mở cho mọi host (chỉ dùng khi dev), production do reverse proxy lo.
      host: true,
      allowedHosts: true,
      proxy: {
        '/api': target,
        '/uploads': target,
        '/downloads': target,
        '/hubs': { target, ws: true },
      },
    },
  }
})

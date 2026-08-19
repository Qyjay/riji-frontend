import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// vite.config 运行在 Node 端; 这里声明 process 避免缺少 @types/node 时的类型报错。
declare const process: { env: Record<string, string | undefined> };

// 后端端口由启动脚本 start-dev.sh 通过环境变量注入；缺省 8000。
const BACKEND_PORT = process.env.BACKEND_PORT || "8000";
const BACKEND_TARGET = `http://127.0.0.1:${BACKEND_PORT}`;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  server: {
    // 把前端相对请求代理到后端，随后端端口自动变化。
    proxy: {
      "/api": { target: BACKEND_TARGET, changeOrigin: true },
      "/uploads": { target: BACKEND_TARGET, changeOrigin: true },
      "/ws": { target: BACKEND_TARGET, changeOrigin: true, ws: true },
    },
  },
});

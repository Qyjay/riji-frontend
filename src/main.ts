import { createSSRApp } from "vue";
import App from "./App.vue";
import { setupPinia } from "./stores";

export function createApp() {
  const app = createSSRApp(App);
  const pinia = setupPinia();
  app.use(pinia);
  return {
    app,
  };
}

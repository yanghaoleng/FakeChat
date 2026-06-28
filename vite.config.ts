import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

const apiPort = process.env.API_PORT || "8787";
const apiTarget = process.env.API_PROXY_TARGET || `http://127.0.0.1:${apiPort}`;
const deepSeekV4FlashModel = "deepseek-v4-flash";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const storyPackage = env.VITE_STORY_PACKAGE === "viral" || process.env.STORY_PACKAGE === "viral" ? "viral" : "jojo";
  const base = env.VITE_BASE_PATH || process.env.VITE_BASE_PATH || "/";
  const faviconPath = `${base}${storyPackage === "viral" ? "favicon-viral.svg" : "favicon-jojo.svg"}`;
  const defaultDeepSeekModel = env.VITE_DEEPSEEK_MODEL || deepSeekV4FlashModel;
  const defaultDeepSeekProvider = {
    apiKey: env.VITE_DEEPSEEK_API_KEY || "",
    baseUrl: env.VITE_DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    model: defaultDeepSeekModel
  };

  return {
    base,
    plugins: [
      {
        name: "story-favicon",
        transformIndexHtml(html) {
          return html.replace("%STORY_FAVICON%", faviconPath);
        }
      },
      tailwindcss(),
      react()
    ],
    define: {
      __APP_STORY_PACKAGE__: JSON.stringify(storyPackage),
      __DEEPSEEK_BROWSER_CONFIG__: JSON.stringify({
        ...defaultDeepSeekProvider,
        defaultProvider: defaultDeepSeekProvider
      })
    },
    build: {
      assetsDir: "static"
    },
    server: {
      proxy: {
        "/api": apiTarget,
        "/audio": apiTarget,
        "/sfx": apiTarget,
        "/assets": apiTarget,
        "/renders": apiTarget
      }
    }
  };
});

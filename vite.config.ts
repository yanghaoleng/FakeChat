import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

const apiPort = process.env.API_PORT || "8787";
const apiTarget = process.env.API_PROXY_TARGET || `http://127.0.0.1:${apiPort}`;
const companyChatBaseUrl = "https://token.xjjj.co/v1";
const deepSeekV4FlashModel = "deepseek-v4-flash";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const storyPackage = env.VITE_STORY_PACKAGE === "viral" || process.env.STORY_PACKAGE === "viral" ? "viral" : "jojo";
  const base = env.VITE_BASE_PATH || process.env.VITE_BASE_PATH || "/";
  const faviconPath = `${base}${storyPackage === "viral" ? "favicon-viral.svg" : "favicon-jojo.svg"}`;
  const includeCompanyToken = env.VITE_INCLUDE_COMPANY_TOKEN === "1" || process.env.VITE_INCLUDE_COMPANY_TOKEN === "1";
  const defaultDeepSeekModel = env.VITE_DEEPSEEK_MODEL || env.DEEPSEEK_MODEL || deepSeekV4FlashModel;
  const companyChatModel = env.VITE_COMPANY_DEEPSEEK_MODEL || env.COMPANY_DEEPSEEK_MODEL || defaultDeepSeekModel;
  const companyChatApiKey = env.VITE_COMPANY_DEEPSEEK_API_KEY || env.COMPANY_DEEPSEEK_API_KEY || "";
  const defaultDeepSeekProvider = {
    apiKey: env.VITE_DEEPSEEK_API_KEY || env.DEEPSEEK_API_KEY || "",
    baseUrl: env.VITE_DEEPSEEK_BASE_URL || env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    model: defaultDeepSeekModel
  };
  const companyDeepSeekProvider = {
    apiKey: storyPackage === "jojo" || includeCompanyToken ? companyChatApiKey : "",
    baseUrl: env.VITE_COMPANY_DEEPSEEK_BASE_URL || companyChatBaseUrl,
    model: companyChatModel,
    probeUrl: env.VITE_COMPANY_NETWORK_PROBE_URL || `${companyChatBaseUrl}/models`
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
        defaultProvider: defaultDeepSeekProvider,
        companyProvider: storyPackage === "jojo" || includeCompanyToken ? companyDeepSeekProvider : undefined
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

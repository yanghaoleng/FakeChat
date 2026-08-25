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
  const faviconPath = `${base}${storyPackage === "viral" ? "brand-icons/ququ-viral-chat-bubble.webp" : "favicon-jojo.svg"}`;
  const canonicalUrl = storyPackage === "viral" ? "https://ququ.mikeywa.icu/" : "https://ququ.mikeywa.icu/ding/";
  const pageTitle = storyPackage === "viral"
    ? "蛐蛐模拟器｜AI 情感陪伴与聊天对话模拟器"
    : "蛐蛐模拟器钉钉版｜AI 职场群聊与模拟对话";
  const pageDescription = storyPackage === "viral"
    ? "蛐蛐模拟器是一款 AI 情感陪伴与聊天对话模拟工具，可创作微信风格的模拟聊天、关系故事与沉浸式对话短剧。"
    : "使用蛐蛐模拟器创作 AI 职场群聊、办公室日常和钉钉风格模拟对话，快速生成自然连续的聊天故事。";
  const defaultDeepSeekModel = env.VITE_DEEPSEEK_MODEL || deepSeekV4FlashModel;
  const defaultDeepSeekProvider = {
    apiKey: env.VITE_DEEPSEEK_API_KEY || "",
    baseUrl: env.VITE_DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    model: defaultDeepSeekModel
  };
  const browserAiProviders = {
    zhipu: {
      apiKey: env.VITE_ZHIPU_API_KEY || "",
      baseUrl: env.VITE_ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
      model: env.VITE_ZHIPU_MODEL || "glm-4.7-flash"
    },
    doubao: {
      apiKey: env.VITE_DOUBAO_API_KEY || env.VITE_ARK_API_KEY || "",
      baseUrl: env.VITE_DOUBAO_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3",
      model: env.VITE_DOUBAO_MODEL || "doubao-seed-2-0-mini-260215"
    },
    v4flash: {
      apiKey: defaultDeepSeekProvider.apiKey,
      baseUrl: defaultDeepSeekProvider.baseUrl,
      model: defaultDeepSeekProvider.model
    }
  };

  return {
    base,
    plugins: [
      {
        name: "story-favicon",
        transformIndexHtml(html) {
          return html
            .replaceAll("%STORY_FAVICON%", faviconPath)
            .replaceAll("%STORY_BASE%", base)
            .replaceAll("%STORY_CANONICAL%", canonicalUrl)
            .replaceAll("%STORY_TITLE%", pageTitle)
            .replaceAll("%STORY_DESCRIPTION%", pageDescription);
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
      }),
      __AI_BROWSER_CONFIG__: JSON.stringify(browserAiProviders)
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

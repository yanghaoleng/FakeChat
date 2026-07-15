import type { StoryPackage } from "./linearStory";
import { publicAsset, resolvePublicAssetPath } from "./publicPath";
import type { DramaProject } from "./schema";

const assetCacheMessageType = "CACHE_STATIC_ASSETS";
const maxParallelWarmups = 5;
const serviceWorkerReplyTimeoutMs = 10_000;
const serviceWorkerReadyTimeoutMs = 10_000;

const productUiAssetPaths: Record<StoryPackage, readonly string[]> = {
  viral: [
    "/wechat-ui/topbar.webp",
    "/wechat-ui/bottombar.webp",
    "/favicon-viral.svg"
  ],
  jojo: [
    "/dingtalk-ui/topbar.webp",
    "/dingtalk-ui/inputbar.webp",
    "/favicon-jojo.svg"
  ]
};

const localVisualAssetPattern = /\/(?:avatars|memes|viral-assets|jojo-assets|wechat-ui|dingtalk-ui)\//;
const localIconPattern = /\/(?:site-icon|favicon-(?:viral|jojo))\.svg$/;

function isLocalPublicPath(path: string | undefined): path is string {
  return Boolean(path && path.startsWith("/"));
}

function unique(values: string[]) {
  return [...new Set(values)];
}

/**
 * Only assets that the current story can render immediately belong in the
 * eager manifest. The rest are cached by the service worker when requested.
 */
export function projectCriticalAssetPaths(project: DramaProject) {
  const referencedAssetIds = new Set(
    project.messages.map((message) => message.assetId).filter((id): id is string => Boolean(id))
  );

  return unique([
    ...project.characters.map((character) => character.avatarUrl).filter(isLocalPublicPath),
    ...project.messages.map((message) => message.imageUrl).filter(isLocalPublicPath),
    ...project.messages.map((message) => message.musicCoverUrl).filter(isLocalPublicPath),
    ...project.assets
      .filter((asset) => asset.kind !== "sound" && referencedAssetIds.has(asset.id))
      .map((asset) => asset.localPath)
      .filter(isLocalPublicPath)
  ]);
}

export function buildStaticVisualAssetPaths({
  storyPackage,
  project
}: {
  storyPackage: StoryPackage;
  project?: DramaProject;
}) {
  return unique([
    ...productUiAssetPaths[storyPackage],
    ...(project ? projectCriticalAssetPaths(project) : [])
  ]);
}

function isSameOriginVisualAsset(url: string) {
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.origin === window.location.origin
      && (localVisualAssetPattern.test(parsed.pathname) || localIconPattern.test(parsed.pathname));
  } catch {
    return false;
  }
}

function currentDocumentVisualAssetUrls() {
  return [...document.querySelectorAll<HTMLImageElement>("img[src]")]
    .map((image) => image.currentSrc || image.src)
    .filter(isSameOriginVisualAsset);
}

function staticVisualAssetUrls(storyPackage: StoryPackage, project?: DramaProject) {
  const manifestUrls = buildStaticVisualAssetPaths({ storyPackage, project })
    .map((path) => resolvePublicAssetPath(path))
    .filter((path): path is string => Boolean(path));

  // App owns the randomized initial preset. Reading rendered images at idle
  // lets the cache follow that exact preset without importing every asset
  // catalog into the entry bundle.
  return unique([...manifestUrls, ...currentDocumentVisualAssetUrls()]);
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
};

type StaticVisualWarmupOptions = {
  storyPackage: StoryPackage;
  project?: DramaProject;
};

let warmupStarted = false;

export function warmStaticVisualAssets({ storyPackage, project }: StaticVisualWarmupOptions) {
  if (warmupStarted || typeof window === "undefined") return;
  warmupStarted = true;

  const startWarmup = () => {
    const urls = staticVisualAssetUrls(storyPackage, project);
    void cacheStaticVisualAssetUrls(urls);
  };

  const requestIdleCallback = (window as IdleWindow).requestIdleCallback;
  if (requestIdleCallback) {
    requestIdleCallback(startWarmup, { timeout: 2000 });
    return;
  }

  window.setTimeout(startWarmup, 800);
}

export async function cacheStaticVisualAssetUrls(
  urls: string[],
  cacheWithWorker: (urls: string[]) => Promise<boolean> = registerAssetCacheWorker,
  warmHttpCache: (urls: string[]) => Promise<void> = warmHttpImageCache
) {
  if (!urls.length) return;
  const cachedByWorker = await cacheWithWorker(urls);
  if (!cachedByWorker) await warmHttpCache(urls);
}

function waitForWorkerReply(worker: ServiceWorker, urls: string[]) {
  return new Promise<boolean>((resolve) => {
    const channel = new MessageChannel();
    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      channel.port1.close();
      resolve(success);
    };
    const timeoutId = window.setTimeout(() => finish(false), serviceWorkerReplyTimeoutMs);

    channel.port1.onmessage = (event: MessageEvent<{ ok?: boolean }>) => finish(event.data?.ok === true);
    channel.port1.onmessageerror = () => finish(false);

    try {
      worker.postMessage({ type: assetCacheMessageType, urls }, [channel.port2]);
    } catch {
      finish(false);
    }
  });
}

function waitForReadyServiceWorker() {
  return new Promise<ServiceWorkerRegistration | undefined>((resolve) => {
    let settled = false;
    const finish = (registration?: ServiceWorkerRegistration) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(registration);
    };
    const timeoutId = window.setTimeout(() => finish(), serviceWorkerReadyTimeoutMs);
    navigator.serviceWorker.ready.then(finish, () => finish());
  });
}

async function registerAssetCacheWorker(urls: string[]) {
  if (!("serviceWorker" in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.register(publicAsset("/asset-cache-sw.js"), {
      scope: import.meta.env.BASE_URL || "/"
    });
    const readyRegistration = registration.active ? registration : await waitForReadyServiceWorker();
    const worker = readyRegistration?.active || registration.active || navigator.serviceWorker.controller;
    if (!worker) return false;
    return await waitForWorkerReply(worker, urls);
  } catch {
    return false;
  }
}

async function warmHttpImageCache(urls: string[]) {
  let cursor = 0;

  const warmNext = async () => {
    while (cursor < urls.length) {
      const url = urls[cursor];
      cursor += 1;

      try {
        await fetch(url, {
          cache: "force-cache",
          credentials: "same-origin",
          mode: "same-origin"
        });
      } catch {
        // Missing optional assets should not interrupt the app boot.
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(maxParallelWarmups, urls.length) }, warmNext));
}

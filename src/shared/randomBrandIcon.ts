import { publicAsset } from "./publicPath";

export const randomBrandIconPaths = [
  "/brand-icons/ququ-01-jiaojiao-shush.png",
  "/brand-icons/ququ-02-lingdang-shush.png",
  "/brand-icons/ququ-03-lingdang-kiss.png",
  "/brand-icons/ququ-04-zhuxiaodi-kiss.png",
  "/brand-icons/ququ-05-lingdang-giggle.png",
  "/brand-icons/ququ-06-lingdang-moon.png"
] as const;

export function randomBrandIconPath(random = Math.random) {
  const randomValue = Math.min(Math.max(random(), 0), 1 - Number.EPSILON);
  return randomBrandIconPaths[Math.floor(randomValue * randomBrandIconPaths.length)];
}

export function randomBrandIconUrl(random = Math.random) {
  return publicAsset(randomBrandIconPath(random));
}

export function applyBrandFavicon(iconUrl: string) {
  const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!favicon) return;
  favicon.type = "image/png";
  favicon.href = iconUrl;
}

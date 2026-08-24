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

export function faviconUrlForBrandIcon(iconUrl: string, refreshToken = Date.now()) {
  const separator = iconUrl.includes("?") ? "&" : "?";
  return `${iconUrl}${separator}refresh=${refreshToken.toString(36)}`;
}

export function applyBrandFavicon(iconUrl: string) {
  const href = faviconUrlForBrandIcon(iconUrl);
  document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="apple-touch-icon"]')
    .forEach((link) => link.remove());

  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.type = "image/png";
  favicon.sizes = "512x512";
  favicon.href = href;
  document.head.append(favicon);

  const touchIcon = document.createElement("link");
  touchIcon.rel = "apple-touch-icon";
  touchIcon.sizes = "512x512";
  touchIcon.href = href;
  document.head.append(touchIcon);
}

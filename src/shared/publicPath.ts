const absoluteUrlPattern = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const rootMountedPublicAssetPrefixes = [
  "/avatars/jojo/npc-"
];

export function resolvePublicAssetPath(path: string | undefined): string | undefined {
  if (!path || absoluteUrlPattern.test(path) || !path.startsWith("/")) return path;
  if (rootMountedPublicAssetPrefixes.some((prefix) => path.startsWith(prefix))) return path;
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  if (normalizedBase === "/") return path;
  return `${normalizedBase}${path.replace(/^\/+/, "")}`;
}

export function publicAsset(path: string): string {
  return resolvePublicAssetPath(path) || path;
}

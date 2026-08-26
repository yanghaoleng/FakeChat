const avatarPreviewPrefix = "/avatars/thumbs/96/";
const avatarSourcePrefix = "/avatars/";
const photoPreviewSize = "480";

function isLocalWebpPath(path: string | undefined): path is string {
  return Boolean(path?.startsWith("/") && path.endsWith(".webp"));
}

export function avatarPreviewPath(path: string | undefined) {
  if (!isLocalWebpPath(path)) return path;
  if (!path.startsWith(avatarSourcePrefix) || path.startsWith(avatarPreviewPrefix)) return path;
  return `${avatarPreviewPrefix}${path.slice(avatarSourcePrefix.length)}`;
}

export function messageImagePreviewPath(path: string | undefined) {
  if (!isLocalWebpPath(path)) return path;
  const match = path.match(/^\/(viral-assets|jojo-assets)\/photos\/(.+\.webp)$/);
  if (!match) return path;
  return `/${match[1]}/photos-${photoPreviewSize}/${match[2]}`;
}

export function visualPreviewPath(path: string | undefined) {
  return messageImagePreviewPath(avatarPreviewPath(path));
}

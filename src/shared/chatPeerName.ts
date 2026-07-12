import { isJojoProject } from "./jojoProject.js";
import type { DramaProject } from "./schema.js";

const genericPeerNames = new Set([
  "男主",
  "女主",
  "男生",
  "女生",
  "对方",
  "聊天对象",
  "陌生人",
  "联系人",
  "某某"
]);

function isUsablePeerName(value: string | undefined) {
  const name = value?.trim();
  if (!name || genericPeerNames.has(name)) return false;
  return /^[\p{Script=Han}·]{2,6}$/u.test(name);
}

function escapedRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function firstUsableMatch(prompt: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const name = prompt.match(pattern)?.[1]?.trim();
    if (isUsablePeerName(name)) return name;
  }
  return undefined;
}

export function explicitViralPeerName(project: DramaProject, prompt: string) {
  if (isJojoProject(project)) return undefined;
  const peer = project.characters.find((character) => character.side === "left");
  if (!peer) return undefined;
  const roleLabel = peer.id === "girl" ? "女主" : "男主";
  const role = escapedRegExp(roleLabel);
  const name = "([\\p{Script=Han}·]{2,6}?)";
  const boundary = "(?=[”\"'’]?\\s*(?:是|，|,|。|；|;|、|$))";

  return firstUsableMatch(prompt, [
    new RegExp(`${role}\\s*(?:名叫|名字是|姓名是|叫|名为)\\s*[“\"'‘]?${name}${boundary}`, "u"),
    new RegExp(`${role}\\s*[：:]\\s*[“\"'‘]?${name}${boundary}`, "u"),
    new RegExp(`${role}\\s*[“\"'‘]?${name}${boundary}`, "u"),
    new RegExp(`(?:聊天对象|对方|联系人)\\s*(?:名叫|名字是|姓名是|叫|名为)\\s*[“\"'‘]?${name}${boundary}`, "u")
  ]);
}

export function resolveFirstViralPeerCharacters(
  project: DramaProject,
  generatedProject: DramaProject,
  prompt: string
): DramaProject["characters"] {
  if (isJojoProject(project) || project.messages.length) return project.characters;
  const peer = project.characters.find((character) => character.side === "left");
  if (!peer) return project.characters;

  const generatedPeer = generatedProject.characters.find((character) => character.id === peer.id)
    ?? generatedProject.characters.find((character) => character.side === "left");
  const nextName = explicitViralPeerName(project, prompt)
    ?? (isUsablePeerName(generatedPeer?.name) ? generatedPeer!.name.trim() : peer.name);

  return project.characters.map((character) => character.id === peer.id
    ? { ...character, name: nextName, avatarInitial: nextName.slice(-1) }
    : character);
}

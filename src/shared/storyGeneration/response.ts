import { normalizeDeepSeekProject } from "../deepseekProject.js";
import { constrainGeneratedProjectSessions } from "../multiSession.js";
import { normalizeSuggestedPrompt } from "../suggestedPrompt.js";
import type { ChatSession, DramaProject, ScriptGenerateRequest } from "../schema.js";
import type { NormalizedGeneratedStoryOutput } from "./contract.js";

type UnknownRecord = Record<string, unknown>;
type MigratingSession = ChatSession & { kind?: "direct" | "group" };

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function objectValues(value: unknown) {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) return Object.values(value);
  return [];
}

function suggestedPromptFromOutput(root: UnknownRecord, payload: UnknownRecord) {
  for (const source of [root, payload]) {
    for (const key of ["suggestedPrompt", "nextPrompt", "followUpPrompt", "continuePrompt"]) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) return normalizeSuggestedPrompt(value);
    }
  }
  return undefined;
}

function normalizeDeltaMessages(value: unknown) {
  return objectValues(value).map((message) => {
    if (!isRecord(message)) return message;
    const senderId = stringValue(message.senderId);
    return senderId && !stringValue(message.roleId)
      ? { ...message, roleId: senderId }
      : message;
  });
}

function sessionId(value: unknown) {
  if (!isRecord(value)) return undefined;
  return stringValue(value.id) || stringValue(value.sessionId) || stringValue(value.conversationId);
}

function sessionKind(value: unknown): "direct" | "group" | undefined {
  if (!isRecord(value)) return undefined;
  return value.kind === "direct" || value.kind === "group" ? value.kind : undefined;
}

function restoreSessionKinds(project: DramaProject, rawSessions: unknown): DramaProject {
  const kindById = new Map<string, "direct" | "group">();
  for (const rawSession of objectValues(rawSessions)) {
    const id = sessionId(rawSession);
    const kind = sessionKind(rawSession);
    if (id && kind) kindById.set(id, kind);
  }
  if (!kindById.size) return project;

  // `kind` is optional during the schema-v2 migration. Keeping it on the
  // normalized object lets newer schemas retain it while older schemas safely
  // ignore it at their persistence boundary.
  return {
    ...project,
    chatSessions: project.chatSessions.map((session) => {
      const kind = kindById.get(session.id);
      return kind ? { ...session, kind } as MigratingSession : session;
    })
  };
}

function deltaPayload(value: unknown): { root: UnknownRecord; payload: UnknownRecord } | undefined {
  if (!isRecord(value)) return undefined;
  if (Object.prototype.hasOwnProperty.call(value, "newMessages")) return { root: value, payload: value };
  if (isRecord(value.delta) && (
    Object.prototype.hasOwnProperty.call(value.delta, "newMessages")
    || Object.prototype.hasOwnProperty.call(value.delta, "messages")
  )) {
    return { root: value, payload: value.delta };
  }
  return undefined;
}

function sameHistoricalMessage(
  generated: DramaProject["messages"][number],
  existing: DramaProject["messages"][number]
) {
  return generated.type === existing.type
    && generated.side === existing.side
    && generated.text.trim() === existing.text.trim();
}

function fullProjectMessageIds(value: unknown) {
  if (!isRecord(value)) return new Set<string>();
  let source = value;
  for (const key of ["project", "dramaProject", "result", "data"]) {
    if (isRecord(value[key])) {
      source = value[key];
      break;
    }
  }
  return new Set(objectValues(source.messages).flatMap((message) => {
    if (!isRecord(message)) return [];
    const id = stringValue(message.id);
    return id ? [id] : [];
  }));
}

/**
 * Historical providers may still return a complete project even though the
 * generation pipeline consumes a delta. Remove current history before that
 * project reaches ID regeneration/append logic. IDs are authoritative; the
 * ordered content fallback covers providers that omit historical IDs.
 */
function projectWithOnlyGeneratedMessages(
  generatedProject: DramaProject,
  project: DramaProject,
  explicitMessageIds: ReadonlySet<string>
): DramaProject {
  const existingIndexById = new Map(project.messages.map((message, index) => [message.id, index]));
  let historyCursor = 0;
  const messages = generatedProject.messages.filter((message) => {
    if (explicitMessageIds.has(message.id)) {
      const existingIndex = existingIndexById.get(message.id);
      if (existingIndex === undefined) return true;
      historyCursor = Math.max(historyCursor, existingIndex + 1);
      return false;
    }
    const expectedHistory = project.messages[historyCursor];
    if (expectedHistory && sameHistoricalMessage(message, expectedHistory)) {
      historyCursor += 1;
      return false;
    }
    return true;
  });
  return messages.length === generatedProject.messages.length
    ? generatedProject
    : { ...generatedProject, messages };
}

/**
 * Normalizes both the compact v1 delta and the historical full-DramaProject
 * model response into the same generated-project shape consumed by the
 * existing reconciliation pipeline.
 */
export function normalizeGeneratedStoryOutput({
  value,
  project,
  request,
  allowMultiSession = false,
  activeSessionId
}: {
  value: unknown;
  project: DramaProject;
  request: ScriptGenerateRequest;
  allowMultiSession?: boolean;
  activeSessionId?: string;
}): NormalizedGeneratedStoryOutput {
  const delta = deltaPayload(value);
  if (!delta) {
    const root = isRecord(value) ? value : {};
    const suggestedPrompt = suggestedPromptFromOutput(root, root);
    const normalizedProject = projectWithOnlyGeneratedMessages(
      normalizeDeepSeekProject(value, request),
      project,
      fullProjectMessageIds(value)
    );
    return {
      format: "full-project",
      project: constrainGeneratedProjectSessions({
        project,
        generatedProject: normalizedProject,
        allowMultiSession,
        activeSessionId,
        preserveExistingMessages: false
      }),
      ...(suggestedPrompt ? { suggestedPrompt } : {})
    };
  }

  const { root, payload } = delta;
  const topology = isRecord(payload.topologyChanges)
    ? payload.topologyChanges
    : isRecord(payload.topology)
      ? payload.topology
      : {};
  const rawSessions = topology.chatSessions ?? topology.sessions ?? project.chatSessions;
  const normalizedProject = normalizeDeepSeekProject({
    id: project.id,
    title: stringValue(topology.title) || project.title,
    brief: project.brief,
    chatMode: topology.chatMode === "direct" || topology.chatMode === "group" ? topology.chatMode : project.chatMode,
    stylePreset: project.stylePreset,
    fps: project.fps,
    canvas: project.canvas,
    characters: objectValues(topology.characters).length ? topology.characters : project.characters,
    chatSessions: rawSessions,
    assets: payload.newAssets ?? payload.assets ?? [],
    messages: normalizeDeltaMessages(payload.newMessages ?? payload.messages),
    sfx: payload.sfx ?? {},
    audioMix: project.audioMix
  }, request);
  const suggestedPrompt = suggestedPromptFromOutput(root, payload);

  const restoredProject = restoreSessionKinds(normalizedProject, rawSessions);
  return {
    format: "delta",
    project: constrainGeneratedProjectSessions({
      project,
      generatedProject: restoredProject,
      allowMultiSession,
      activeSessionId,
      preserveExistingMessages: false
    }),
    ...(suggestedPrompt ? { suggestedPrompt } : {})
  };
}

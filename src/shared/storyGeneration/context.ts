import {
  chatSessionIdForMessage,
  chatSessionTitle,
  getChatSessions,
  getConversationIndex
} from "../chatSessions.js";
import type { PromptCard } from "../linearStory.js";
import type { ChatMessage, ChatSession, DramaProject } from "../schema.js";

export const MAX_CONTEXT_PROMPT_CARDS = 8;
export const MAX_CONTEXT_MESSAGES_PER_SESSION = 12;
export const MAX_CONTEXT_MESSAGES_TOTAL = 40;
export const MAX_CONTEXT_USER_PROMPT_CHARS = 24_000;

export function generatedStoryDeltaInstruction() {
  return [
    "只输出 GeneratedStoryDelta，绝对不要输出完整 DramaProject，不要复制历史 messages、旧 assets 或未变化的拓扑。",
    "严格 JSON 结构：{schemaVersion:1,newMessages:[...],topologyChanges?:{title?,chatMode?,characters?,chatSessions?},newAssets?:[],suggestedPrompt?:string}。",
    "newMessages 只包含本段新消息；每条必须有 sessionId、senderId、side、type、text、emotion、sendSfx、pauseMs、holdMs。senderId 是标准字段，旧 roleId 仅用于兼容。",
    "topologyChanges 只在标题、角色或会话变化时输出；一旦输出 characters 或 chatSessions，它们必须是变更后的完整列表。chatSessions 每项包含 id、title、kind(direct/group)、participantIds。",
    "newAssets 只放本段新增素材；如果本段没有拓扑或素材变更，省略对应字段。"
  ].join("\n");
}

type MigratingMessage = ChatMessage & { senderId?: string };
type MigratingSession = ChatSession & { kind?: "direct" | "group" };

export type BoundedStoryContext = {
  stableFacts: string;
  characterCatalog: string;
  sessionCatalog: string;
  recentPromptCards: string;
  recentMessages: string;
  includedMessageCount: number;
  omittedMessageCount: number;
  includedSessionIds: string[];
};

type IndexedMessage = {
  index: number;
  message: ChatMessage;
  sessionId: string;
};

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function clipContextText(value: string, maxLength: number) {
  const compact = compactWhitespace(value);
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function sessionKind(project: DramaProject, session: ChatSession): "direct" | "group" {
  return (session as MigratingSession).kind
    ?? (project.chatMode === "group" || session.participantIds.length > 2 ? "group" : "direct");
}

function senderIdForMessage(message: ChatMessage) {
  return (message as MigratingMessage).senderId || message.roleId;
}

function serializeSession(project: DramaProject, session: ChatSession, index: number) {
  const participants = session.participantIds.map((senderId) => {
    const character = project.characters.find((item) => item.id === senderId);
    return character
      ? `${clipContextText(character.name, 32)}(senderId=${clipContextText(character.id, 48)})`
      : clipContextText(senderId, 48);
  }).join("、");
  return clipContextText(
    `${index + 1}. ${clipContextText(chatSessionTitle(project, session), 64)} (sessionId=${clipContextText(session.id, 64)}, kind=${sessionKind(project, session)})：${participants}`,
    420
  );
}

function serializeMessage(project: DramaProject, item: IndexedMessage, sessionById: ReadonlyMap<string, ChatSession>) {
  const { message, index, sessionId } = item;
  const senderId = senderIdForMessage(message);
  const character = senderId ? project.characters.find((candidate) => candidate.id === senderId) : undefined;
  const speaker = character?.name || (message.side === "right" ? "玩家" : message.side === "left" ? "联系人" : "系统");
  const session = sessionById.get(sessionId);
  const label = session ? `${chatSessionTitle(project, session)}/${session.id}` : sessionId;
  const content = message.text || message.ttsText || "媒体消息";
  return `${index + 1}. [会话:${clipContextText(label, 80)}] ${clipContextText(speaker, 24)}(senderId=${clipContextText(senderId || "system", 40)})/${message.type}: ${clipContextText(content, 140)}`;
}

function selectRecentMessages(project: DramaProject, sessions: ChatSession[]): IndexedMessage[] {
  if (!project.messages.length) return [];
  const conversationIndex = getConversationIndex(project);
  const grouped = new Map(sessions.map((session) => [session.id, [] as IndexedMessage[]]));

  project.messages.forEach((message, index) => {
    const sessionId = chatSessionIdForMessage(project, message, conversationIndex);
    const items = grouped.get(sessionId);
    if (items) items.push({ index, message, sessionId });
  });

  const candidates = [...grouped.values()].flatMap((items) => items.slice(-MAX_CONTEXT_MESSAGES_PER_SESSION));
  const selected = new Map<number, IndexedMessage>();

  // First reserve the newest event from every non-empty active session. This
  // prevents a busy conversation from erasing a quieter parallel storyline.
  for (const items of grouped.values()) {
    const latest = items.at(-1);
    if (latest) selected.set(latest.index, latest);
  }

  for (const item of candidates.sort((a, b) => b.index - a.index)) {
    if (selected.size >= MAX_CONTEXT_MESSAGES_TOTAL) break;
    selected.set(item.index, item);
  }

  return [...selected.values()].sort((a, b) => a.index - b.index);
}

export function buildBoundedStoryContext({
  project,
  promptCards,
  sanitize = (value: string) => value
}: {
  project: DramaProject;
  promptCards: PromptCard[];
  sanitize?: (value: string) => string;
}): BoundedStoryContext {
  const sessions = getChatSessions(project);
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const selectedMessages = selectRecentMessages(project, sessions);
  const recentCards = promptCards.slice(-MAX_CONTEXT_PROMPT_CARDS);
  const omittedCards = Math.max(0, promptCards.length - recentCards.length);

  const stableFacts = [
    `项目标题：${clipContextText(project.title, 120)}`,
    `项目模式（旧兼容字段）：${project.chatMode}`,
    `当前稳定设定：${clipContextText(sanitize(project.brief), 900) || "无"}`
  ].join("\n");
  const characterCatalog = clipContextText(project.characters.map((character) => (
    `${clipContextText(character.name, 32)}(senderId=${clipContextText(character.id, 48)}, side=${character.side})`
  )).join("、"), 1_200);
  const sessionCatalog = sessions.map((session, index) => serializeSession(project, session, index)).join("\n") || "无";
  const recentPromptCards = [
    ...(omittedCards ? [`更早 ${omittedCards} 张卡片已折叠；稳定设定以当前项目为准。`] : []),
    ...recentCards.map((card, index) => {
      const absoluteIndex = promptCards.length - recentCards.length + index + 1;
      return `${absoluteIndex}. Prompt=${clipContextText(sanitize(card.prompt), 140)}；摘要=${clipContextText(sanitize(card.summary), 180)}`;
    })
  ].join("\n") || "无";
  const recentMessages = selectedMessages
    .map((item) => serializeMessage(project, item, sessionById))
    .join("\n") || "无";

  return {
    stableFacts,
    characterCatalog,
    sessionCatalog,
    recentPromptCards,
    recentMessages,
    includedMessageCount: selectedMessages.length,
    omittedMessageCount: Math.max(0, project.messages.length - selectedMessages.length),
    includedSessionIds: [...new Set(selectedMessages.map((item) => item.sessionId))]
  };
}

export function buildBoundedUserPrompt({
  project,
  prompt,
  promptCards,
  sanitize = (value: string) => value
}: {
  project: DramaProject;
  prompt: string;
  promptCards: PromptCard[];
  sanitize?: (value: string) => string;
}) {
  const context = buildBoundedStoryContext({ project, promptCards, sanitize });
  const content = [
    `当前新 Prompt：${clipContextText(prompt, 1_500)}`,
    "",
    "稳定事实：",
    context.stableFacts,
    "",
    "当前角色：",
    context.characterCatalog,
    "",
    "当前聊天会话：",
    context.sessionCatalog,
    "",
    `此前 Prompt 卡片（最近 ${MAX_CONTEXT_PROMPT_CARDS} 张摘要）：`,
    context.recentPromptCards,
    "",
    `最近对话（每会话最多 ${MAX_CONTEXT_MESSAGES_PER_SESSION} 条，全局最多 ${MAX_CONTEXT_MESSAGES_TOTAL} 条，已折叠 ${context.omittedMessageCount} 条）：`,
    context.recentMessages,
    "",
    "上面的有界历史按全局发生顺序排列，[会话:名称/id] 是不可混淆的聊天线。历史只用于承接人物关系和已发生事实；如果当前新 Prompt 明确修改旧设定，以当前新 Prompt 为准。不要复用上一轮图片文案或固定例子。",
    "请只输出下一段 GeneratedStoryDelta，不要重写整个项目。输出严格 JSON。"
  ].join("\n");

  // Individual sections are bounded already. Keep this final guard so future
  // additions cannot accidentally restore an unbounded request body.
  return content.length <= MAX_CONTEXT_USER_PROMPT_CHARS
    ? content
    : `${content.slice(0, MAX_CONTEXT_USER_PROMPT_CHARS - 1).trimEnd()}…`;
}

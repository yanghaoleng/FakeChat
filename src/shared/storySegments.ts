import { parseProject, type ChatMessage, type DramaProject } from "./schema.js";

export type StoryTopologySnapshot = Omit<DramaProject, "messages">;

export type StorySegment = {
  version: 1;
  messageIds: string[];
  before: StoryTopologySnapshot;
  after: StoryTopologySnapshot;
};

export type StoryCardWithSegment = {
  prompt: string;
  messageIds: string[];
  segment?: StorySegment;
};

export type StoryRestoreResult<TCard extends StoryCardWithSegment> = {
  project: DramaProject;
  promptCards: TCard[];
};

function uniqueStringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())))];
}

export function snapshotStoryTopology(project: DramaProject): StoryTopologySnapshot {
  const { messages: sourceMessages, ...sourceTopology } = project;
  void sourceMessages;
  const canonicalProject = parseProject({ ...sourceTopology, messages: [] });
  const { messages: omittedMessages, ...topology } = canonicalProject;
  void omittedMessages;
  return structuredClone(topology);
}

export function parseStoryTopology(value: unknown): StoryTopologySnapshot | undefined {
  if (!value || typeof value !== "object") return undefined;
  try {
    return snapshotStoryTopology(parseProject({ ...value, messages: [] }));
  } catch {
    return undefined;
  }
}

export function createStorySegment(
  beforeProject: DramaProject,
  afterProject: DramaProject,
  messageIds: readonly string[]
): StorySegment {
  return {
    version: 1,
    messageIds: uniqueStringIds(messageIds),
    before: snapshotStoryTopology(beforeProject),
    after: snapshotStoryTopology(afterProject)
  };
}

export function attachStorySegment<TCard extends StoryCardWithSegment>(
  card: TCard,
  beforeProject: DramaProject,
  afterProject: DramaProject
): TCard {
  return {
    ...card,
    segment: createStorySegment(beforeProject, afterProject, card.messageIds)
  };
}

export function parseStorySegment(value: unknown, fallbackMessageIds: readonly string[] = []): StorySegment | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<StorySegment>;
  if (candidate.version !== 1) return undefined;
  const before = parseStoryTopology(candidate.before);
  const after = parseStoryTopology(candidate.after);
  if (!before || !after) return undefined;
  const messageIds = uniqueStringIds(candidate.messageIds);
  return {
    version: 1,
    messageIds: messageIds.length ? messageIds : uniqueStringIds(fallbackMessageIds),
    before,
    after
  };
}

function cardMessageIds(card: StoryCardWithSegment) {
  return card.segment?.messageIds.length ? card.segment.messageIds : card.messageIds;
}

function messagesForCards<TCard extends StoryCardWithSegment>(project: DramaProject, promptCards: readonly TCard[]) {
  const retainedMessageIds = new Set(promptCards.flatMap(cardMessageIds));
  return project.messages.filter((message) => retainedMessageIds.has(message.id));
}

function legacyTopologyForMessages(project: DramaProject, messages: readonly ChatMessage[]): StoryTopologySnapshot {
  const topology = snapshotStoryTopology(project);
  if (project.chatMode === "group" || !topology.chatSessions.length) return topology;
  const usedSessionIds = new Set(messages.map((message) => message.sessionId).filter((id): id is string => Boolean(id)));
  if (!usedSessionIds.size) return topology;
  return {
    ...topology,
    chatSessions: topology.chatSessions.filter((session) => usedSessionIds.has(session.id))
  };
}

function restoreProject<TCard extends StoryCardWithSegment>({
  currentProject,
  retainedPromptCards,
  topology
}: {
  currentProject: DramaProject;
  retainedPromptCards: TCard[];
  topology?: StoryTopologySnapshot;
}): StoryRestoreResult<TCard> {
  const messages = messagesForCards(currentProject, retainedPromptCards);
  const restoredTopology = topology ?? legacyTopologyForMessages(currentProject, messages);
  const project = parseProject({
    ...restoredTopology,
    messages,
    ...(!topology && retainedPromptCards.length
      ? { brief: retainedPromptCards.map((card) => card.prompt).join("\n") || currentProject.brief }
      : {})
  });
  return { project, promptCards: retainedPromptCards };
}

/** Restores the exact project state immediately before the indexed card. */
export function restoreStoryBeforeCard<TCard extends StoryCardWithSegment>(
  currentProject: DramaProject,
  promptCards: readonly TCard[],
  cardIndex: number
): StoryRestoreResult<TCard> {
  if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= promptCards.length) {
    throw new RangeError("Story card index is out of range");
  }
  const retainedPromptCards = promptCards.slice(0, cardIndex);
  const targetCard = promptCards[cardIndex];
  const previousCard = retainedPromptCards.at(-1);
  const topology = targetCard.segment?.before ?? previousCard?.segment?.after;
  return restoreProject({ currentProject, retainedPromptCards, topology });
}

/** Restores the exact project state at the end of the indexed card. */
export function restoreStoryThroughCard<TCard extends StoryCardWithSegment>(
  currentProject: DramaProject,
  promptCards: readonly TCard[],
  cardIndex: number
): StoryRestoreResult<TCard> {
  if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= promptCards.length) {
    throw new RangeError("Story card index is out of range");
  }
  const retainedPromptCards = promptCards.slice(0, cardIndex + 1);
  const targetCard = promptCards[cardIndex];
  return restoreProject({
    currentProject,
    retainedPromptCards,
    topology: targetCard.segment?.after
  });
}

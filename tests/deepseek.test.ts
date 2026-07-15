import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeDeepSeekProject } from "../src/shared/deepseekProject";
import { generateDeepSeekStorySegmentWithConfig } from "../src/shared/deepseekBrowser";
import { sampleProject } from "../src/shared/sampleProject";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normalizeDeepSeekProject", () => {
  it("accepts object assets and array sfx from model JSON", () => {
    const project = normalizeDeepSeekProject(
      {
        title: "泳池误会",
        brief: "男主在泳池误会女主，反转揭开。",
        characters: {
          boy: { id: "boy", name: "阿泽", side: "right" },
          girl: { id: "girl", name: "小雨", side: "left" }
        },
        assets: {
          photo: { id: "photo", kind: "image", title: "泳池照片", sourceName: "DeepSeek", sourceUrl: "" }
        },
        messages: [
          { side: "right", type: "text", text: "刚才对不起", holdMs: 1200, pauseMs: 300 },
          { side: "left", type: "text", text: "你认错人了", holdMs: 1300, pauseMs: 300 },
          { side: "right", type: "transfer", text: "赔你奶茶", amount: 50, holdMs: 1500, pauseMs: 400 }
        ],
        sfx: []
      },
      { brief: "泳池误会", durationSeconds: 75 }
    );

    expect(project.title).toBe("泳池误会");
    expect(project.assets.some((asset) => asset.id === "photo")).toBe(true);
    expect(project.assets.some((asset) => asset.id.startsWith("qface-"))).toBe(true);
    expect(project.sfx).toEqual({});
    expect(project.messages).toHaveLength(3);
    expect(project.messages[2].sendSfx).toBe("transfer");
  });

  it("caps overlong model scripts while keeping visual media beats without forcing transfer", () => {
    const messages = Array.from({ length: 96 }, (_, index) => ({
      side: index % 2 === 0 ? "right" : "left",
      type: "text",
      text: `第${index + 1}句`,
      holdMs: 1200,
      pauseMs: 300
    }));
    messages[80] = { ...messages[80], type: "transfer", text: "补偿你" };
    messages[81] = { ...messages[81], type: "image", text: "证据照片" };
    messages[82] = { ...messages[82], type: "meme", text: "别急" };

    const project = normalizeDeepSeekProject(
      {
        title: "超长脚本",
        brief: "测试超长脚本裁剪",
        messages,
        sfx: {}
      },
      { brief: "测试超长脚本裁剪", durationSeconds: 75 }
    );

    expect(project.messages).toHaveLength(72);
    expect(project.messages.some((message) => message.type === "transfer")).toBe(false);
    expect(project.messages.some((message) => message.type === "image")).toBe(true);
    expect(project.messages.some((message) => message.type === "meme")).toBe(true);
  });

  it("forces player male messages to the right and female messages to the left", () => {
    const project = normalizeDeepSeekProject(
      {
        title: "左右纠正",
        brief: "玩家永远扮演男生。",
        messages: [
          { speaker: "男主", side: "left", type: "text", text: "我先说" },
          { speaker: "女主", side: "right", type: "text", text: "你说" },
          { text: "玩家：这条也在右边" },
          { text: "女生：这条在左边" }
        ],
        sfx: {}
      },
      { brief: "玩家永远扮演男生", durationSeconds: 75 }
    );

    expect(project.messages.map((message) => message.side)).toEqual(["right", "left", "right", "left"]);
    expect(project.messages.map((message) => message.roleId)).toEqual(["boy", "girl", "boy", "girl"]);
  });

  it("does not invent transfer messages and picks contextual amounts", () => {
    const noTransfer = normalizeDeepSeekProject(
      {
        title: "无转账",
        brief: "只靠截图推进误会。",
        messages: [
          { side: "right", type: "text", text: "截图给我" },
          { side: "left", type: "image", text: "订单截图显示收件人是你" }
        ],
        sfx: {}
      },
      { brief: "只靠截图推进误会", durationSeconds: 75 }
    );
    expect(noTransfer.messages.some((message) => message.type === "transfer")).toBe(false);

    const withTransfer = normalizeDeepSeekProject(
      {
        title: "转账金额",
        brief: "男主补订单差额。",
        messages: [
          { speaker: "男主", type: "transfer", text: "我先把差额补给你" },
          { speaker: "女主", type: "text", text: "这不是差额" }
        ],
        sfx: {}
      },
      { brief: "男主补订单差额", durationSeconds: 75 }
    );
    expect(withTransfer.messages[0].amount).toBe(368);
  });

  it("binds meme messages to local expression assets", () => {
    const project = normalizeDeepSeekProject(
      {
        title: "表情",
        brief: "女生发现男主心虚。",
        messages: [
          { speaker: "女主", type: "meme", text: "表情包", emotion: "心虚" }
        ],
        sfx: {}
      },
      { brief: "女生发现男主心虚", durationSeconds: 75 }
    );

    expect(project.messages[0].assetId).toMatch(/^qface-/);
    expect(project.assets.some((asset) => asset.id === project.messages[0].assetId && asset.localPath?.startsWith("/memes/qface/"))).toBe(true);
    expect(project.messages[0].text).not.toBe("破防");
  });

  it("normalizes session aliases, message conversation ids, and at most six characters", () => {
    const project = normalizeDeepSeekProject(
      {
        title: "多线聊天",
        characters: [
          { id: "boy", name: "阿泽", side: "right" },
          { id: "girl", name: "林夏", side: "left" },
          { id: "lawyer", name: "周律师", side: "left" },
          { id: "boss", name: "王总", side: "left" },
          { id: "friend", name: "老陈", side: "left" },
          { id: "mother", name: "妈妈", side: "left" },
          { id: "coworker", name: "小李", side: "left" }
        ],
        conversations: [
          { conversationId: "chat-main", name: "林夏", participants: ["boy", "girl"] },
          { sessionId: "chat-lawyer", title: "周律师", memberIds: ["boy", "lawyer"] }
        ],
        messages: [
          { conversationId: "chat-main", roleId: "girl", side: "left", type: "text", text: "你先看合同" },
          { conversationId: "chat-lawyer", roleId: "lawyer", side: "left", type: "text", text: "第七条有问题" }
        ],
        sfx: {}
      },
      { brief: "合同纠纷分两个会话推进", durationSeconds: 75 }
    );

    expect(project.characters).toHaveLength(6);
    expect(project.characters.some((character) => character.id === "lawyer" && character.name === "周律师")).toBe(true);
    expect(project.chatSessions.map((session) => session.id)).toEqual(["chat-main", "chat-lawyer"]);
    expect(project.chatSessions[1].participantIds).toEqual(expect.arrayContaining(["boy", "lawyer"]));
    expect(project.messages.map((message) => message.sessionId)).toEqual(["chat-main", "chat-lawyer"]);
  });

  it("atomically merges new direct-chat contacts and sessions while serializing named session history", async () => {
    const currentProject = {
      ...sampleProject,
      chatSessions: [{ id: "chat-main", title: "旧聊天", participantIds: ["boy", "girl"] }],
      messages: [{ ...sampleProject.messages[0], sessionId: "chat-main" }]
    };
    const modelProject = {
      title: "模型试图改标题",
      characters: [
        { id: "boy", name: "被改名的玩家", side: "right" },
        { id: "girl", name: "林夏", side: "left" },
        { id: "lawyer", name: "周律师", side: "left" }
      ],
      sessions: [
        { id: "chat-main", title: "不应覆盖旧标题", participantIds: ["boy", "girl"] },
        { id: "chat-lawyer", title: "周律师", participantIds: ["boy", "lawyer"] }
      ],
      messages: [
        { conversationId: "chat-lawyer", roleId: "lawyer", side: "left", type: "text", text: "合同第七条隐藏了违约金" },
        { conversationId: "chat-main", roleId: "girl", side: "left", type: "text", text: "我刚拿到对方的补充协议" },
        { conversationId: "chat-lawyer", roleId: "boy", side: "right", type: "text", text: "两份文件的时间对上了" }
      ],
      assets: [],
      sfx: {}
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(modelProject) } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await generateDeepSeekStorySegmentWithConfig({
      project: currentProject,
      prompt: "让律师和林夏两个会话交错推进合同真相",
      promptCards: [],
      config: { apiKey: "test-key", baseUrl: "https://example.test", model: "deepseek-test" }
    });

    expect(result.project.characters.find((character) => character.id === "boy")?.name).toBe(sampleProject.characters.find((character) => character.id === "boy")?.name);
    expect(result.project.characters.some((character) => character.id === "lawyer" && character.name === "周律师")).toBe(true);
    expect(result.project.characters.find((character) => character.id === "lawyer")?.avatarUrl)
      .not.toBe(result.project.characters.find((character) => character.id === "girl")?.avatarUrl);
    expect(result.project.chatSessions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "chat-main", title: "旧聊天" }),
      expect.objectContaining({ id: "chat-lawyer", title: "周律师" })
    ]));
    expect(result.messages.map((message) => message.sessionId)).toEqual(["chat-lawyer", "chat-main", "chat-lawyer"]);

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { messages: Array<{ content: string }> };
    expect(request.messages[0].content).toContain("1-4 个 chatSessions");
    expect(request.messages[0].content).toContain("全局剧情时间线");
    expect(request.messages[1].content).toContain("旧聊天 (sessionId=chat-main, kind=direct)");
    expect(request.messages[1].content).toContain("[会话:旧聊天/chat-main]");
  });

  it("applies a compact GeneratedStoryDelta without replacing existing history", async () => {
    const currentProject = {
      ...sampleProject,
      chatSessions: [{
        id: "chat-main",
        title: "林夏",
        kind: "direct" as const,
        participantIds: ["boy", "girl"]
      }],
      messages: [{ ...sampleProject.messages[0], sessionId: "chat-main" }]
    };
    const delta = {
      schemaVersion: 1,
      newMessages: [{
        sessionId: "chat-main",
        senderId: "girl",
        side: "left",
        type: "text",
        text: "原始合同的第七条被人换过",
        emotion: "确认",
        sendSfx: "send",
        pauseMs: 320,
        holdMs: 1_400
      }],
      suggestedPrompt: "让林夏发出原文件时间戳。"
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(delta) } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await generateDeepSeekStorySegmentWithConfig({
      project: currentProject,
      prompt: "核对合同原文件的修改痕迹",
      promptCards: [],
      config: { apiKey: "test-key", baseUrl: "https://example.test", model: "deepseek-test" }
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      sessionId: "chat-main",
      roleId: "girl",
      text: "原始合同的第七条被人换过"
    });
    expect(result.project.messages).toHaveLength(2);
    expect(result.project.messages[0].text).toBe(currentProject.messages[0].text);
    expect(result.suggestedPrompt).toBe("让林夏发出原文件时间戳。");
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { messages: Array<{ content: string }> };
    expect(requestBody.messages[0].content).toContain("只输出 GeneratedStoryDelta");
  });

  it("adds a group session to an existing direct multi-session project without clearing old sessions", async () => {
    const lawyer = {
      ...sampleProject.characters[1],
      id: "lawyer",
      name: "周律师",
      avatarInitial: "周"
    };
    const boss = {
      ...sampleProject.characters[1],
      id: "boss",
      name: "王总",
      avatarInitial: "王"
    };
    const currentProject = {
      ...sampleProject,
      title: "合同调查",
      characters: [...sampleProject.characters, lawyer],
      chatSessions: [
        { id: "chat-main", title: "林夏", kind: "direct" as const, participantIds: ["boy", "girl"] },
        { id: "chat-lawyer", title: "周律师", kind: "direct" as const, participantIds: ["boy", "lawyer"] }
      ],
      messages: [
        { ...sampleProject.messages[0], sessionId: "chat-main" },
        { ...sampleProject.messages[1], id: "lawyer-history", roleId: "lawyer", senderId: "lawyer", sessionId: "chat-lawyer" }
      ]
    };
    const groupSession = {
      id: "chat-contract-group",
      title: "合同核对群",
      kind: "group" as const,
      participantIds: ["boy", "girl", "lawyer", "boss"]
    };
    const delta = {
      schemaVersion: 1,
      newMessages: [
        { sessionId: groupSession.id, senderId: "boss", side: "left", type: "text", text: "把两份合同都发群里", emotion: "催促", sendSfx: "send", pauseMs: 320, holdMs: 1_300 },
        { sessionId: groupSession.id, senderId: "lawyer", side: "left", type: "text", text: "我来逐条对比修改痕迹", emotion: "冷静", sendSfx: "send", pauseMs: 320, holdMs: 1_300 }
      ],
      topologyChanges: {
        characters: [...currentProject.characters, boss],
        chatSessions: [...currentProject.chatSessions, groupSession]
      }
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(delta) } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await generateDeepSeekStorySegmentWithConfig({
      project: currentProject,
      prompt: "让林夏、周律师和王总新建微信群聊，同时保留原来两个私聊。",
      promptCards: [],
      config: { apiKey: "test-key", baseUrl: "https://example.test", model: "deepseek-test" }
    });

    expect(result.project.chatMode).toBe("direct");
    expect(result.project.title).toBe("合同调查");
    expect(result.project.chatSessions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "chat-main", kind: "direct" }),
      expect.objectContaining({ id: "chat-lawyer", kind: "direct" }),
      expect.objectContaining({ id: groupSession.id, kind: "group", participantIds: expect.arrayContaining(groupSession.participantIds) })
    ]));
    expect(result.messages.every((message) => message.sessionId === groupSession.id)).toBe(true);
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { messages: Array<{ content: string }> };
    expect(requestBody.messages[0].content).toContain("必须保留其他已有 direct/group 会话");
    expect(requestBody.messages[0].content).not.toContain("这个项目只有一个群聊会话");
  });

  it("repairs a person-like title for a group prompt and binds Journey avatars", async () => {
    const modelProject = {
      title: "唐僧",
      chatMode: "direct",
      characters: [
        { id: "role-a", name: "唐僧", side: "right" },
        { id: "role-b", name: "孙悟空", side: "left" },
        { id: "role-c", name: "女儿国国王", side: "left" },
        { id: "role-d", name: "白骨精", side: "left" },
        { id: "role-e", name: "沙僧", side: "left" },
        { id: "role-f", name: "猪八戒", side: "left" }
      ],
      messages: [
        { roleId: "role-a", side: "right", type: "text", text: "群规先看一下" },
        { roleId: "role-f", side: "left", type: "text", text: "群名谁取的" },
        { roleId: "role-b", side: "left", type: "text", text: "先说正事" },
        { roleId: "role-c", side: "left", type: "text", text: "御弟哥哥怎么看" },
        { roleId: "role-d", side: "left", type: "text", text: "我只看结果" },
        { roleId: "role-e", side: "left", type: "text", text: "行李已经收好" }
      ],
      assets: [],
      sfx: {}
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(modelProject) } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await generateDeepSeekStorySegmentWithConfig({
      project: { ...sampleProject, messages: [] },
      prompt: "写唐僧、孙悟空、女儿国国王、白骨精、沙僧和猪八戒的微信群聊。",
      promptCards: [],
      config: { apiKey: "test-key", baseUrl: "https://example.test", model: "deepseek-test" }
    });

    expect(result.project.chatMode).toBe("group");
    expect(result.project.title).toBe("取经项目总群");
    expect(result.project.characters.map((character) => character.avatarUrl)).toEqual([
      "/avatars/journey-1986-tang.webp",
      "/avatars/journey-1986-wukong.webp",
      "/avatars/journey-1986-queen.webp",
      "/avatars/journey-1986-baigujing.webp",
      "/avatars/journey-1986-shaseng.webp",
      "/avatars/journey-1986-bajie.webp"
    ]);
    expect(result.messages.map((message) => message.roleId)).toEqual([
      "tang", "bajie", "wukong", "queen", "baigujing", "shaseng"
    ]);
    expect(result.messages.map((message) => message.senderId)).toEqual([
      "tang", "bajie", "wukong", "queen", "baigujing", "shaseng"
    ]);
    expect(result.project.messages.slice(-result.messages.length).map((message) => message.senderId)).toEqual(
      result.messages.map((message) => message.senderId)
    );
    expect(result.project.chatSessions).toEqual([{
      id: "chat-main",
      title: "取经项目总群",
      kind: "group",
      participantIds: ["tang", "wukong", "queen", "baigujing", "shaseng", "bajie"]
    }]);
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { messages: Array<{ content: string }> };
    expect(request.messages[0].content).toContain("title 必须像真实群名");
    expect(request.messages[0].content).toContain("chatMode 必须是 group");
    expect(request.messages[0].content).not.toMatch(/莫急|搞么事|东北口语|方言/);
  });

  it("gives an ordinary generated group distinct member avatars and a canonical group session", async () => {
    const duplicatedAvatar = sampleProject.characters.find((character) => character.side === "left")!.avatarUrl;
    const modelProject = {
      title: "项目推进小组",
      chatMode: "group",
      characters: [
        { id: "me", name: "张三", side: "right", avatarGender: "boy", avatarUrl: duplicatedAvatar },
        { id: "li", name: "李四", side: "left", avatarGender: "boy", avatarUrl: duplicatedAvatar },
        { id: "wang", name: "王五", side: "left", avatarGender: "girl", avatarUrl: duplicatedAvatar },
        { id: "zhao", name: "赵六", side: "left", avatarGender: "girl", avatarUrl: duplicatedAvatar }
      ],
      messages: [
        { roleId: "me", side: "right", type: "text", text: "先对一下时间" },
        { roleId: "li", side: "left", type: "text", text: "我负责合同" },
        { roleId: "wang", side: "left", type: "text", text: "我去找付款记录" },
        { roleId: "zhao", side: "left", type: "text", text: "聊天截图在我这" }
      ],
      assets: [],
      sfx: {}
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(modelProject) } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await generateDeepSeekStorySegmentWithConfig({
      project: { ...sampleProject, messages: [] },
      prompt: "写张三、李四、王五和赵六一起查合同的微信群聊。",
      promptCards: [],
      config: { apiKey: "test-key", baseUrl: "https://example.test", model: "deepseek-test" }
    });

    expect(result.project.chatMode).toBe("group");
    expect(new Set(result.project.characters.map((character) => character.avatarUrl)).size)
      .toBe(result.project.characters.length);
    expect(result.project.chatSessions).toEqual([{
      id: "chat-main",
      title: "项目推进小组",
      kind: "group",
      participantIds: result.project.characters.map((character) => character.id)
    }]);
    expect(new Set(result.messages.map((message) => message.roleId))).toEqual(new Set(["me", "li", "wang", "zhao"]));
    expect(result.messages.every((message) => message.sessionId === "chat-main")).toBe(true);
  });
});

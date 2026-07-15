import { describe, expect, it } from "vitest";
import { jojoProject } from "../src/shared/jojoProject";
import { sampleProject } from "../src/shared/sampleProject";
import type { DramaProject } from "../src/shared/schema";
import { buildDeepSeekRequest } from "../src/shared/storyGeneration/deepseekCore";

function lineContaining(content: string, fragment: string) {
  return content.split("\n").find((line) => line.includes(fragment));
}

function section(content: string, start: string, end: string) {
  return content.split(start)[1]?.split(end)[0]?.trim();
}

function promptParts(project: DramaProject, prompt: string) {
  const request = buildDeepSeekRequest({
    project,
    prompt,
    promptCards: [],
    model: "deepseek-test"
  });
  return {
    request,
    system: request.messages[0].content,
    user: request.messages[1].content
  };
}

describe("DeepSeek prompt contract", () => {
  it("snapshots the direct-chat prompt policy", () => {
    const { request, system, user } = promptParts(
      { ...sampleProject, messages: [] },
      "让阿泽发现相亲对象就是小学同学"
    );

    expect({
      model: request.model,
      temperature: request.temperature,
      roles: request.messages.map((message) => message.role),
      lead: system.split("\n")[0],
      mode: lineContaining(system, "私聊或多会话故事"),
      sessions: lineContaining(system, "这是微信多会话故事"),
      delta: lineContaining(system, "只输出 GeneratedStoryDelta"),
      prompt: user.split("\n")[0]
    }).toMatchInlineSnapshot(`
      {
        "delta": "只输出 GeneratedStoryDelta，绝对不要输出完整 DramaProject，不要复制历史 messages、旧 assets 或未变化的拓扑。",
        "lead": "你是爆款聊天记录短剧编剧，擅长写高密度微信聊天短剧。输出必须是严格 JSON，不要 markdown。",
        "mode": "当前故事是私聊或多会话故事：以 chatSessions.kind 为准，每个 direct 会话的 title 使用对应联系人的名字。",
        "model": "deepseek-test",
        "prompt": "当前新 Prompt：让阿泽发现相亲对象就是小学同学",
        "roles": [
          "system",
          "user",
        ],
        "sessions": "这是微信多会话故事。根据剧情可以只推进原会话，也可以自然新建私聊或群聊；整个项目保持 1-4 个 chatSessions，不要为了凑数建群。",
        "temperature": 0.86,
      }
    `);
  });

  it("snapshots named multi-session topology and interleaved history", () => {
    const lawyer = {
      ...sampleProject.characters[1],
      id: "lawyer",
      name: "周律师",
      avatarInitial: "周"
    };
    const project: DramaProject = {
      ...sampleProject,
      characters: [...sampleProject.characters, lawyer],
      chatSessions: [
        { id: "chat-main", title: "林夏", participantIds: ["boy", "girl"] },
        { id: "chat-lawyer", title: "周律师", participantIds: ["boy", "lawyer"] }
      ],
      messages: [
        { ...sampleProject.messages[0], id: "multi-1", sessionId: "chat-main" },
        {
          ...sampleProject.messages[1],
          id: "multi-2",
          roleId: "lawyer",
          sessionId: "chat-lawyer",
          text: "合同第七条有隐藏违约金"
        }
      ]
    };
    const { system, user } = promptParts(project, "让两个会话交错查清合同真相");

    expect({
      topologyRule: lineContaining(system, "每个会话必须创建一名不同的左侧联系人"),
      catalog: section(user, "当前聊天会话：\n", "\n\n此前 Prompt 卡片（")?.split("\n"),
      history: section(user, "最近对话（每会话最多 12 条，全局最多 40 条，已折叠 0 条）：\n", "\n\n上面的有界历史按全局发生顺序排列")?.split("\n")
    }).toMatchInlineSnapshot(`
      {
        "catalog": [
          "1. 林夏 (sessionId=chat-main, kind=direct)：阿泽(senderId=boy)、林夏(senderId=girl)",
          "2. 周律师 (sessionId=chat-lawyer, kind=direct)：阿泽(senderId=boy)、周律师(senderId=lawyer)",
        ],
        "history": [
          "1. [会话:林夏/chat-main] 阿泽(senderId=boy)/text: 张阿姨把你推给我了",
          "2. [会话:周律师/chat-lawyer] 周律师(senderId=lawyer)/text: 合同第七条有隐藏违约金",
        ],
        "topologyRule": "chatSessions 每项必须有 id、title、kind(direct|group)、participantIds；输出多个 direct 会话时，每个会话必须创建一名不同的左侧联系人角色，不能让两个会话复用同一个 roleId；group 会话保留所有参与者。所有会话都包含同一名右侧玩家，characters 总数不得超过 6。",
      }
    `);
  });

  it("snapshots the group-chat prompt policy", () => {
    const groupProject: DramaProject = {
      ...sampleProject,
      title: "合同调查群",
      chatMode: "group",
      characters: [
        ...sampleProject.characters,
        { ...sampleProject.characters[1], id: "lawyer", name: "周律师", avatarInitial: "周" }
      ],
      chatSessions: [{
        id: "chat-main",
        title: "合同调查群",
        participantIds: ["boy", "girl", "lawyer"]
      }],
      messages: []
    };
    const { system, user } = promptParts(groupProject, "三个人在群里核对合同和付款记录");

    expect({
      lead: system.split("\n")[0],
      mode: lineContaining(system, "当前故事是多人群聊"),
      sessions: lineContaining(system, "只有一个群聊会话"),
      titleRule: lineContaining(system, "群名写入 topologyChanges.title"),
      delta: lineContaining(system, "只输出 GeneratedStoryDelta"),
      prompt: user.split("\n")[0]
    }).toMatchInlineSnapshot(`
      {
        "delta": "只输出 GeneratedStoryDelta，绝对不要输出完整 DramaProject，不要复制历史 messages、旧 assets 或未变化的拓扑。",
        "lead": "你是爆款聊天记录短剧编剧，擅长写高密度微信聊天短剧。输出必须是严格 JSON，不要 markdown。",
        "mode": "当前故事是多人群聊：chatMode 必须是 group；title 必须像真实群名，使用 3-18 个字符，不能填某个成员的人名，也不能写成“某某和某某的聊天”。",
        "prompt": "当前新 Prompt：三个人在群里核对合同和付款记录",
        "sessions": "这个项目只有一个群聊会话：禁止新建其他会话，禁止将群成员拆成私聊。",
        "titleRule": "从当前 Prompt 提取所有具名群成员，characters 中必须完整列出；群名写入 topologyChanges.title，不要把任一成员姓名直接当作 title。",
      }
    `);
  });

  it("snapshots the Jojo workplace-chat prompt policy", () => {
    const { system, user } = promptParts(jojoProject, "老板突然要求下午四点前重做周报");

    expect({
      lead: system.split("\n")[0],
      side: lineContaining(system, "钉钉手机版群聊风格"),
      title: lineContaining(system, "title 是群聊名称"),
      sessions: lineContaining(system, "只有一个群聊会话"),
      style: lineContaining(system, "当前 stylePreset 固定为 jojo-company-chat"),
      delta: lineContaining(system, "只输出 GeneratedStoryDelta"),
      prompt: user.split("\n")[0]
    }).toMatchInlineSnapshot(`
      {
        "delta": "只输出 GeneratedStoryDelta，绝对不要输出完整 DramaProject，不要复制历史 messages、旧 assets 或未变化的拓扑。",
        "lead": "你是叫叫公司日常群聊编剧，输出必须是严格 JSON，不要 markdown。",
        "prompt": "当前新 Prompt：老板突然要求下午四点前重做周报",
        "sessions": "这个项目只有一个群聊会话：禁止新建其他会话，禁止将群成员拆成私聊。",
        "side": "这是钉钉手机版群聊风格：玩家扮演叫叫，界面会把叫叫渲染成右侧蓝色气泡；喵阿布、铃铛、猪小弟、系统在左侧白色气泡。",
        "style": "当前 stylePreset 固定为 jojo-company-chat，不要在增量里重复 stylePreset、fps、canvas、sfx 或 audioMix。",
        "title": "title 是群聊名称，要像同事背后蛐蛐用的小群名，4-10 个中文字，轻松、机灵、有梗，不要正式公司群名。示例：工位蛐蛐小队、早会避难所、需求受害者联盟、周报幸存者。",
      }
    `);
  });
});

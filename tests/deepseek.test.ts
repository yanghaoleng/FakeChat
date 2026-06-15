import { describe, expect, it } from "vitest";
import { normalizeDeepSeekProject } from "../src/shared/deepseekProject";

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
});

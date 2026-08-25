import { describe, expect, it } from "vitest";
import {
  nextSupportPraiseIndex,
  segmentSupportPraise,
  supportAuthorCopy,
  supportAuthorPraiseCount
} from "../src/features/settings/supportAuthorCopy";

describe("support author praise copy", () => {
  it("keeps the twelve selected simplified Chinese messages", () => {
    expect(supportAuthorCopy["zh-CN"].praises).toEqual([
      "谢谢你把喜欢变成鼓励。你的一点点支持，真的会让我开心很久！💛",
      "能为你带来一点快乐，我已经很满足；还能收到你的支持，就更幸运了！✨",
      "会支持独立作品的人，眼光和心意都很棒。谢谢你发现了这里！🌟",
      "懂得给创作者一点鼓励的人，真的又温柔又酷。谢谢你！😎",
      "会为好玩的小工具鼓掌的人，品味和人品都很在线。祝你今天诸事顺利！🎉",
      "能点开这个小窗口的人，一般都很有眼光。谢谢你让我的好心情直接续杯！☕",
      "你不只会发现有趣的东西，还愿意给它一点鼓励——这件事本身就很可爱！🥰",
      "谢谢你给这个聊天小宇宙续航。愿你发出的每条消息，都能等到想要的回应！💬",
      "你的支持比咖啡更提神。谢谢你让我有动力继续写梗、修细节、加新玩法！☕",
      "谢谢这位有品位的体验官。愿你聊天有梗、工作不卷、每天都有小惊喜！🎁",
      "愿意支持这个小世界的人，自带主角光环。谢谢你让下一段故事更快发生！🎬",
      "谢谢你陪这个小工具继续长大。愿你灵感在线、需求少改、下班准点！🚀"
    ]);
  });

  it("keeps every locale aligned to the same random pool", () => {
    expect(supportAuthorPraiseCount).toBe(12);
    expect(Object.values(supportAuthorCopy).every((copy) => copy.praises.length === supportAuthorPraiseCount)).toBe(true);
  });

  it("chooses any first message but never immediately repeats an existing one", () => {
    expect(nextSupportPraiseIndex(-1, 0)).toBe(0);
    expect(nextSupportPraiseIndex(-1, 0.999)).toBe(11);
    expect(nextSupportPraiseIndex(4, 0)).toBe(5);
    expect(nextSupportPraiseIndex(4, 0.999)).toBe(3);
  });

  it("keeps Chinese punctuation and emoji with the previous animated word", () => {
    const segments = segmentSupportPraise("眼光很好。谢谢你！🌟", "zh-CN");
    expect(segments).toContain("很好。");
    expect(segments.at(-1)).toMatch(/！🌟$/u);
    expect(segments.some((segment) => /^[。！🌟]/u.test(segment))).toBe(false);
  });
});

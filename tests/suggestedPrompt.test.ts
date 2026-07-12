import { describe, expect, it } from "vitest";
import { normalizeSuggestedPrompt } from "../src/shared/suggestedPrompt";

describe("下一步提示词精简", () => {
  it("去掉续写前缀和地域口音尾巴", () => {
    expect(normalizeSuggestedPrompt("接着写女生发来后台截图，男生发现她早就知情。 地域：故事发生在武汉，可带方言。"))
      .toBe("女生发来后台截图，男生发现她早就知情。");
  });

  it("去掉中文句号后无空格的地域尾巴", () => {
    expect(normalizeSuggestedPrompt("女生发来后台截图，男生发现她早就知情。地域设定：武汉口吻。"))
      .toBe("女生发来后台截图，男生发现她早就知情。");
  });

  it("去掉英文续写指令", () => {
    expect(normalizeSuggestedPrompt("Continue in English: Mia asks why Noah knows the sentence."))
      .toBe("Mia asks why Noah knows the sentence.");
  });

  it("去掉单独的语言标记", () => {
    expect(normalizeSuggestedPrompt("Language: English. Sophie sends the changed location sheet."))
      .toBe("Sophie sends the changed location sheet.");
  });

  it("连续去掉语言标记和续写前缀", () => {
    expect(normalizeSuggestedPrompt("Language: English. Continue in English: Sophie sends the changed location sheet."))
      .toBe("Sophie sends the changed location sheet.");
  });

  it("保留剧情本身需要的口音信息", () => {
    expect(normalizeSuggestedPrompt("男生听出她在模仿成都口音，开始怀疑她的真实身份。"))
      .toBe("男生听出她在模仿成都口音，开始怀疑她的真实身份。");
  });

  it("不误删剧情中的继续动作", () => {
    expect(normalizeSuggestedPrompt("继续嘴硬的女生发来截图，男生发现她早就知情。"))
      .toBe("继续嘴硬的女生发来截图，男生发现她早就知情。");
    expect(normalizeSuggestedPrompt("继续写作的女生发来旧稿，两人发现匿名作者是同一个人。"))
      .toBe("继续写作的女生发来旧稿，两人发现匿名作者是同一个人。");
  });

  it("纯续写或语言元指令会被清空", () => {
    expect(normalizeSuggestedPrompt("接着写")).toBe("");
    expect(normalizeSuggestedPrompt("Accent setting: British English")).toBe("");
  });
});

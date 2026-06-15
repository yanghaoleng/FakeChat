import type { MemeAsset } from "../src/shared/schema";

const qfaceIndexUrl = "https://koishi.js.org/QFace/assets/qq_emoji/_index.json";
const qfaceAssetRoot = "https://koishi.js.org/QFace/";

interface QFaceItem {
  emojiId: string;
  describe?: string;
  associateWords?: string[];
  assets?: Array<{ type: number; path: string }>;
}

const genericTags = ["尴尬", "无语", "震惊", "破防", "拳头", "狗头", "阴阳怪气", "委屈", "捂脸"];

function sourceCard(query: string, id: string, title: string, sourceName: string, sourceUrl: string, licenseNote: string): MemeAsset {
  return {
    id: `${id}-${encodeURIComponent(query)}`,
    kind: "meme",
    title,
    sourceName,
    sourceUrl,
    licenseNote,
    tags: [query, ...genericTags.filter((tag) => tag.includes(query) || query.includes(tag))],
    riskLevel: "unknown_or_restricted"
  };
}

async function qfaceCandidates(query: string): Promise<MemeAsset[]> {
  const response = await fetch(qfaceIndexUrl, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) return [];
  const items = (await response.json()) as QFaceItem[];
  const normalized = query.trim();

  return items
    .filter((item) => {
      const text = `${item.describe ?? ""} ${(item.associateWords ?? []).join(" ")}`;
      return text.includes(normalized) || genericTags.some((tag) => normalized.includes(tag) && text.includes(tag));
    })
    .slice(0, 8)
    .map((item) => {
      const png = item.assets?.find((asset) => asset.path.includes("/png/")) ?? item.assets?.[0];
      return {
        id: `qface-${item.emojiId}`,
        kind: "meme",
        title: item.describe?.replace("/", "") || `QFace ${item.emojiId}`,
        sourceName: "QFace",
        sourceUrl: "https://github.com/koishijs/QFace",
        licenseNote: "腾讯官方表情资源，仅供学习交流，请勿直接商用。",
        remoteUrl: png ? `${qfaceAssetRoot}${png.path}` : undefined,
        tags: [normalized, item.describe?.replace("/", "") || ""].filter(Boolean),
        riskLevel: "restricted"
      } satisfies MemeAsset;
    });
}

export async function searchMemes(query: string): Promise<MemeAsset[]> {
  const trimmed = query.trim() || "破防";
  const externalCards: MemeAsset[] = [
    sourceCard(trimmed, "chinesebqb", `ChineseBQB 搜索：${trimmed}`, "ChineseBQB", `https://github.com/zhaoolee/ChineseBQB/search?q=${encodeURIComponent(trimmed)}`, "仓库未声明明确 license，适合做候选检索和灵感来源，发布前请人工确认。"),
    sourceCard(trimmed, "soogif", `SOOGIF 搜索：${trimmed}`, "SOOGIF", `https://www.soogif.com/search/${encodeURIComponent(trimmed)}`, "公开 GIF 站点，授权取决于素材来源，发布前请人工确认。"),
    sourceCard(trimmed, "sorrypy", "sorrypy 经典梗图生成器", "sorrypy", "https://github.com/East196/sorrypy", "代码为 Apache-2.0；模板视频/梗图素材需按具体来源确认。")
  ];

  try {
    return [...(await qfaceCandidates(trimmed)), ...externalCards];
  } catch {
    return externalCards;
  }
}

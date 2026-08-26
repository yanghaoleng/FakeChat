import type { ServerResponse } from "node:http";
import { defaultFishVoice, fishVoiceCatalog, type FishVoiceGender, type FishVoicePreset } from "../src/shared/fishVoiceLibrary.js";
import { readJsonBody, sendJson, type JsonRequest } from "./_http.js";

const fishTtsEndpoint = "https://api.fish.audio/v1/tts";
const fishAudioModel = "s2.1-pro-free";
const fishUpstreamTimeoutMs = 5000;
const maxVoiceAttempts = 4;

type FishVoiceHint = {
  characterId?: unknown;
  name?: unknown;
  side?: unknown;
  avatarGender?: unknown;
  voicePreset?: unknown;
  voiceDescription?: unknown;
  tags?: unknown;
};

const fallbackMaleVoice = defaultFishVoice;
const fallbackFemaleVoice = fishVoiceCatalog.find((voice) => voice.id === "ad-senpai") ?? fallbackMaleVoice;

function textFromBody(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const text = (body as { text?: unknown }).text;
  return typeof text === "string" ? text.trim() : "";
}

function apiKeyFromBody(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const apiKey = (body as { apiKey?: unknown }).apiKey;
  return typeof apiKey === "string" ? apiKey.trim() : "";
}

function voiceHintFromBody(body: unknown): FishVoiceHint {
  if (!body || typeof body !== "object") return {};
  const voice = (body as { voice?: unknown }).voice;
  return voice && typeof voice === "object" ? voice as FishVoiceHint : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArrayValue(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const text = stringValue(item);
    return text ? [text] : [];
  });
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function corpusForVoice(voice: FishVoiceHint) {
  return [
    voice.characterId,
    voice.name,
    voice.side,
    voice.avatarGender,
    voice.voicePreset,
    voice.voiceDescription,
    ...stringArrayValue(voice.tags)
  ].map(stringValue).join(" ");
}

function genderForVoice(voice: FishVoiceHint): FishVoiceGender {
  const avatarGender = stringValue(voice.avatarGender);
  const voicePreset = stringValue(voice.voicePreset);
  const descriptiveCorpus = [
    voice.name,
    voice.side,
    voice.avatarGender,
    voice.voicePreset,
    voice.voiceDescription,
    ...stringArrayValue(voice.tags)
  ].map(stringValue).join(" ");

  if (avatarGender === "girl" || voicePreset === "young_real_female") return "female";
  if (avatarGender === "boy" || voicePreset === "young_male") return "male";
  if (/female|woman|女生|女声|女性|女孩|少女|萝莉|御姐|女友|妈妈|姐姐|高知|温柔|清亮|气声/.test(descriptiveCorpus)) return "female";
  if (/male|man|男生|男声|男性|男孩|青年|少年|大叔|叔叔|老年男|低沉|憨厚|热血/.test(descriptiveCorpus)) return "male";
  return stringValue(voice.side) === "right" ? "male" : "female";
}

const tagAliases: Record<string, string[]> = {
  峰哥: ["峰哥", "解答世间万物", "恰恰相反", "得到现场看看"],
  唐僧: ["唐僧", "唐玄奘", "唐三藏", "玄奘", "师父", "御弟"],
  孙悟空: ["孙悟空", "悟空", "猴哥", "齐天大圣", "大师兄"],
  猪八戒: ["猪八戒", "八戒", "猪悟能", "二师兄"],
  沙僧: ["沙僧", "沙和尚", "沙悟净", "老沙"],
  罗永浩: ["罗永浩", "老罗", "十字路口", "锤子"],
  刘强东: ["刘强东", "东哥", "京东", "兄弟", "董事长"],
  御姐: ["御姐", "姐姐", "成熟姐姐", "强势女性", "女王", "知性", "高知"],
  萝莉: ["萝莉", "软萌", "可爱", "少女", "甜", "撒娇", "二次元", "小女孩"],
  少年感: ["少年", "少年感", "男孩", "年轻男", "清澈", "干净"],
  大叔感: ["大叔", "叔叔", "中年男", "成熟男", "稳重男"],
  反派: ["反派", "恶魔", "阴沉", "压迫", "恐怖", "邪恶"],
  旁白: ["旁白", "叙事", "解说", "电影感", "故事感"],
  商务: ["商务", "商业", "企业", "管理", "职场", "专业"],
  播音: ["播音", "主播", "新闻", "正式", "播报"],
  游戏: ["游戏", "热血", "攻击性", "高能", "吐槽", "激动"],
  温柔: ["温柔", "柔和", "温暖", "亲切", "治愈", "共情"],
  冷淡: ["冷淡", "冷静", "克制", "疏离", "酷", "沉静"],
  长辈: ["长辈", "妈妈", "老人", "老年", "家常", "生活感"]
};

function voiceScore(profile: FishVoicePreset, voice: FishVoiceHint) {
  const rawCorpus = corpusForVoice(voice);
  const corpus = rawCorpus.toLowerCase();
  const roleName = stringValue(voice.name);
  const gender = genderForVoice(voice);
  let score = profile.gender === gender ? 20 : profile.gender === "neutral" ? 6 : -25;

  if (roleName && (profile.label === roleName || profile.tags.includes(roleName))) score += 100;

  if (profile.age === "young" && /年轻|青年|少年|少女|20|18|大学|校园|萝莉|女友/.test(rawCorpus)) score += 5;
  if (profile.age === "middle" && /成熟|中年|成年|稳|专业|商务|职场|领导|老师/.test(rawCorpus)) score += 5;
  if (profile.age === "elder" && /老年|年长|长辈|老人|妈妈|大叔|历史|旧/.test(rawCorpus)) score += 5;

  const searchable = [
    profile.label,
    profile.archetype,
    profile.gender,
    profile.age,
    ...profile.tags
  ];

  for (const tag of searchable) {
    const normalizedTag = tag.toLowerCase();
    if (normalizedTag && corpus.includes(normalizedTag)) score += 10;
    const aliases = tagAliases[tag] ?? [];
    for (const alias of aliases) {
      if (corpus.includes(alias.toLowerCase())) score += 8;
    }
  }

  for (const [tag, aliases] of Object.entries(tagAliases)) {
    if (!profile.tags.includes(tag) && !profile.archetype.includes(tag)) continue;
    for (const alias of aliases) {
      if (corpus.includes(alias.toLowerCase())) score += 5;
    }
  }

  return score;
}

function selectVoiceProfiles(voice: FishVoiceHint) {
  const gender = genderForVoice(voice);
  const fallback = gender === "female" ? fallbackFemaleVoice : fallbackMaleVoice;
  const seed = `${stringValue(voice.characterId)}:${stringValue(voice.name)}:${stringValue(voice.voiceDescription)}`;
  const ranked = fishVoiceCatalog
    .filter((profile) => profile.gender === gender || profile.gender === "neutral")
    .map((profile) => ({ profile, score: voiceScore(profile, voice), tieBreaker: stableHash(`${seed}:${profile.id}`) }))
    .sort((left, right) => right.score - left.score || left.tieBreaker - right.tieBreaker)
    .map(({ profile }) => profile);

  return [...ranked.slice(0, maxVoiceAttempts - 2), fallback, fallbackMaleVoice]
    .filter((profile, index, profiles) => profiles.findIndex((candidate) => candidate.id === profile.id) === index)
    .slice(0, maxVoiceAttempts);
}

async function callFishTts(apiKey: string, text: string, voiceProfile: FishVoicePreset) {
  return fetch(fishTtsEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      model: fishAudioModel
    },
    body: JSON.stringify({
      text,
      format: "mp3",
      reference_id: voiceProfile.referenceId
    }),
    signal: AbortSignal.timeout(fishUpstreamTimeoutMs)
  });
}

export default async function handler(request: JsonRequest, response: ServerResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { error: "Method Not Allowed" });
  }

  const body = await readJsonBody(request);
  const text = textFromBody(body);
  if (!text) {
    return sendJson(response, 400, { error: "TTS text is required" });
  }

  const apiKey = apiKeyFromBody(body) || process.env.FISH_AUDIO_API_KEY?.trim();
  if (!apiKey) {
    return sendJson(response, 500, { error: "Fish Audio API key is not configured" });
  }

  const voiceHint = voiceHintFromBody(body);
  const voiceProfiles = selectVoiceProfiles(voiceHint);

  try {
    let fishResponse: Response | undefined;
    let resolvedVoice = voiceProfiles[0] ?? fallbackMaleVoice;
    for (const candidate of voiceProfiles) {
      resolvedVoice = candidate;
      try {
        fishResponse = await callFishTts(apiKey, text, candidate);
      } catch (error) {
        if (candidate.id === fallbackMaleVoice.id) throw error;
        continue;
      }
      if (fishResponse.ok) break;
      const detail = await fishResponse.clone().text().catch(() => "");
      if (!/Reference not found|invalid reference|not exist|timeout/i.test(detail) && candidate.id === fallbackMaleVoice.id) break;
    }

    if (!fishResponse) {
      return sendJson(response, 502, { error: "Fish Audio returned no response" });
    }

    if (!fishResponse.ok) {
      const detail = await fishResponse.text().catch(() => "");
      return sendJson(response, fishResponse.status, { error: `Fish Audio returned ${fishResponse.status}`, detail: detail.slice(0, 300) });
    }

    response.setHeader("Content-Type", fishResponse.headers.get("content-type") || "audio/mpeg");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Fish-Model", fishAudioModel);
    response.setHeader("X-Fish-Voice", resolvedVoice.id);
    response.setHeader("X-Fish-Voice-Label", encodeURIComponent(resolvedVoice.label));
    response.statusCode = 200;
    return response.end(Buffer.from(await fishResponse.arrayBuffer()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fish Audio request failed";
    return sendJson(response, 502, { error: message });
  }
}

export const appLanguages = ["zh-CN", "zh-TW", "en", "ja"] as const;

export type AppLanguage = typeof appLanguages[number];
export type LanguagePreference = "auto" | AppLanguage;

export const languagePreferenceStorageKey = "ququ-language-preference-v1";

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return appLanguages.includes(value as AppLanguage);
}

export function isLanguagePreference(value: string | null | undefined): value is LanguagePreference {
  return value === "auto" || isAppLanguage(value);
}

export function detectBrowserLanguage(languages?: readonly string[]): AppLanguage {
  const candidates = languages?.length
    ? languages
    : typeof navigator !== "undefined"
      ? navigator.languages
      : [];

  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();
    if (normalized.startsWith("ja")) return "ja";
    if (normalized.startsWith("en")) return "en";
    if (normalized === "zh-tw" || normalized === "zh-hk" || normalized === "zh-mo" || normalized.includes("hant")) return "zh-TW";
    if (normalized.startsWith("zh")) return "zh-CN";
  }
  return "zh-CN";
}

export function readLanguagePreference(): LanguagePreference {
  if (typeof window === "undefined") return "auto";
  const stored = window.localStorage.getItem(languagePreferenceStorageKey);
  return isLanguagePreference(stored) ? stored : "auto";
}

export function resolveLanguage(preference: LanguagePreference): AppLanguage {
  return preference === "auto" ? detectBrowserLanguage() : preference;
}

export const languageLabels: Record<AppLanguage, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
  ja: "日本語"
};

export type AppCopy = {
  brandName: string;
  siteTitle: string;
  siteDescription: string;
  settings: string;
  settingsHint: string;
  closeSettings: string;
  basicSettings: string;
  language: string;
  selectLanguage: string;
  followBrowser: string;
  role: string;
  gender: string;
  selectRole: string;
  selectGender: string;
  lab: string;
  switchWechat: string;
  switchDingTalk: string;
  aboutSite: string;
  supportAuthor: string;
  saveArchive: string;
  loadArchive: string;
  aboutSubtitle: string;
  aboutLead: string;
  aboutEmotional: string;
  aboutCreative: string;
  aboutPrivacy: string;
  aboutDisclaimer: string;
  backToSettings: string;
  composerTitle: string;
  collapseComposer: string;
  expandComposer: string;
  composerPlaceholder: string;
  startWriting: string;
  addToQueue: string;
  storyCards: string;
  readyToGenerate: string;
  restart: string;
  suggestedPrompt: string;
  close: string;
  adopt: string;
  openSettings: string;
  initialStatus: string;
  waitForStory: string;
  cardCount: (count: number) => string;
};

export const appCopy: Record<AppLanguage, AppCopy> = {
  "zh-CN": {
    brandName: "蛐蛐模拟器",
    siteTitle: "蛐蛐模拟器｜AI 情感陪伴与聊天对话模拟器",
    siteDescription: "蛐蛐模拟器是一款 AI 情感陪伴与聊天对话模拟工具，可创作微信、钉钉风格的模拟聊天、关系故事和沉浸式对话短剧。",
    settings: "设置",
    settingsHint: "语言、角色和实验室",
    closeSettings: "关闭设置",
    basicSettings: "基础设置",
    language: "语言",
    selectLanguage: "选择界面和对话语言",
    followBrowser: "跟随浏览器",
    role: "角色",
    gender: "性别",
    selectRole: "选择角色",
    selectGender: "选择性别",
    lab: "实验室",
    switchWechat: "去微信版",
    switchDingTalk: "去钉钉版",
    aboutSite: "关于本站",
    supportAuthor: "支持作者",
    saveArchive: "存档",
    loadArchive: "读档",
    aboutSubtitle: "AI 情感陪伴与模拟对话创作工具",
    aboutLead: "蛐蛐模拟器让你用一句提示词创作自然、连续的模拟聊天。它适合情感陪伴、关系故事、职场群聊和聊天短剧灵感创作。",
    aboutEmotional: "AI 情感陪伴",
    aboutCreative: "模拟对话创作",
    aboutPrivacy: "你的语言偏好、存档和自定义头像保存在当前设备中。",
    aboutDisclaimer: "本站生成内容仅用于娱乐与创作，不代表真实人物、平台或专业建议。",
    backToSettings: "返回设置",
    composerTitle: "编故事",
    collapseComposer: "收起编故事",
    expandComposer: "展开编故事",
    composerPlaceholder: "输入下一段要推进的剧情。它会结合此前故事卡和现有对话继续往后写。",
    startWriting: "开始编",
    addToQueue: "加入队列",
    storyCards: "故事卡",
    readyToGenerate: "准备生成",
    restart: "重新开始",
    suggestedPrompt: "建议提示词",
    close: "关闭",
    adopt: "采用",
    openSettings: "打开设置",
    initialStatus: "正在检查 DeepSeek 配置...",
    waitForStory: "等待第一段剧情",
    cardCount: (count) => `${count} 张故事卡`
  },
  "zh-TW": {
    brandName: "蛐蛐模擬器",
    siteTitle: "蛐蛐模擬器｜AI 情感陪伴與聊天對話模擬器",
    siteDescription: "蛐蛐模擬器是一款 AI 情感陪伴與聊天對話模擬工具，可創作微信、釘釘風格的模擬聊天、關係故事與沉浸式對話短劇。",
    settings: "設定",
    settingsHint: "語言、角色與實驗室",
    closeSettings: "關閉設定",
    basicSettings: "基本設定",
    language: "語言",
    selectLanguage: "選擇介面與對話語言",
    followBrowser: "跟隨瀏覽器",
    role: "角色",
    gender: "性別",
    selectRole: "選擇角色",
    selectGender: "選擇性別",
    lab: "實驗室",
    switchWechat: "前往微信版",
    switchDingTalk: "前往釘釘版",
    aboutSite: "關於本站",
    supportAuthor: "支持作者",
    saveArchive: "儲存存檔",
    loadArchive: "讀取存檔",
    aboutSubtitle: "AI 情感陪伴與模擬對話創作工具",
    aboutLead: "蛐蛐模擬器讓你用一句提示詞創作自然、連續的模擬聊天，適合情感陪伴、關係故事、職場群聊與聊天短劇靈感創作。",
    aboutEmotional: "AI 情感陪伴",
    aboutCreative: "模擬對話創作",
    aboutPrivacy: "你的語言偏好、存檔與自訂頭像會保存在目前裝置中。",
    aboutDisclaimer: "本站生成內容僅供娛樂與創作，不代表真實人物、平台或專業建議。",
    backToSettings: "返回設定",
    composerTitle: "編故事",
    collapseComposer: "收合編故事",
    expandComposer: "展開編故事",
    composerPlaceholder: "輸入下一段想推進的劇情；系統會結合先前故事卡與現有對話繼續創作。",
    startWriting: "開始編",
    addToQueue: "加入佇列",
    storyCards: "故事卡",
    readyToGenerate: "準備生成",
    restart: "重新開始",
    suggestedPrompt: "建議提示詞",
    close: "關閉",
    adopt: "採用",
    openSettings: "開啟設定",
    initialStatus: "正在檢查 DeepSeek 設定...",
    waitForStory: "等待第一段劇情",
    cardCount: (count) => `${count} 張故事卡`
  },
  en: {
    brandName: "QuQu Chat Simulator",
    siteTitle: "QuQu Chat Simulator | AI Companion & Simulated Conversations",
    siteDescription: "Create AI companion chats, relationship stories, workplace group conversations, and immersive chat dramas in WeChat- and DingTalk-inspired interfaces.",
    settings: "Settings",
    settingsHint: "Language, role, and lab",
    closeSettings: "Close settings",
    basicSettings: "Basic settings",
    language: "Language",
    selectLanguage: "Choose interface and dialogue language",
    followBrowser: "Follow browser",
    role: "Role",
    gender: "Gender",
    selectRole: "Choose role",
    selectGender: "Choose gender",
    lab: "Lab",
    switchWechat: "Open WeChat version",
    switchDingTalk: "Open DingTalk version",
    aboutSite: "About this site",
    supportAuthor: "Support the creator",
    saveArchive: "Save archive",
    loadArchive: "Load archive",
    aboutSubtitle: "AI companionship and simulated chat creation",
    aboutLead: "QuQu turns one prompt into a natural, continuous simulated chat. Use it for AI companionship, relationship stories, workplace banter, and chat-drama ideas.",
    aboutEmotional: "AI companionship",
    aboutCreative: "Simulated chat creation",
    aboutPrivacy: "Your language preference, archives, and custom avatars stay on this device.",
    aboutDisclaimer: "Generated content is for entertainment and creative use, and does not represent real people, platforms, or professional advice.",
    backToSettings: "Back to settings",
    composerTitle: "Create a story",
    collapseComposer: "Collapse story editor",
    expandComposer: "Expand story editor",
    composerPlaceholder: "Describe what should happen next. The AI will continue from your story cards and current conversation.",
    startWriting: "Create",
    addToQueue: "Add to queue",
    storyCards: "Story cards",
    readyToGenerate: "Ready to create",
    restart: "Start over",
    suggestedPrompt: "Suggested prompt",
    close: "Close",
    adopt: "Use it",
    openSettings: "Open settings",
    initialStatus: "Checking DeepSeek configuration...",
    waitForStory: "Waiting for the first story",
    cardCount: (count) => `${count} story card${count === 1 ? "" : "s"}`
  },
  ja: {
    brandName: "QuQu チャットシミュレーター",
    siteTitle: "QuQu チャットシミュレーター｜AI心のパートナー・会話作成",
    siteDescription: "AIとの心の交流、恋愛ストーリー、職場グループチャット、没入型チャットドラマを作れる会話シミュレーターです。",
    settings: "設定",
    settingsHint: "言語・役割・ラボ",
    closeSettings: "設定を閉じる",
    basicSettings: "基本設定",
    language: "言語",
    selectLanguage: "表示と会話の言語を選択",
    followBrowser: "ブラウザに合わせる",
    role: "役割",
    gender: "性別",
    selectRole: "役割を選択",
    selectGender: "性別を選択",
    lab: "ラボ",
    switchWechat: "WeChat版へ",
    switchDingTalk: "DingTalk版へ",
    aboutSite: "このサイトについて",
    supportAuthor: "作者を応援",
    saveArchive: "保存",
    loadArchive: "読み込み",
    aboutSubtitle: "AIとの心の交流・模擬チャット作成ツール",
    aboutLead: "QuQuは一つのプロンプトから自然で連続した模擬チャットを作ります。AIとの心の交流、関係性ストーリー、職場トーク、チャットドラマの創作に使えます。",
    aboutEmotional: "AIとの心の交流",
    aboutCreative: "模擬チャット作成",
    aboutPrivacy: "言語設定、アーカイブ、カスタム画像はこの端末に保存されます。",
    aboutDisclaimer: "生成内容は娯楽・創作用であり、実在の人物やサービス、専門的助言を表すものではありません。",
    backToSettings: "設定に戻る",
    composerTitle: "ストーリーを作る",
    collapseComposer: "ストーリー作成を閉じる",
    expandComposer: "ストーリー作成を開く",
    composerPlaceholder: "次に起こる展開を入力してください。これまでのストーリーカードと会話をもとに続きが生成されます。",
    startWriting: "作成する",
    addToQueue: "キューに追加",
    storyCards: "ストーリーカード",
    readyToGenerate: "作成準備完了",
    restart: "最初から",
    suggestedPrompt: "おすすめプロンプト",
    close: "閉じる",
    adopt: "使用する",
    openSettings: "設定を開く",
    initialStatus: "DeepSeekの設定を確認しています...",
    waitForStory: "最初のストーリーを待っています",
    cardCount: (count) => `ストーリーカード ${count}件`
  }
};

export function languageGenerationInstruction(language: AppLanguage) {
  switch (language) {
    case "zh-TW":
      return "所有面向使用者的內容都使用自然繁體中文與臺灣常用字詞，包括訊息、ttsText、transferNote、圖片描述、角色名稱、群組名稱與 suggestedPrompt；不要混入簡體中文。";
    case "en":
      return "Write every user-facing value in concise, natural conversational English, including messages, ttsText, transferNote, image descriptions, character names, chat titles, and suggestedPrompt. Do not insert Chinese or Japanese dialogue.";
    case "ja":
      return "メッセージ、ttsText、transferNote、画像説明、登場人物名、チャット名、suggestedPromptを含む、ユーザー向けの内容はすべて自然な日本語で書くこと。中国語や英語の会話を混ぜないこと。";
    default:
      return "所有面向用户的内容都使用自然简体中文，包括消息、ttsText、transferNote、图片描述、角色名称、群聊名称和 suggestedPrompt；不要混入繁体中文、英文或日文对话。";
  }
}

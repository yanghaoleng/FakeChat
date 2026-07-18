export type FishVoiceGender = "female" | "male" | "neutral";
export type FishVoiceAge = "young" | "middle" | "elder";

export type FishVoicePreset = {
  id: string;
  referenceId: string;
  label: string;
  gender: FishVoiceGender;
  age: FishVoiceAge;
  archetype: string;
  tags: string[];
  sourceUrl: string;
};

export const fishVoiceCatalog: FishVoicePreset[] = [
  {
    id: "ad-senpai",
    referenceId: "7f92f8afb8ec43bf81429cc1c9199cb1",
    label: "AD学姐",
    gender: "female",
    age: "young",
    archetype: "御姐女友感",
    tags: ["御姐", "女友感", "年轻", "舒缓", "深度", "严肃", "权威", "电影感", "知性", "暧昧", "强势"],
    sourceUrl: "https://fish.audio/zh-CN/m/7f92f8afb8ec43bf81429cc1c9199cb1/"
  },
  {
    id: "female-college-student",
    referenceId: "5c353fdb312f4888836a9a5680099ef0",
    label: "女大学生",
    gender: "female",
    age: "young",
    archetype: "明亮校园女生",
    tags: ["女大学生", "年轻", "明亮", "活力", "友好", "日常", "社交媒体", "聊天感", "元气"],
    sourceUrl: "https://fish.audio/zh-CN/app/m/5c353fdb312f4888836a9a5680099ef0/"
  },
  {
    id: "taojin",
    referenceId: "b7f6ea6bf21246de894f6b9b499add43",
    label: "陶衿",
    gender: "female",
    age: "middle",
    archetype: "知性成熟女",
    tags: ["知性", "成熟", "稳", "温和", "叙述", "对话式", "专业", "清晰"],
    sourceUrl: "https://fish.audio/zh-CN/app/m/b7f6ea6bf21246de894f6b9b499add43/"
  },
  {
    id: "older-fast-woman",
    referenceId: "ce22ffa5f03a40d9b06ad8e9ae8dc893",
    label: "老女人快速版",
    gender: "female",
    age: "elder",
    archetype: "强势年长女性",
    tags: ["年长", "快速", "权威", "强势", "刻薄", "压迫感", "专业", "促销", "长辈"],
    sourceUrl: "https://fish.audio/zh-CN/app/m/ce22ffa5f03a40d9b06ad8e9ae8dc893/"
  },
  {
    id: "female-anchor",
    referenceId: "57eab548c7ed4ddc974c4c153cb015b2",
    label: "女主播",
    gender: "female",
    age: "middle",
    archetype: "新闻女主播",
    tags: ["女主播", "新闻", "播音", "正式", "清晰", "专业", "中年", "权威", "稳重"],
    sourceUrl: "https://fish.audio/zh-CN/app/m/57eab548c7ed4ddc974c4c153cb015b2/"
  },
  {
    id: "qiqi",
    referenceId: "270f72e0d2814ec0b7dbd0509ab6e3b6",
    label: "Qiqi",
    gender: "female",
    age: "young",
    archetype: "年轻角色女声",
    tags: ["年轻", "角色声音", "少女", "轻快", "可爱", "二次元", "软萌", "萝莉感"],
    sourceUrl: "https://fish.audio/zh-CN/m/270f72e0d2814ec0b7dbd0509ab6e3b6/"
  },
  {
    id: "deep-women",
    referenceId: "1955dcca5e3d4e7db6e412b92bef5b61",
    label: "Deep women",
    gender: "female",
    age: "middle",
    archetype: "低沉女旁白",
    tags: ["低沉", "中年", "旁白", "成熟", "沉稳", "叙事", "冷静", "深度"],
    sourceUrl: "https://fish.audio/zh-CN/m/1955dcca5e3d4e7db6e412b92bef5b61/"
  },
  {
    id: "middle-female-warm",
    referenceId: "c775abe11cec413e9c3aa5e5e0ea619e",
    label: "中年女声",
    gender: "female",
    age: "middle",
    archetype: "温暖中年女旁白",
    tags: ["中年", "温暖", "温柔", "旁白", "教育", "共情", "平静", "故事", "妈妈感"],
    sourceUrl: "https://fish.audio/zh-CN/m/c775abe11cec413e9c3aa5e5e0ea619e/"
  },
  {
    id: "middle-aged-woman",
    referenceId: "e169eb4dab1645059be82be8cf941a36",
    label: "中年妇女",
    gender: "female",
    age: "elder",
    archetype: "亲切长辈女性",
    tags: ["长辈", "妈妈", "亲切", "温和", "平静", "友好", "教育", "生活感", "家常"],
    sourceUrl: "https://fish.audio/zh-CN/m/e169eb4dab1645059be82be8cf941a36/"
  },
  {
    id: "rem",
    referenceId: "189df5131e70430aa8290fdfb970865b",
    label: "Rem",
    gender: "female",
    age: "young",
    archetype: "软萌动漫少女",
    tags: ["萝莉", "软萌", "动漫", "气声", "顽皮", "甜", "撒娇", "少女", "温柔"],
    sourceUrl: "https://fish.audio/zh-CN/m/189df5131e70430aa8290fdfb970865b/"
  },
  {
    id: "e-girl",
    referenceId: "98655a12fa944e26b274c535e5e03842",
    label: "E-girl",
    gender: "female",
    age: "young",
    archetype: "网感甜美女声",
    tags: ["E-girl", "年轻", "网感", "甜", "亲密", "对话式", "俏皮", "社交媒体", "女友感"],
    sourceUrl: "https://fish.audio/zh-CN/m/98655a12fa944e26b274c535e5e03842/"
  },
  {
    id: "angry-young-woman",
    referenceId: "8b1b457a5c4140eba46c815670909da4",
    label: "Woman",
    gender: "female",
    age: "young",
    archetype: "暴躁攻击型女声",
    tags: ["愤怒", "攻击性", "强势", "严肃", "权威", "对抗", "表达强", "反派", "吵架"],
    sourceUrl: "https://fish.audio/zh-CN/m/8b1b457a5c4140eba46c815670909da4/"
  },
  {
    id: "soft-female",
    referenceId: "f62cf10245be4a97938790857d13d3db",
    label: "Soft",
    gender: "female",
    age: "young",
    archetype: "柔软日常女声",
    tags: ["柔和", "年轻", "温柔", "对话式", "轻声", "内向", "治愈", "日常"],
    sourceUrl: "https://fish.audio/zh-CN/m/f62cf10245be4a97938790857d13d3db/"
  },
  {
    id: "female-commercial",
    referenceId: "1aca4b3cc98e4e3b976e6988ea22c318",
    label: "配音女",
    gender: "female",
    age: "elder",
    archetype: "优雅商业女旁白",
    tags: ["优雅", "广告", "旁白", "旧的", "成熟", "奢侈品", "专业", "温暖", "清晰"],
    sourceUrl: "https://fish.audio/zh-CN/m/1aca4b3cc98e4e3b976e6988ea22c318/"
  },
  {
    id: "dongxuelian",
    referenceId: "eaa47f801d914afe93ea453cc42729f3",
    label: "东雪莲",
    gender: "female",
    age: "young",
    archetype: "高能吐槽女声",
    tags: ["快速", "愤怒", "高能", "吐槽", "富有表现力", "年轻", "角色声音", "犀利"],
    sourceUrl: "https://fish.audio/zh-CN/m/eaa47f801d914afe93ea453cc42729f3/"
  },
  {
    id: "business-female",
    referenceId: "409317828ea340da9c6cb4cbf3ba2547",
    label: "大曼商业001",
    gender: "female",
    age: "middle",
    archetype: "商业教育女声",
    tags: ["商业", "教育", "中年", "专业", "清晰", "广告", "职场", "稳重"],
    sourceUrl: "https://fish.audio/zh-CN/m/409317828ea340da9c6cb4cbf3ba2547/"
  },
  {
    id: "fengge",
    referenceId: "5234f8da2d7342e3a440d000ae45a14e",
    label: "峰哥",
    gender: "male",
    age: "middle",
    archetype: "笃定反转答疑男声",
    tags: ["峰哥", "成熟", "男性", "答疑", "反转", "短句", "生活化", "自嘲", "判断笃定", "解答世间万物"],
    sourceUrl: "https://fish.audio/zh-CN/m/5234f8da2d7342e3a440d000ae45a14e/"
  },
  {
    id: "tang-seng",
    referenceId: "1fc12becc623424984cc598c7db7c8c1",
    label: "唐僧",
    gender: "male",
    age: "middle",
    archetype: "温和克制师父男声",
    tags: ["唐僧", "唐玄奘", "唐三藏", "玄奘", "西游", "师父", "温和", "克制", "说教", "认真", "佛系"],
    sourceUrl: "https://fish.audio/zh-CN/m/1fc12becc623424984cc598c7db7c8c1/"
  },
  {
    id: "sun-wukong",
    referenceId: "22d0f487c3d1497da18ec10e54595fce",
    label: "孙悟空",
    gender: "male",
    age: "middle",
    archetype: "机敏热血猴哥男声",
    tags: ["孙悟空", "悟空", "猴哥", "齐天大圣", "西游", "机敏", "热血", "攻击性", "嘴硬", "护短", "角色声音"],
    sourceUrl: "https://fish.audio/zh-CN/m/22d0f487c3d1497da18ec10e54595fce/"
  },
  {
    id: "zhu-bajie",
    referenceId: "330a1c0f97f941fa8d9feec654cb01cc",
    label: "猪八戒",
    gender: "male",
    age: "middle",
    archetype: "圆润八卦喜剧男声",
    tags: ["猪八戒", "八戒", "猪悟能", "西游", "圆润", "活泼", "喜剧", "八卦", "贪吃", "接话", "角色声音"],
    sourceUrl: "https://fish.audio/zh-CN/m/330a1c0f97f941fa8d9feec654cb01cc/"
  },
  {
    id: "sha-seng",
    referenceId: "f3d7d605a4ca4279b6447b26c5bd98bb",
    label: "沙僧",
    gender: "male",
    age: "middle",
    archetype: "朴实沉稳补证男声",
    tags: ["沙僧", "沙和尚", "沙悟净", "西游", "沉稳", "朴实", "可靠", "证据", "少话", "补充", "角色声音"],
    sourceUrl: "https://fish.audio/ja/m/f3d7d605a4ca4279b6447b26c5bd98bb/"
  },
  {
    id: "luo-yonghao",
    referenceId: "a98bacef2cb1434aafb798dc9d89d342",
    label: "罗永浩",
    gender: "male",
    age: "middle",
    archetype: "犀利脱口秀创业男声",
    tags: ["罗永浩", "老罗", "脱口秀", "创业", "犀利", "吐槽", "商务", "访谈", "辩论", "自嘲", "表达强"],
    sourceUrl: "https://fish.audio/zh-CN/m/a98bacef2cb1434aafb798dc9d89d342/"
  },
  {
    id: "dongge-chairman",
    referenceId: "3c2919e4f8994f3e85c46d86f6acf5cc",
    label: "董事长老板男声",
    gender: "male",
    age: "elder",
    archetype: "东哥式企业老板男声",
    tags: ["刘强东", "Richard Liu", "东哥", "京东", "董事长", "老板", "企业家", "兄弟", "管理", "讲话", "对话式"],
    sourceUrl: "https://fish.audio/zh-CN/m/3c2919e4f8994f3e85c46d86f6acf5cc/"
  },
  {
    id: "wangkun",
    referenceId: "4f201abba2574feeae11e5ebf737859e",
    label: "王琨声音模型10.17t1",
    gender: "male",
    age: "middle",
    archetype: "商务播报男声",
    tags: ["商务", "专业", "广告", "播报", "清晰", "自信", "中年", "商场广播"],
    sourceUrl: "https://fish.audio/zh-CN/app/m/4f201abba2574feeae11e5ebf737859e/"
  },
  {
    id: "zhengxiangzhou",
    referenceId: "ca8fb681ce2040958c15ede5eef86177",
    label: "郑翔洲",
    gender: "male",
    age: "middle",
    archetype: "商业演讲男声",
    tags: ["商业", "演讲", "企业", "自信", "专业", "教育", "管理", "热情"],
    sourceUrl: "https://fish.audio/zh-CN/app/m/ca8fb681ce2040958c15ede5eef86177/"
  },
  {
    id: "jiangjieshi",
    referenceId: "918a8277663d476b95e2c4867da0f6a6",
    label: "蒋介石",
    gender: "male",
    age: "middle",
    archetype: "强权历史男声",
    tags: ["权威", "历史", "正式", "强势", "激昂", "领导", "中年", "压迫感"],
    sourceUrl: "https://fish.audio/zh-CN/app/m/918a8277663d476b95e2c4867da0f6a6/"
  },
  {
    id: "dingzhen",
    referenceId: "54a5170264694bfc8e9ad98df7bd89c3",
    label: "丁真",
    gender: "male",
    age: "young",
    archetype: "真诚自然青年",
    tags: ["年轻", "真诚", "自然", "温和", "平静", "友好", "少年感", "干净"],
    sourceUrl: "https://fish.audio/zh-CN/app/m/54a5170264694bfc8e9ad98df7bd89c3/"
  },
  {
    id: "xiaoming-jianmo",
    referenceId: "a9372068ed0740b48326cf9a74d7496a",
    label: "小明剑魔",
    gender: "male",
    age: "young",
    archetype: "高能游戏男声",
    tags: ["游戏", "快速", "激动", "攻击性", "吐槽", "热血", "年轻", "情绪强"],
    sourceUrl: "https://fish.audio/zh-CN/app/m/a9372068ed0740b48326cf9a74d7496a/"
  },
  {
    id: "angel-dust",
    referenceId: "adb8cf792d014175bfd0934698360cea",
    label: "Angel Dust",
    gender: "male",
    age: "young",
    archetype: "顽皮戏剧男声",
    tags: ["顽皮", "戏剧", "自信", "娱乐", "角色声音", "夸张", "英文", "轻佻"],
    sourceUrl: "https://fish.audio/zh-CN/m/adb8cf792d014175bfd0934698360cea/"
  },
  {
    id: "cold-young-man",
    referenceId: "e1774c82a5b84fc3906fa1cf8a1092a0",
    label: "冷峻少年",
    gender: "male",
    age: "young",
    archetype: "冷淡少年",
    tags: ["冷淡", "低沉", "不羁", "沉静", "少年", "个性", "酷", "疏离"],
    sourceUrl: "https://fish.audio/zh-CN/m/e1774c82a5b84fc3906fa1cf8a1092a0/"
  },
  {
    id: "audio-pro",
    referenceId: "3799f45354924d0c85068ae2c981d3c1",
    label: "audio pro",
    gender: "male",
    age: "middle",
    archetype: "教育科普男声",
    tags: ["教育", "科普", "中年", "旁白", "专业", "清晰", "老师", "讲解"],
    sourceUrl: "https://fish.audio/zh-CN/m/3799f45354924d0c85068ae2c981d3c1/"
  },
  {
    id: "science-expert",
    referenceId: "c7d6cb6432334d039655921d62e63ef8",
    label: "专家科普",
    gender: "male",
    age: "middle",
    archetype: "专家科普男声",
    tags: ["专家", "科普", "教育", "中年", "专业", "权威", "稳", "知识型"],
    sourceUrl: "https://fish.audio/zh-CN/m/c7d6cb6432334d039655921d62e63ef8/"
  },
  {
    id: "guangzhi",
    referenceId: "05a48971bcee4e0a90c3d5e05bbf37b6",
    label: "广志 活力中年男声",
    gender: "male",
    age: "middle",
    archetype: "活力中年男声",
    tags: ["中年", "活力", "角色声音", "对话式", "热情", "生活感", "叔叔感"],
    sourceUrl: "https://fish.audio/zh-CN/m/05a48971bcee4e0a90c3d5e05bbf37b6/"
  },
  {
    id: "magnetic-narrator",
    referenceId: "bf6c7c9641df4c5fa7cbafd6aa2e7d99",
    label: "磁性旁白男声",
    gender: "male",
    age: "young",
    archetype: "磁性电影旁白",
    tags: ["磁性", "旁白", "电影感", "深度", "叙事", "清晰", "年轻", "故事感"],
    sourceUrl: "https://fish.audio/zh-CN/m/bf6c7c9641df4c5fa7cbafd6aa2e7d99/"
  },
  {
    id: "demon",
    referenceId: "e225bbe5f57e4498bea0b99cc83b7e82",
    label: "demon",
    gender: "male",
    age: "elder",
    archetype: "反派恶魔男声",
    tags: ["反派", "恶魔", "旧的", "角色声音", "低沉", "压迫感", "恐怖", "神秘"],
    sourceUrl: "https://fish.audio/zh-CN/m/e225bbe5f57e4498bea0b99cc83b7e82/"
  },
  {
    id: "old-man",
    referenceId: "f4f7128c2ef340c4a853fcd3df1d0fd6",
    label: "老年人",
    gender: "male",
    age: "elder",
    archetype: "老年男性",
    tags: ["老年", "长辈", "娱乐", "慢", "沙哑", "生活感", "老人"],
    sourceUrl: "https://fish.audio/zh-CN/m/f4f7128c2ef340c4a853fcd3df1d0fd6/"
  },
  {
    id: "fanxian",
    referenceId: "d5fb60f5525245b3a3aaa99f923a9233",
    label: "范闲",
    gender: "male",
    age: "middle",
    archetype: "沉稳哲思男声",
    tags: ["成熟", "深沉", "平静", "哲思", "古风", "叙事", "电影感", "稳重"],
    sourceUrl: "https://fish.audio/zh-CN/m/d5fb60f5525245b3a3aaa99f923a9233/"
  },
  {
    id: "film-commentary-man",
    referenceId: "5b8a05184f054c3db7798eab982f97e2",
    label: "影视解说男",
    gender: "male",
    age: "elder",
    archetype: "影视解说男声",
    tags: ["影视解说", "旁白", "旧的", "故事", "悬疑", "娱乐", "叙述"],
    sourceUrl: "https://fish.audio/zh-CN/m/5b8a05184f054c3db7798eab982f97e2/"
  },
  {
    id: "bushan",
    referenceId: "2c39caa99ca042789cc30772242a2b13",
    label: "不山声音克隆",
    gender: "male",
    age: "young",
    archetype: "户外生活男声",
    tags: ["年轻", "生活感", "户外", "自然", "亲切", "接地气", "记录", "分享"],
    sourceUrl: "https://fish.audio/zh-CN/m/2c39caa99ca042789cc30772242a2b13/"
  }
];

export const defaultFishVoice = fishVoiceCatalog.find((voice) => voice.id === "dingzhen") ?? fishVoiceCatalog[0];

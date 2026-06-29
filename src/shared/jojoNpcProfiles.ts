export type JojoNpcProfile = {
  id: string;
  name: string;
  avatarInitial: string;
  avatarUrl: string;
  avatarGradient: string;
  voicePreset: "young_real_female" | "young_male";
  voiceDescription: string;
};

export const jojoNpcProfiles: JojoNpcProfile[] = [
  {
    id: "cat",
    name: "喵阿布",
    avatarInitial: "喵",
    avatarUrl: "/avatars/jojo/npc-cat.svg",
    avatarGradient: "linear-gradient(135deg,#f9a8d4,#38bdf8)",
    voicePreset: "young_real_female",
    voiceDescription: "年轻灵动的小猫同事声线，反应快，语气机灵，像刚入群但已经很会接梗的职场新人"
  },
  {
    id: "rabbit",
    name: "兔小七",
    avatarInitial: "兔",
    avatarUrl: "/avatars/jojo/npc-rabbit.svg",
    avatarGradient: "linear-gradient(135deg,#fbcfe8,#7dd3fc)",
    voicePreset: "young_real_female",
    voiceDescription: "轻快温和的小兔子声线，礼貌但有自己的小算盘，适合新同事、行政、HR 或其他部门角色"
  },
  {
    id: "fox",
    name: "狐小北",
    avatarInitial: "狐",
    avatarUrl: "/avatars/jojo/npc-fox.svg",
    avatarGradient: "linear-gradient(135deg,#fdba74,#38bdf8)",
    voicePreset: "young_male",
    voiceDescription: "聪明会绕弯的小狐狸声线，语速自然，像产品经理、甲方联系人或新领导助理"
  },
  {
    id: "panda",
    name: "熊团团",
    avatarInitial: "团",
    avatarUrl: "/avatars/jojo/npc-panda.svg",
    avatarGradient: "linear-gradient(135deg,#e5e7eb,#38bdf8)",
    voicePreset: "young_male",
    voiceDescription: "憨厚稳定的小熊猫声线，认真、可靠，适合乙方项目经理、财务或运营角色"
  },
  {
    id: "bear",
    name: "熊多多",
    avatarInitial: "熊",
    avatarUrl: "/avatars/jojo/npc-bear.svg",
    avatarGradient: "linear-gradient(135deg,#fbbf24,#38bdf8)",
    voicePreset: "young_male",
    voiceDescription: "踏实慢热的小熊声线，表达真诚，适合新来的领导、供应商或后勤协同角色"
  },
  {
    id: "frog",
    name: "蛙小绿",
    avatarInitial: "蛙",
    avatarUrl: "/avatars/jojo/npc-frog.svg",
    avatarGradient: "linear-gradient(135deg,#86efac,#38bdf8)",
    voicePreset: "young_real_female",
    voiceDescription: "清脆有点冷幽默的小青蛙声线，适合测试、法务、审计或流程角色"
  },
  {
    id: "deer",
    name: "鹿满满",
    avatarInitial: "鹿",
    avatarUrl: "/avatars/jojo/npc-deer.svg",
    avatarGradient: "linear-gradient(135deg,#fcd34d,#7dd3fc)",
    voicePreset: "young_real_female",
    voiceDescription: "温柔但很会推进事情的小鹿声线，适合客户成功、品牌、市场或跨部门对接角色"
  },
  {
    id: "penguin",
    name: "鹅小南",
    avatarInitial: "鹅",
    avatarUrl: "/avatars/jojo/npc-penguin.svg",
    avatarGradient: "linear-gradient(135deg,#c7d2fe,#38bdf8)",
    voicePreset: "young_male",
    voiceDescription: "一本正经但容易说出笑点的小企鹅声线，适合甲方公司、乙方公司、外包团队或新同事角色"
  }
];

export const defaultJojoNpcProfile = jojoNpcProfiles[0];

export function randomJojoNpcProfile() {
  return jojoNpcProfiles[Math.floor(Math.random() * jojoNpcProfiles.length)] || defaultJojoNpcProfile;
}

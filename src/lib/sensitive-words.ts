/** 昵称敏感词（政治 / 脏话 / 色情等，含中文、英文、拼音片段） */
const RAW_WORDS = [
  // 政治敏感
  "习近平", "xijinping", "xi jinping", "共产党", "gongchandang", "gcd",
  "法轮功", "falun", "falungong", "六四", "64事件", "8964", "tiananmen",
  "台独", "taiwan独立", "藏独", "疆独", "港独", "分裂国家",
  "反共", "颠覆", "暴动", "政变", "恐怖主义", "terrorist",
  // 脏话 / 辱骂
  "傻逼", "傻b", "sb", "煞笔", "沙比", "草泥马", "cnm", "nmsl",
  "你妈", "尼玛", "nima", "tmd", "他妈", "去死", "贱人", "婊子",
  "fuck", "shit", "bitch", "asshole", "damn", "wtf", "stfu",
  "操你", "cao你", "ri你", "日你", "滚蛋", "废物", "垃圾人",
  // 色情 / 低俗
  "色情", "sexy", "porn", "porno", "xxx", "裸体", "裸照", "做爱",
  "性爱", "口交", "肛交", "约炮", "嫖娼", "卖淫", "援交", "一夜情",
  "鸡巴", "jb", "j8", "阴茎", "阴道", "乳房", "奶子", "撸管",
  "手淫", "自慰", "av女", "黄片", "黄网", "成人片", "sm调教",
  "强奸", "轮奸", "乱伦", "恋童", "pedo", "nude", "nudes",
  // 赌博 / 违法
  "赌博", "博彩", "六合彩", "赌场", "毒品", "吸毒", "冰毒", "海洛因",
  "诈骗", "洗钱", "代开发票",
];

function normalizeForCheck(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s_\-·.·,，。!！?？@#￥$%^&*()+=\[\]{}|\\/<>~`'"]/g, "")
    .replace(/[0-9]/g, (d) => d);
}

const NORMALIZED_WORDS = RAW_WORDS.map((w) => normalizeForCheck(w)).filter(Boolean);

export const SENSITIVE_NICKNAME_MSG = "请输入符合法律法规的昵称";

/** 命中敏感词返回 true */
export function containsSensitiveWord(raw: string): boolean {
  const normalized = normalizeForCheck(raw);
  if (!normalized) return false;
  for (const word of NORMALIZED_WORDS) {
    if (word.length >= 2 && normalized.includes(word)) return true;
  }
  return false;
}

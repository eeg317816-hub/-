/** 昵称：2–10 个字符，仅中文/字母/数字，不含空格与特殊符号 */
export const NICKNAME_HINT =
  "请输入昵称2-10个字符，不包含空格和特殊符号";

export const NICKNAME_PATTERN = /^[\u4e00-\u9fffA-Za-z0-9]{2,10}$/;

export function validateNickname(raw: string): string | null {
  const nickname = raw.trim();
  if (!nickname) return "请输入昵称";
  if (/\s/.test(raw)) return NICKNAME_HINT;
  if (nickname.length < 2 || nickname.length > 10) return NICKNAME_HINT;
  if (!NICKNAME_PATTERN.test(nickname)) return NICKNAME_HINT;
  return null;
}

/** 展示用：一行最多 10 字，超出截断 */
export function displayNickname(nickname: string, max = 10) {
  if (nickname.length <= max) return nickname;
  return `${nickname.slice(0, max)}…`;
}

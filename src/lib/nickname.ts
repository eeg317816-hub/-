import { containsSensitiveWord, SENSITIVE_NICKNAME_MSG } from "@/lib/sensitive-words";

/** 昵称：2–10 字符，支持中文/日文/韩文/英文/数字等字母文字，不含空格与特殊符号 */
export const NICKNAME_HINT =
  "请输入昵称2-10个字符，支持中文及多语言，不含空格和特殊符号";

/** Unicode 字母(L) + 数字(N)，覆盖中文、日文、韩文、拉丁等 */
export const NICKNAME_PATTERN = /^[\p{L}\p{N}]{2,10}$/u;

export function validateNickname(raw: string): string | null {
  const nickname = raw.trim();
  if (!nickname) return "请输入昵称";
  if (/\s/.test(raw)) return NICKNAME_HINT;
  if (nickname.length < 2 || nickname.length > 10) return NICKNAME_HINT;
  if (!NICKNAME_PATTERN.test(nickname)) return NICKNAME_HINT;
  if (containsSensitiveWord(nickname)) return SENSITIVE_NICKNAME_MSG;
  return null;
}

/** 输入时轻度过滤：去掉空白，保留各语言字符供 IME 组合 */
export function sanitizeNicknameInput(raw: string): string {
  return raw.replace(/\s/g, "").slice(0, 10);
}

/** 展示用：一行最多 10 字，超出截断 */
export function displayNickname(nickname: string, max = 10) {
  if (nickname.length <= max) return nickname;
  return `${nickname.slice(0, max)}…`;
}

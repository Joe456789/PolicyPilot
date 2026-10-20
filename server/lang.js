// 伺服器端語言輔助(純 Node,不可 import React 或 src/i18n.js)。
// lang 只有 'en' 或 'zh',預設 'zh'。英文的字數比中文多,所以截斷上限放大。
export const normLang = (v) => (v === 'en' ? 'en' : 'zh')
export const EN_SCALE = 2.5

// 回傳 str(v, n) 函式:中文維持原本上限,英文放大 2.5 倍避免句子被攔腰截斷
export function strFor(lang) {
  const k = lang === 'en' ? EN_SCALE : 1
  return (v, n = 400) => String(v ?? '').slice(0, Math.round(n * k))
}

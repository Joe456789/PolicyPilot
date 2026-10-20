import { getLang, moneyEn } from '../i18n.js'

// 中文顯示「萬」,英文顯示 NT$ 金額(語言由設定決定)
export function wan(n, digits = 1) {
  if (getLang() === 'en') return moneyEn(n)
  const v = n / 10000
  const abs = Math.abs(v)
  const str = abs >= 1000 ? Math.round(abs).toLocaleString('en-US') : abs.toFixed(abs >= 100 ? 0 : digits).replace(/\.0$/, '')
  return (v < 0 ? '-' : '') + str + ' 萬'
}
export function money(n) {
  if (getLang() === 'en') return moneyEn(n)
  return (n < 0 ? '-' : '') + 'NT$ ' + Math.abs(Math.round(n)).toLocaleString('en-US')
}
export function signed(n) {
  return (n > 0 ? '+' : n < 0 ? '-' : '') + wan(Math.abs(n))
}

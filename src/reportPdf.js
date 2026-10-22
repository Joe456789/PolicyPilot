// 學習報告「下載 PDF」:把報告畫成圖片,切成 A4 頁面存成 PDF 檔。
// 不靠瀏覽器的列印功能(手機、App 內建瀏覽器、嵌入的頁面常常不能列印);套件在按下按鈕時才載入。
// 換頁時盡量切在段落、表格列之間,不把一行字切成兩半。

const PAGE_W = 210, PAGE_H = 297, MARGIN = 10 // mm

export async function downloadReportPdf(el, filename) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  el.classList.add('pdf-render')
  try {
    await new Promise((r) => requestAnimationFrame(() => r()))
    const top = el.getBoundingClientRect().top
    // 可以換頁的位置(CSS 像素):每個段落、標題、表格列、圖表的下緣
    const cuts = [...el.querySelectorAll('h1, h2, p, li, tr, svg, .pr-script, .pr-foot, .pr-head')]
      .map((n) => n.getBoundingClientRect().bottom - top)
      .sort((a, b) => a - b)
    const scale = 2
    const canvas = await html2canvas(el, { scale, backgroundColor: '#ffffff', useCORS: true, logging: false })
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
    const contentW = PAGE_W - MARGIN * 2
    const pxPerMm = canvas.width / contentW
    const pageH = Math.floor((PAGE_H - MARGIN * 2) * pxPerMm)
    let y = 0
    let page = 0
    while (y < canvas.height - 2) {
      let end = Math.min(canvas.height, y + pageH)
      if (end < canvas.height) {
        // 找這一頁範圍內最後一個可以切的位置(太靠前就不管,直接切滿一頁)
        const ok = cuts.map((c) => Math.round(c * scale)).filter((c) => c > y + pageH * 0.6 && c <= end)
        if (ok.length) end = ok[ok.length - 1]
      }
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = end - y
      const ctx = slice.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, slice.width, slice.height)
      ctx.drawImage(canvas, 0, y, canvas.width, end - y, 0, 0, canvas.width, end - y)
      if (page > 0) pdf.addPage()
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN, MARGIN, contentW, (end - y) / pxPerMm)
      y = end
      page++
    }
    const blob = pdf.output('blob')
    // 在 Claude 線上版(嵌入的頁面)裡不能直接下載,要透過平台的存檔功能,會跳出確認視窗
    const downloads = window.claude?.use ? await window.claude.use('downloads') : null
    if (downloads) {
      try {
        await downloads.save({ filename, data: blob })
        return
      } catch (e) {
        if (e?.code === 'declined' || e?.code === 'rate_limited') return // 使用者取消,不要再跳一次
        // 其他錯誤:退回一般下載
      }
    }
    // 自己建立下載連結,檔名(含中文)才不會變成 download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } finally {
    el.classList.remove('pdf-render')
  }
}

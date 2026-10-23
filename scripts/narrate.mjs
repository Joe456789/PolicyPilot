// 幫錄好的展示影片配上旁白:把 .srt 每一段字幕念出來,放到對應的時間點,合成有聲音的 mp4。
//   npm run narrate                       (預設處理 video/保險大富翁_展示影片_3分鐘版.mp4)
//   node scripts/narrate.mjs 影片.mp4 字幕.srt 輸出.mp4
// 語音引擎依序嘗試:
//   1. edge-tts(微軟自然語音,最好聽;需要 Python:pip install edge-tts,要連網)
//   2. Windows 內建語音(System.Speech,不用安裝;中文聲音要有安裝中文語音套件)
// 環境變數:VOICE(edge-tts 聲音,預設 zh-TW-HsiaoChenNeural;男聲可用 zh-TW-YunJheNeural)、TTS=edge|windows 指定引擎
// 需要 ffmpeg。

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', ...opts })
const ok = (cmd, args) => { try { return run(cmd, args).status === 0 } catch { return false } }

function parseSrt(text) {
  const sec = (t) => { const [h, m, s] = t.replace(',', '.').split(':'); return +h * 3600 + +m * 60 + +s }
  return text.replace(/\r/g, '').split(/\n\n+/).map((b) => b.trim().split('\n')).filter((l) => l.length >= 3)
    .map((l) => { const [a, b] = l[1].split(' --> '); return { start: sec(a), end: sec(b), text: l.slice(2).join('') } })
}

function duration(file) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
  return Number(r.stdout.trim()) || 0
}

// edge-tts 可能是指令,也可能只能用 python -m 執行
function edgeCmd() {
  for (const [cmd, pre] of [['edge-tts', []], ['python', ['-m', 'edge_tts']], ['py', ['-m', 'edge_tts']], ['python3', ['-m', 'edge_tts']]]) {
    if (ok(cmd, [...pre, '--help'])) return [cmd, pre]
  }
  return null
}

function pickEngine() {
  const want = process.env.TTS
  if (want === 'beep') return { name: '測試音', say: beep }
  const edge = want !== 'windows' && edgeCmd()
  if (edge) return { name: 'edge-tts 微軟自然語音', say: (text, out) => sayEdge(edge, text, out), fallback: want !== 'edge' && process.platform === 'win32' }
  if (want !== 'edge' && process.platform === 'win32') return { name: 'Windows 內建語音', say: sayWindows }
  return null
}

function sayEdge([cmd, pre], text, out) {
  const txt = out + '.txt'
  fs.writeFileSync(txt, text, 'utf8')
  const r = run(cmd, [...pre, '--voice', process.env.VOICE || 'zh-TW-HsiaoChenNeural', '--rate=+8%', '-f', txt, '--write-media', out], { env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' } })
  if (r.status === 0 && fs.existsSync(out) && fs.statSync(out).size > 0) return true
  const err = `${r.error?.message || ''}${r.stderr || ''}${r.stdout || ''}`.trim().split('\n').slice(-6).join('\n')
  throw Object.assign(new Error(err || `edge-tts 結束代碼 ${r.status}`), { edge: true })
}

function sayWindows(text, out) {
  const txt = out + '.txt'
  fs.writeFileSync(txt, text, 'utf8')
  const ps = `
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$v = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'zh-TW' } | Select-Object -First 1
if (-not $v) { $v = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'zh-*' } | Select-Object -First 1 }
if ($v) { $s.SelectVoice($v.VoiceInfo.Name) } else { Write-Error 'no chinese voice'; exit 2 }
$s.Rate = 1
$s.SetOutputToWaveFile('${out.replace(/'/g, "''")}')
$s.Speak((Get-Content -LiteralPath '${txt.replace(/'/g, "''")}' -Encoding UTF8 -Raw))
$s.Dispose()`
  const r = run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps])
  if (r.status === 2) throw new Error('Windows 沒有安裝中文語音。請到「設定 → 時間與語言 → 語音」新增中文(台灣)語音,或改用 edge-tts(pip install edge-tts)。')
  return r.status === 0 && fs.existsSync(out)
}

// 只用來測試流程:長度約等於念完這段字的時間
function beep(text, out) {
  const d = (text.length / 4.5).toFixed(2)
  return run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `sine=frequency=440:duration=${d}`, out]).status === 0
}

export function narrate(video, srt, out) {
  if (!ok('ffmpeg', ['-version'])) { console.log('⚠ 找不到 ffmpeg,沒辦法配音(Windows:winget install ffmpeg,裝完重開終端機)。'); return null }
  let engine = pickEngine()
  if (!engine) { console.log('⚠ 找不到語音引擎:請安裝 Python 後執行 pip install edge-tts,再跑 npm run narrate。'); return null }
  console.log(`配音中(${engine.name})…`)
  const subs = parseSrt(fs.readFileSync(srt, 'utf8'))
  const total = duration(video)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-narrate-'))
  const clips = []
  subs.forEach((s, i) => {
    let file = path.join(tmp, `${i}.${engine.say === sayWindows ? 'wav' : 'mp3'}`)
    let said
    try { said = engine.say(s.text, file) } catch (e) {
      if (!e.edge) throw e
      if (!engine.warned) console.log(`  ⚠ edge-tts 失敗:\n${e.message.replace(/^/gm, '    ')}`)
      engine.warned = true
      if (!engine.fallback) { said = false } else {
        console.log('  改用 Windows 內建語音。')
        engine = { name: 'Windows 內建語音', say: sayWindows }
        file = path.join(tmp, `${i}.wav`)
        said = engine.say(s.text, file)
      }
    }
    if (!said) { console.log(`  ⚠ 第 ${i + 1} 段配音失敗,跳過`); return }
    // 旁白比這段畫面長的話,稍微加快(最多 1.6 倍),避免蓋到下一段
    const slot = (subs[i + 1]?.start ?? total) - s.start - 0.4
    const len = duration(file)
    const tempo = len > slot && slot > 0 ? Math.min(len / slot, 1.6) : 1
    if (len / tempo > slot + 0.4) console.log(`  ⚠ 第 ${i + 1} 段旁白比畫面長 ${(len / tempo - slot).toFixed(1)} 秒`)
    clips.push({ file, at: s.start, tempo })
  })
  if (!clips.length) return null
  const inputs = clips.flatMap((c) => ['-i', c.file])
  const parts = clips.map((c, i) => `[${i + 1}:a]aresample=44100,atempo=${c.tempo.toFixed(3)},adelay=${Math.round(c.at * 1000)}:all=1[a${i}]`)
  const filter = `${parts.join(';')};${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:duration=longest:normalize=0,apad=whole_dur=${total.toFixed(3)},atrim=0:${total.toFixed(3)},asetpts=N/SR/TB[a]`
  const r = run('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, ...inputs, '-filter_complex', filter, '-map', '0:v', '-map', '[a]',
    ...(video.endsWith('.mp4') ? ['-c:v', 'copy'] : ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20']), '-c:a', 'aac', '-b:a', '160k', '-t', String(total), out], { stdio: 'inherit' })
  fs.rmSync(tmp, { recursive: true, force: true })
  if (r.status !== 0) { console.log('⚠ 合成配音失敗。'); return null }
  console.log('  ' + out + '(有旁白,上傳 YouTube 用這個)')
  return out
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const dir = path.resolve('video')
  const fast = path.join(dir, '保險大富翁_展示影片_3分鐘版.mp4')
  const video = process.argv[2] || (fs.existsSync(fast) ? fast : [path.join(dir, '保險大富翁_展示影片.mp4'), path.join(dir, '保險大富翁_展示影片.webm')].find((f) => fs.existsSync(f)))
  if (!video || !fs.existsSync(video)) { console.error('找不到影片,請先執行 npm run record'); process.exit(1) }
  const srt = process.argv[3] || video.replace(/\.(mp4|webm)$/, '.srt')
  const out = process.argv[4] || video.replace(/\.(mp4|webm)$/, '_配音版.mp4')
  try { if (!narrate(video, srt, out)) process.exit(1) } catch (e) { console.error(e.message); process.exit(1) }
}

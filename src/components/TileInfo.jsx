import { X } from 'lucide-react'
import { BOARD } from '../game/engine.js'
import { propById, LEVELS, rentOf, tollOf, RISK_NAME } from '../game/properties.js'
import { tileHelp } from '../game/demoScript.js'
import { wan } from '../game/format.js'
import { useArt } from '../art.js'
import { t, getLang } from '../i18n.js'

// 點棋盤上的格子:這格是什麼、走到會怎樣;資產格另外列出價格、租金、過路費、天災機率與目前持有人。
export default function TileInfo({ index, players, owner, humanPos, onClose }) {
  const art = useArt()
  const tile = BOARD[index]
  if (!tile) return null
  const [title, body] = tileHelp(tile.type)
  const p = tile.prop ? propById(tile.prop) : null
  const img = p ? art('prop_' + p.id) : null
  const steps = (index - humanPos + BOARD.length) % BOARD.length
  const here = players.filter((pl) => (pl.s.pos || 0) === index).map((pl) => t(pl.name))
  const sep = getLang() === 'en' ? ', ' : '、'
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t(tile.label)} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal tile-info">
        <header className="ti-h">
          <span className="ti-ico" aria-hidden>{tile.icon}</span>
          <div>
            <h3>{p ? t('{region} · {name}', { region: t(p.region), name: t(p.name) }) : t(tile.label)}</h3>
            <small>{t('第 {n} 格', { n: index })} · {title}</small>
          </div>
          <button className="btn ghost" onClick={onClose} aria-label={t('關閉')}><X size={18} aria-hidden /></button>
        </header>
        {img && <img className="card-art" src={img} alt="" />}
        <p>{p ? t(p.blurb) : body}</p>
        {p && (
          <>
            <div className="ti-grid">
              <span>{t('售價')}</span><b>{wan(p.price)}</b>
              <span>{t('年租金(基本 / 頂級)')}</span><b>{wan(rentOf(p, 1))} / {wan(rentOf(p, 3))}</b>
              <span>{t('過路費(基本 / 頂級)')}</span><b>{wan(tollOf(p, 1))} / {wan(tollOf(p, 3))}</b>
              <span>{t('天災年機率')}</span><b>{Object.entries(p.risk).map(([k, v]) => `${t(RISK_NAME[k])} ${(v * 100).toFixed(1)}%`).join(sep)}</b>
            </div>
            <p className="ti-owner">
              {owner
                ? t('持有人:{name} · {level}{ins}', { name: t(players[owner.ownerIdx]?.name || ''), level: t(LEVELS[owner.level].name), ins: owner.insured ? t(' · 有投保財產險') : t(' · 沒有保險') })
                : t('目前無人持有:走到這格就能買下,不買會進入拍賣。')}
            </p>
          </>
        )}
        <p className="muted small">
          {steps === 0 ? t('你現在就在這一格。') : steps <= 6 ? t('離你 {n} 格:下一次擲骰有 1/6 的機會剛好走到。', { n: steps }) : t('離你 {n} 格。', { n: steps })}
          {here.length ? ` ${t('在這格的玩家:{names}', { names: here.join(sep) })}` : ''}
        </p>
      </div>
    </div>
  )
}

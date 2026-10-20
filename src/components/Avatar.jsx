// 以 SVG 程式繪製的角色頭像:不依賴外部圖檔,放大不會糊,也能依角色資料換色。
import { t } from '../i18n.js'

export default function Avatar({ look, size = 96, ring = true, title }) {
  const { skin, hair, style, top, accent, extra } = look
  const id = `av-${style}-${top.replace('#', '')}`
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={title || t('角色頭像')}
      style={{ display: 'block' }}
    >
      <defs>
        <clipPath id={id}>
          <circle cx="60" cy="60" r="58" />
        </clipPath>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={accent} />
          <stop offset="1" stopColor="#fff" stopOpacity=".6" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill={`url(#${id}-bg)`} />
      <g clipPath={`url(#${id})`}>
        {/* 後髮 */}
        {style === 'long' && <path d="M32 54c0-26 12-36 28-36s28 10 28 36v40H32z" fill={hair} />}
        {style === 'bob' && <path d="M33 52c0-24 11-34 27-34s27 10 27 34v18c0 4-4 6-8 6H41c-4 0-8-2-8-6z" fill={hair} />}
        {style === 'ponytail' && <path d="M84 40c14 4 18 22 10 40-2-12-6-20-12-24z" fill={hair} />}
        {/* 身體 */}
        <path d="M14 124c0-26 18-40 46-40s46 14 46 40z" fill={top} />
        {extra === 'tie' && <path d="M56 86h8l4 22-8 8-8-8z" fill="#c0392b" />}
        {extra === 'tie' && <path d="M47 84l13 12 13-12" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />}
        {extra !== 'tie' && <path d="M46 86c4 10 24 10 28 0" fill="none" stroke="#ffffff55" strokeWidth="3" strokeLinecap="round" />}
        {/* 頸與臉 */}
        <rect x="52" y="70" width="16" height="18" rx="6" fill={skin} />
        <circle cx="60" cy="54" r="25" fill={skin} />
        <ellipse cx="60" cy="78" rx="9" ry="3" fill="#00000012" />
        {/* 前髮 */}
        {style === 'short' && <path d="M35 50c-2-20 10-30 25-30s27 10 25 30c-4-10-10-14-16-15-8 4-20 6-34 15z" fill={hair} />}
        {style === 'long' && <path d="M35 52c0-18 10-30 25-30s25 12 25 30c-6-10-14-16-25-17-11 1-20 7-25 17z" fill={hair} />}
        {style === 'bun' && (
          <>
            <circle cx="60" cy="22" r="10" fill={hair} />
            <path d="M35 52c0-18 10-28 25-28s25 10 25 28c-6-10-14-14-25-14s-19 4-25 14z" fill={hair} />
          </>
        )}
        {style === 'ponytail' && <path d="M35 52c0-18 10-29 25-29s25 11 25 29c-6-11-14-15-25-15s-19 4-25 15z" fill={hair} />}
        {style === 'messy' && <path d="M34 54l-4-18 10 6 4-14 10 8 6-14 8 14 10-6 4 12 8-2-4 14c-4-10-12-16-26-16s-22 6-26 16z" fill={hair} />}
        {style === 'side' && <path d="M35 50c-1-18 10-28 26-28 14 0 24 8 24 24-8-8-18-12-30-8-6 2-14 6-20 12z" fill={hair} />}
        {style === 'bob' && <path d="M34 54c0-20 10-31 26-31s26 11 26 31c-4-12-14-18-26-18s-22 6-26 18z" fill={hair} />}
        {/* 五官 */}
        <circle cx="50" cy="56" r="2.8" fill="#2d2420" />
        <circle cx="70" cy="56" r="2.8" fill="#2d2420" />
        <path d="M52 66c4 5 12 5 16 0" fill="none" stroke="#8a4b3a" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="44" cy="64" r="4" fill="#ff8a8a" opacity=".28" />
        <circle cx="76" cy="64" r="4" fill="#ff8a8a" opacity=".28" />
        {/* 配件 */}
        {extra === 'glasses' && (
          <g fill="none" stroke="#3b3b3b" strokeWidth="2.2">
            <circle cx="50" cy="56" r="7.5" />
            <circle cx="70" cy="56" r="7.5" />
            <path d="M57.5 56h5" />
          </g>
        )}
        {extra === 'headphones' && (
          <g>
            <path d="M33 56c-2-24 10-34 27-34s29 10 27 34" fill="none" stroke="#333" strokeWidth="4" strokeLinecap="round" />
            <rect x="27" y="50" width="10" height="16" rx="5" fill="#ffd166" />
            <rect x="83" y="50" width="10" height="16" rx="5" fill="#ffd166" />
          </g>
        )}
        {extra === 'beanie' && (
          <g>
            <path d="M34 44c0-18 11-26 26-26s26 8 26 26z" fill="#e8590c" />
            <rect x="32" y="40" width="56" height="8" rx="4" fill="#c2410c" />
            <circle cx="60" cy="16" r="5" fill="#fde68a" />
          </g>
        )}
        {extra === 'heart' && <path d="M92 28c-3-5-10-3-10 3 0 5 10 11 10 11s10-6 10-11c0-6-7-8-10-3z" fill="#ff5c8a" />}
      </g>
      {ring && <circle cx="60" cy="60" r="58" fill="none" stroke="#fff" strokeWidth="3" />}
    </svg>
  )
}

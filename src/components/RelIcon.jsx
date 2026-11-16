/** Ícono SVG de cada símbolo de la leyenda de Fisher. */
export default function RelIcon({ type, color = 'currentColor', w = 26, h = 10 }) {
  const mid = h / 2
  const common = { fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
  let body
  switch (type) {
    case 'zigzag':
      body = <path {...common} stroke={color === 'currentColor' ? '#ff9f0a' : color} d={`M1 ${mid} L5 1 L9 ${h - 1} L13 1 L17 ${h - 1} L21 1 L25 ${mid}`} />
      break
    case 'double':
      body = (
        <g {...common}>
          <line x1="1" y1={mid - 2} x2={w - 1} y2={mid - 2} />
          <line x1="1" y1={mid + 2} x2={w - 1} y2={mid + 2} />
        </g>
      )
      break
    case 'dotted':
      body = <line {...common} x1="1" y1={mid} x2={w - 1} y2={mid} strokeDasharray="2 3" />
      break
    case 'arrow':
      body = (
        <g {...common}>
          <line x1="1" y1={mid} x2={w - 4} y2={mid} />
          <path d={`M${w - 7} 1.5 L${w - 1} ${mid} L${w - 7} ${h - 1.5}`} />
        </g>
      )
      break
    case 'broken':
      body = (
        <g {...common}>
          <line x1="1" y1={mid} x2={w - 1} y2={mid} />
          <line x1={w / 2 - 2} y1="0.5" x2={w / 2 - 2} y2={h - 0.5} stroke="#ff6b5e" />
          <line x1={w / 2 + 2} y1="0.5" x2={w / 2 + 2} y2={h - 0.5} stroke="#ff6b5e" />
        </g>
      )
      break
    case 'box':
      body = <rect x="6" y="1" width={w - 12} height={h - 2} fill="none" stroke="#ff9f0a" strokeWidth="1.4" />
      break
    case 'shadow':
      body = <path d={`M1 ${h} A ${h - 1} ${h - 1} 0 0 1 ${h * 1.6} 1 L ${h * 1.6} ${h} Z`} fill={color === 'currentColor' ? '#8fa3c0' : color} opacity="0.5" />
      break
    case 'circle':
      body = (
        <g>
          <circle cx="6" cy={mid} r="3" fill="#3d8bff" />
          <circle cx="18" cy={mid} r="4.6" fill="#e0313f" />
        </g>
      )
      break
    default:
      body = <line {...common} x1="1" y1={mid} x2={w - 1} y2={mid} />
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      {body}
    </svg>
  )
}

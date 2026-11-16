// Íconos SVG de trazo (24×24). Decorativos por defecto: el texto o aria-label del botón da el nombre.
const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

export const IconExpand = () => (
  <svg {...base}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
)
export const IconClose = () => (
  <svg {...base}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
export const IconPrev = () => (
  <svg {...base}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)
export const IconNext = () => (
  <svg {...base}>
    <path d="M9 5l7 7-7 7" />
  </svg>
)
export const IconLegend = () => (
  <svg {...base}>
    <circle cx="6" cy="7" r="2.2" />
    <path d="M11 7h9M11 17h9" />
    <path d="M3.8 17l1.4-2 1.4 4 1.4-2" />
  </svg>
)
export const IconPosition = () => (
  <svg {...base}>
    <rect x="4" y="5" width="16" height="11" rx="2.5" />
    <path d="M9 20l3-4 3 4" />
  </svg>
)
export const IconReset = () => (
  <svg {...base}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />
  </svg>
)
export const IconPlay = () => (
  <svg {...base}>
    <path d="M7 5.5v13l11-6.5z" fill="currentColor" stroke="none" />
  </svg>
)
export const IconStop = () => (
  <svg {...base}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
  </svg>
)

import type { SVGProps } from 'react'

/**
 * Small inline icon set — 24px grid, 1.5 stroke, currentColor so every icon
 * inherits text color tokens. Decorative by default (aria-hidden); pass
 * aria-hidden={false} + aria-label / <title> to make one meaningful.
 */
export type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 20, ...rest }: IconProps): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    focusable: false,
    'aria-hidden': true,
    ...rest,
  }
}

export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 8h16M4 16h11" />
  </svg>
)

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

export const WhatsAppIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.3l-4.5 1.2z" />
    <path d="M9 8.6c.2-.5.5-.6.8-.6h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.6l-.5.6c-.1.2-.1.4 0 .5.6 1 1.4 1.8 2.4 2.3.2.1.4.1.5 0l.6-.6c.2-.2.4-.2.6-.1l1.6.7c.3.1.4.3.4.5v.5c0 .4-.2.7-.6.9-.7.3-1.6.4-2.6 0a8.6 8.6 0 0 1-4.6-4.6c-.4-1-.4-1.9-.2-2.6z" />
  </svg>
)

export const InstagramIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
  </svg>
)

export const PinterestIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M10.6 20.2l1.9-7.6" />
    <path d="M10.4 14.4c.5.6 1.3.9 2.2.9 2.2 0 3.6-1.9 3.6-4.2 0-2.3-1.9-3.9-4.2-3.9-2.6 0-4.3 1.9-4.3 4 0 .9.3 1.7.9 2.1" />
  </svg>
)

export const PinIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
)

export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)

export const PhoneIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5.2 3.8h3l1.5 4-2 1.3a10.5 10.5 0 0 0 5.2 5.2l1.3-2 4 1.5v3a1.6 1.6 0 0 1-1.7 1.6A15.5 15.5 0 0 1 3.6 5.5a1.6 1.6 0 0 1 1.6-1.7z" />
  </svg>
)

export const MailIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="M4 7l8 6 8-6" />
  </svg>
)

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12.5l4.2 4.2L19 7" />
  </svg>
)

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 9.5l6 6 6-6" />
  </svg>
)

export const ArrowUpRightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 17L17 7M8.5 7H17v8.5" />
  </svg>
)

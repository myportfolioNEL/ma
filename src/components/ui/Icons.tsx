/**
 * Icons.tsx — inline SVG only. No icon package.
 *
 * Every icon is a 16px-grid stroke path that inherits currentColor, so a
 * parent's `color` is the only thing that styles it. Total cost: ~1 kB.
 */

type IconProps = {
  size?: number;
  className?: string;
};

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
});

export const ArrowUpRight = ({ size = 14, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4.5 11.5 11.5 4.5" />
    <path d="M6 4.5h5.5V10" />
  </svg>
);

export const ArrowDown = ({ size = 14, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M8 3v10" />
    <path d="M4 9.5 8 13.5l4-4" />
  </svg>
);

export const ArrowRight = ({ size = 14, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M3 8h10" />
    <path d="M9.5 4.5 13 8l-3.5 3.5" />
  </svg>
);

export const Close = ({ size = 14, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 4l8 8" />
    <path d="M12 4l-8 8" />
  </svg>
);

export const Copy = ({ size = 14, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.6" />
    <path d="M10.5 5.5v-1a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1" />
  </svg>
);

export const Check = ({ size = 14, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M3 8.5 6.2 12 13 4.8" />
  </svg>
);

export const Pin = ({ size = 14, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M8 14s4.5-4.2 4.5-7.4A4.5 4.5 0 0 0 8 2.1a4.5 4.5 0 0 0-4.5 4.5C3.5 9.8 8 14 8 14Z" />
    <circle cx="8" cy="6.5" r="1.6" />
  </svg>
);

/* Both glyphs below keep the contract of base(): the same 16 grid, the same
   stroke width, no fill, no brand colour. A line drawing sits inside this
   interface; a green badge would not. */

export const WhatsApp = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M13.4 8.1a5.3 5.3 0 0 1-7.9 4.6L2.7 13.6l.9-2.7A5.3 5.3 0 1 1 13.4 8.1Z" />
    <path d="M6.2 6c.5 2 1.8 3.3 3.8 3.8l.8-.9 1.1.7-.2 1a4.8 4.8 0 0 1-5.2-1.6A4.8 4.8 0 0 1 5.1 5.7l1-.5.7 1.1-.6.5" />
  </svg>
);

export const Download = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M8 2.4v7.1" />
    <path d="M4.9 6.8 8 9.9l3.1-3.1" />
    <path d="M2.9 12.5h10.2" />
  </svg>
);

/* The eye is a reading glyph and it sits beside Download inside the same plate,
   so the two have to weigh the same on the page: one closed curve, one circle,
   nothing filled. An emoji would be a fourth typeface arriving in the middle of
   a control, at a size nobody chose, and it would not inherit `color`. */
export const Eye = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M1.6 8S3.9 3.9 8 3.9 14.4 8 14.4 8 12.1 12.1 8 12.1 1.6 8 1.6 8Z" />
    <circle cx="8" cy="8" r="2.1" />
  </svg>
);

/* The grip. A plus inside the lens, because the control does one thing in one
   direction: it enlarges. */
export const Loupe = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="6.9" cy="6.9" r="4.3" />
    <path d="M10.1 10.1 14 14" />
    <path d="M5.2 6.9h3.4" />
    <path d="M6.9 5.2v3.4" />
  </svg>
);


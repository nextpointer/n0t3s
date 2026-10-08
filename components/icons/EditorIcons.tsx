import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function frame(props: IconProps) {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    width: 18,
    height: 18,
    "aria-hidden": true,
    ...props,
  };
}

export function BoldIcon(props: IconProps) {
  return (
    <svg {...frame(props)}>
      <path d="M7 4.75v14.5" />
      <path d="M7 4.75h5.75a3.375 3.375 0 0 1 0 6.75H7z" />
      <path d="M7 11.5h6.5a3.75 3.75 0 0 1 0 7.5H7z" />
    </svg>
  );
}

export function ItalicIcon(props: IconProps) {
  return (
    <svg {...frame(props)}>
      <path d="M15.5 4.75h-4.25" />
      <path d="M12.75 19.25H8.5" />
      <path d="M14.75 4.75 9.25 19.25" />
    </svg>
  );
}

export function CodeIcon(props: IconProps) {
  return (
    <svg {...frame(props)}>
      <path d="m8.25 8.25-4 3.75 4 3.75" />
      <path d="m15.75 8.25 4 3.75-4 3.75" />
      <path d="m13.5 5-3 14" />
    </svg>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <svg {...frame(props)}>
      <path d="M9.75 14.25 14.25 9.75" />
      <path d="M12.9 7.35 14.6 5.65a3.9 3.9 0 1 1 5.5 5.5l-1.7 1.7" />
      <path d="M11.1 16.65 9.4 18.35a3.9 3.9 0 1 1-5.5-5.5l1.7-1.7" />
    </svg>
  );
}

export function BulletListIcon(props: IconProps) {
  return (
    <svg {...frame(props)}>
      <circle cx="4" cy="6.75" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="4" cy="17.25" r="1.15" fill="currentColor" stroke="none" />
      <path d="M8.5 6.75h11.5M8.5 12h11.5M8.5 17.25h11.5" />
    </svg>
  );
}

export function OrderedListIcon(props: IconProps) {
  return (
    <svg {...frame(props)}>
      <path d="M9.75 6.75h10.5M9.75 12h10.5M9.75 17.25h10.5" />
      <path d="M3.6 5.5 4.9 4.9v4.2" />
      <path d="M3.4 10.6h2.1c.55 0 .95.35.95.85s-.4.85-.95.85H3.4l2.3 2.15" />
      <path d="M3.45 16.05c.25-.35.65-.55 1.15-.55.6 0 1 .3 1 .75 0 .3-.15.5-.4.62.3.1.5.35.5.7 0 .52-.45.88-1.08.88-.48 0-.9-.2-1.12-.55" />
    </svg>
  );
}

export function TaskListIcon(props: IconProps) {
  return (
    <svg {...frame(props)}>
      <rect x="2.6" y="4.55" width="4.3" height="4.3" rx="1.15" />
      <path d="m3.85 6.7.95.95 1.7-1.9" />
      <rect x="2.6" y="9.85" width="4.3" height="4.3" rx="1.15" />
      <rect x="2.6" y="15.15" width="4.3" height="4.3" rx="1.15" />
      <path d="M9.75 6.7h10.5M9.75 12h10.5M9.75 17.3h10.5" />
    </svg>
  );
}

export function QuoteIcon(props: IconProps) {
  return (
    <svg {...frame({ stroke: "none", fill: "currentColor", ...props })}>
      <path d="M6.85 7.15c-2 1.05-3.35 3-3.35 5.45 0 2.4 1.45 4.2 3.6 4.2 1.9 0 3.25-1.35 3.25-3.25 0-1.8-1.3-3.15-3.05-3.15-.35 0-.7.05-.95.15.35-1.2 1.3-2.25 2.65-2.85z" />
      <path d="M16.85 7.15c-2 1.05-3.35 3-3.35 5.45 0 2.4 1.45 4.2 3.6 4.2 1.9 0 3.25-1.35 3.25-3.25 0-1.8-1.3-3.15-3.05-3.15-.35 0-.7.05-.95.15.35-1.2 1.3-2.25 2.65-2.85z" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...frame(props)}>
      <path d="M2.5 12S6 5.75 12 5.75 21.5 12 21.5 12 18 18.25 12 18.25 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.9" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...frame(props)}>
      <path d="M4 20h4L19.25 8.75a2.15 2.15 0 0 0-3.04-3.04L5 17v3z" />
      <path d="m14.6 6.4 3 3" />
    </svg>
  );
}

export function PlainTextIcon(props: IconProps) {
  return (
    <svg {...frame(props)}>
      <path d="M4 6.5h16M4 12h16M4 17.5h9.5" />
    </svg>
  );
}

/** A formatting bar — used for the toolbar visibility toggle. */
export function ToolbarIcon(props: IconProps) {
  return (
    <svg {...frame(props)}>
      <rect x="2.75" y="4.25" width="18.5" height="15.5" rx="2.75" />
      <path d="M2.75 9.5h18.5" />
      <path d="M6 6.9h1.4M9.2 6.9h2.6M13.6 6.9h2.2M17.5 6.9h1.6" />
      <path d="M6.25 13h11.5M6.25 16.25h6.75" />
    </svg>
  );
}
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { SupportedLanguage } from "../constants/languages";

export const LANG_COLOR: Record<SupportedLanguage, string> = {
  python: "#3572A5",
  java: "#B07219",
  c: "#6E7B8B",
  cpp: "#F34B7D",
  javascript: "#F7DF1E",
  typescript: "#3178C6",
  html: "#E34C26",
  css: "#563D7C",
  sql: "#E38C00",
  go: "#00ADD8",
  rust: "#DEA584",
  php: "#4F5D95",
  json: "#CBCB41",
};

type IconProps = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const Icons = {
  logo: ({ size = 18, className }: IconProps) => (
    <svg {...base(size)} className={className} strokeWidth={2}>
      <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" />
      <path d="m8.5 10 2.5 2.5L8.5 15" />
      <path d="M13.5 15h3" />
    </svg>
  ),
  play: ({ size = 14, className }: IconProps) => (
    <svg {...base(size)} className={className} fill="currentColor" stroke="none">
      <path d="M7 4.5v15l13-7.5-13-7.5Z" />
    </svg>
  ),
  copy: ({ size = 14, className }: IconProps) => (
    <svg {...base(size)} className={className}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  ),
  check: ({ size = 14, className }: IconProps) => (
    <svg {...base(size)} className={className}>
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  ),
  reset: ({ size = 14, className }: IconProps) => (
    <svg {...base(size)} className={className}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4.5V10H9" />
    </svg>
  ),
  sun: ({ size = 15, className }: IconProps) => (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </svg>
  ),
  moon: ({ size = 15, className }: IconProps) => (
    <svg {...base(size)} className={className}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  ),
  spark: ({ size = 14, className }: IconProps) => (
    <svg {...base(size)} className={className}>
      <path d="M12 3.5 13.6 8 18 9.6l-4.4 1.6L12 15.7l-1.6-4.5L6 9.6 10.4 8 12 3.5Z" />
      <path d="M18.5 16.5 19.2 18.5 21.2 19.2 19.2 19.9 18.5 21.9 17.8 19.9 15.8 19.2 17.8 18.5 18.5 16.5Z" />
    </svg>
  ),
  map: ({ size = 14, className }: IconProps) => (
    <svg {...base(size)} className={className}>
      <path d="M3.5 6.5 9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2v-13Z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </svg>
  ),
  terminal: ({ size = 14, className }: IconProps) => (
    <svg {...base(size)} className={className}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="m7.5 10 2.5 2.5L7.5 15M13 15h4" />
    </svg>
  ),
  close: ({ size = 14, className }: IconProps) => (
    <svg {...base(size)} className={className}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  ),
  file: ({ size = 13, className }: IconProps) => (
    <svg {...base(size)} className={className}>
      <path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5l-5-5Z" />
      <path d="M14 3.5v5h5" />
    </svg>
  ),
  keyboard: ({ size = 13, className }: IconProps) => (
    <svg {...base(size)} className={className}>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M8 14h8" />
    </svg>
  ),
};

export function ToolButton({
  label,
  active,
  primary,
  dark,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
  primary?: boolean;
  dark: boolean;
  children: ReactNode;
}) {
  const idle = dark
    ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.09] hover:text-white"
    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900";
  const on = dark
    ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-200"
    : "border-indigo-300 bg-indigo-50 text-indigo-700";
  const run = dark
    ? "border-transparent bg-emerald-600 text-white shadow-sm shadow-emerald-900/40 hover:bg-emerald-500"
    : "border-transparent bg-emerald-600 text-white shadow-sm hover:bg-emerald-500";

  const tone = primary ? run : active ? on : idle;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={primary ? undefined : active}
      className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50 ${tone} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

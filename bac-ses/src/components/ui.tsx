import Link from "next/link";
import type { ReactNode } from "react";
import { EXERCISE_LABEL, EXERCISE_STYLE, GRID_LABEL, PEDAGOGICAL_LABEL } from "@/lib/labels";
import type { ExerciseType, GridMatchStatus, PedagogicalStatus } from "@/lib/types";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function ExerciseBadge({ type, size = "sm" }: { type: ExerciseType; size?: "sm" | "md" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full font-semibold ring-1 ring-inset",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        EXERCISE_STYLE[type],
      )}
      title={EXERCISE_LABEL[type].long}
    >
      {EXERCISE_LABEL[type].short}
    </span>
  );
}

const TONE: Record<string, string> = {
  neutral: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300",
  info: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200",
  warn: "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  ok: "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  strong: "bg-emerald-600 text-white",
};

export function Pill({ tone = "neutral", children, icon }: { tone?: keyof typeof TONE; children: ReactNode; icon?: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", TONE[tone])}>
      {icon}
      {children}
    </span>
  );
}

export function PedagogicalPill({ status }: { status: PedagogicalStatus }) {
  const s = PEDAGOGICAL_LABEL[status];
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function GridPill({ status }: { status: GridMatchStatus }) {
  const s = GRID_LABEL[status];
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function LockIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
    </svg>
  );
}

export function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.64l-3.22-3.22a.75.75 0 1 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06l3.22-3.22H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
    </svg>
  );
}

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Link
      href={href}
      className={cx(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition",
        variant === "primary"
          ? "bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700"
          : "bg-white text-ink-800 ring-1 ring-ink-200 hover:bg-ink-50 dark:bg-ink-900 dark:text-ink-100 dark:ring-ink-700 dark:hover:bg-ink-800",
      )}
    >
      {children}
    </Link>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink-200/70 dark:bg-ink-900 dark:ring-ink-800", className)}>{children}</div>
  );
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <p className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">{eyebrow}</p>}
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl dark:text-white">{title}</h2>
      {children && <p className="mt-3 text-ink-600 dark:text-ink-300">{children}</p>}
    </div>
  );
}

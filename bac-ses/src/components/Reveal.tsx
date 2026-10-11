"use client";

import { useState, type ReactNode } from "react";

/** Bouton « Afficher le corrigé » : laisse l'élève chercher avant de lire la réponse. */
export function Reveal({ children, label, hideLabel }: { children: ReactNode; label: string; hideLabel: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-ring mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
      >
        {open ? hideLabel : label}
      </button>
      {!open && <p className="mt-2 text-sm text-ink-500">Conseil : rédigez d&apos;abord votre propre réponse, puis comparez.</p>}
      <div hidden={!open} className={open ? "animate-fade-up" : undefined}>
        {children}
      </div>
    </div>
  );
}

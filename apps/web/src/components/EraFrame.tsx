import type { ReactNode } from "react";

export type Era = "pre2000" | "2000s" | "2010s" | "2020s";

interface Props {
  title: string;
  era: Era | null;
  children: ReactNode;
  className?: string;
}

/** Window chrome that changes with the decade the participant picked. */
export default function EraFrame({ title, era, children, className = "" }: Props) {
  return (
    <div className={`era-window ${className}`}>
      <div className="era-titlebar">
        {era === "2010s" || era === "2020s" ? (
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
          </div>
        ) : null}
        <span className={`truncate ${era === "2010s" || era === "2020s" ? "mx-auto" : ""}`}>{title}</span>
        {era === "pre2000" ? (
          <div className="flex gap-0.5 text-[10px] leading-none text-black" aria-hidden="true">
            {["_", "□", "×"].map((c) => (
              <span key={c} className="border-2 border-[#fff_#404040_#404040_#fff] bg-[#c0c0c0] px-1 py-0.5 font-bold">
                {c}
              </span>
            ))}
          </div>
        ) : era === "2000s" ? (
          <div className="flex gap-1" aria-hidden="true">
            <span className="rounded bg-[#3c81f3] px-1.5 text-[11px] font-bold text-white">_</span>
            <span className="rounded bg-[#3c81f3] px-1.5 text-[11px] font-bold text-white">□</span>
            <span className="rounded bg-[#e0492f] px-1.5 text-[11px] font-bold text-white">×</span>
          </div>
        ) : era === null ? (
          <span className="text-xs opacity-60">v0.1</span>
        ) : (
          <span className="w-12" />
        )}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

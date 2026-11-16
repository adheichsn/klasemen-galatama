import * as React from "react";
import { cn } from "@/lib/utils";
type Props = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "blue" | "green" | "slate" | "amber";
};
const tones = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
};
export function Badge({ className, tone = "blue", ...props }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wide ring-1 ring-inset",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

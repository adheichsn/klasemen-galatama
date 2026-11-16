import * as React from "react";
import { cn } from "@/lib/utils";
export const Card = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_6px_28px_rgba(30,64,175,.04)]",
      className,
    )}
    {...props}
  />
);
export const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1 p-5", className)} {...props} />
);
export const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn("text-lg font-extrabold tracking-tight", className)}
    {...props}
  />
);
export const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-5 pt-0", className)} {...props} />
);

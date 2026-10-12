import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: Props) {
  return (
    <div className={cn("rounded-xl border border-dashed border-dena-border bg-dena-bg p-5", className)}>
      <p className="font-bold text-dena-ink">{title}</p>
      <p className="mt-2 text-sm leading-7 text-dena-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

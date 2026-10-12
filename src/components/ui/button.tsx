import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline";

export function buttonClassName(variant: Variant = "primary", className?: string) {
  return cn(
    "inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
    variant === "primary" && "bg-dena-brand text-white hover:bg-dena-deep",
    variant === "secondary" && "bg-dena-lavender text-dena-brand hover:bg-violet-100",
    variant === "outline" && "border border-dena-border bg-white text-dena-ink hover:bg-dena-bg",
    className,
  );
}

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type={type} className={buttonClassName(variant, className)} {...props} />;
}

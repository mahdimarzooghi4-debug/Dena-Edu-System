import type { ReactNode } from "react";

type Props = {
  id: string;
  children: ReactNode;
  note?: string;
};

export function SectionHeading({ id, children, note }: Props) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id={id} className="text-xl font-extrabold leading-9 text-dena-ink md:text-[21px]">
        {children}
      </h2>
      {note && <p className="text-xs text-dena-muted">{note}</p>}
    </div>
  );
}

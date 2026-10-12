import type { ReactNode } from "react";
import { InstituteShell } from "../../components/institute/institute-shell";

export default function InstituteLayout({ children }: { children: ReactNode }) {
  return <InstituteShell>{children}</InstituteShell>;
}

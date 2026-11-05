import type { ReactNode } from "react";
import { BenefactorShell } from "../../components/benefactor/shell";

export default function BenefactorLayout({ children }: { children: ReactNode }) {
  return <BenefactorShell>{children}</BenefactorShell>;
}

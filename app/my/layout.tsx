import { ReactNode } from "react";
import { MyShell } from "@/app/my/_components/my-shell";

export default function MyLayout({ children }: { children: ReactNode }) {
  return <MyShell>{children}</MyShell>;
}

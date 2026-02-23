import { ReactNode } from "react";
import { MyHeaderBar } from "@/app/my/_components/my-header-bar";
import { MySubNav } from "@/app/my/_components/my-sub-nav";

export function MyShell({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <MyHeaderBar />
      <MySubNav />
      <div>{children}</div>
    </div>
  );
}

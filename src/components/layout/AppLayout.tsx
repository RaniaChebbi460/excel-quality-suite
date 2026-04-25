import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";

export const AppLayout = ({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) => {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} subtitle={subtitle} />
        <div className="flex-1 px-6 py-5 animate-fade-in">{children}</div>
      </main>
    </div>
  );
};

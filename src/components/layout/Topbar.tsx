import { Bell, HelpCircle, RefreshCw, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Topbar = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Données en cours</span>
        </div>
        <Button variant="default" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
        <button className="relative w-9 h-9 rounded-md border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-semibold">
            3
          </span>
        </button>
        <button className="w-9 h-9 rounded-md border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
};

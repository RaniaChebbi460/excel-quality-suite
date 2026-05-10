import { useState } from "react";
import { Bell, HelpCircle, RefreshCw, Calendar, PanelLeft, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notificationActions, useNotificationStore, type AppNotification, type NotificationType } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const Topbar = ({
  title,
  subtitle,
  sidebarOpen,
  onToggleSidebar,
}: {
  title: string;
  subtitle?: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) => {
  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          <PanelLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
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
        <NotificationBell />
        <button className="w-9 h-9 rounded-md border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
};

const typeIcon: Record<NotificationType, { bg: string; icon: React.ReactNode }> = {
  info: { bg: "bg-primary/10 text-primary", icon: <Bell className="w-3.5 h-3.5" /> },
  success: { bg: "bg-success/10 text-success", icon: <Check className="w-3.5 h-3.5" /> },
  warning: { bg: "bg-warning/10 text-warning", icon: <Bell className="w-3.5 h-3.5" /> },
  error: { bg: "bg-destructive/10 text-destructive", icon: <X className="w-3.5 h-3.5" /> },
};

const NotificationBell = () => {
  const items = useNotificationStore((s) => s.items);
  const unread = items.filter((it) => !it.read).length;
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative w-9 h-9 rounded-md border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-semibold">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="font-semibold text-sm">Notifications</div>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => notificationActions.markAllRead()}>
                <Check className="w-3 h-3 mr-1" /> Lire tout
              </Button>
            )}
            {items.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-destructive hover:text-destructive" onClick={() => notificationActions.clearAll()}>
                <Trash2 className="w-3 h-3 mr-1" /> Effacer
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-72">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {items.map((n) => (
                <NotificationRow key={n.id} n={n} />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

const NotificationRow = ({ n }: { n: AppNotification }) => {
  const style = typeIcon[n.type];
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer",
        !n.read && "bg-accent/20"
      )}
      onClick={() => notificationActions.markRead(n.id)}
    >
      <div className={cn("mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0", style.bg)}>
        {style.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{n.title}</div>
        {n.message && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</div>}
        <div className="text-[10px] text-muted-foreground mt-1">
          {new Date(n.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      <button
        className="mt-0.5 text-muted-foreground hover:text-destructive transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          notificationActions.dismiss(n.id);
        }}
        aria-label="Supprimer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

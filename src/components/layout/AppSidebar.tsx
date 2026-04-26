import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Database,
  Layers,
  LineChart,
  Target,
  Users,
  Ruler,
  FileText,
  Settings,
  Activity,
} from "lucide-react";

const items = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/data", label: "Données", icon: Database },
  { to: "/import-plan", label: "Plan d'import", icon: Layers },
  { to: "/spc", label: "Cartes SPC", icon: LineChart },
  { to: "/capability", label: "Capabilité Process", icon: Target },
  { to: "/msa", label: "MSA (R&R)", icon: Users },
  { to: "/uncertainty", label: "Incertitude", icon: Ruler },
  { to: "/reports", label: "Rapports", icon: FileText },
  { to: "/settings", label: "Paramètres", icon: Settings },
];

export const AppSidebar = () => {
  return (
    <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-elegant">
          <Activity className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <div className="font-semibold text-sidebar-accent-foreground tracking-tight">SPC CONTROL</div>
          <div className="text-xs text-sidebar-foreground/70">Analyse de processus</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer user */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md bg-sidebar-accent">
          <div className="w-9 h-9 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-sm font-semibold">
            A
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-accent-foreground">Admin</div>
            <div className="text-xs text-sidebar-foreground/70">Administrateur</div>
          </div>
        </div>
        <div className="text-[10px] text-sidebar-foreground/50 text-center mt-3">© 2026 SPC Control · v1.0.0</div>
      </div>
    </aside>
  );
};

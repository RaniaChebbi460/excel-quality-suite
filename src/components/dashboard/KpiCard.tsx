import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar } from "recharts";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: "primary" | "success" | "warning" | "purple" | "orange" | "info";
  trend?: number[];
  trendType?: "area" | "bar";
}

const accentMap = {
  primary: { text: "text-primary", chart: "hsl(var(--primary))" },
  success: { text: "text-success", chart: "hsl(var(--success))" },
  warning: { text: "text-warning", chart: "hsl(var(--warning))" },
  purple: { text: "text-purple", chart: "hsl(var(--purple))" },
  orange: { text: "text-orange", chart: "hsl(var(--orange))" },
  info: { text: "text-info", chart: "hsl(var(--info))" },
};

export const KpiCard = ({ label, value, unit, subtitle, accent = "primary", trend, trendType = "area" }: KpiCardProps) => {
  const a = accentMap[accent];
  const data = (trend ?? []).map((v, i) => ({ i, v }));
  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-4 flex flex-col gap-2 hover:shadow-elegant transition-shadow">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="flex items-baseline gap-1">
        <div className={`text-3xl font-bold ${a.text}`}>{value}</div>
        {unit && <div className="text-sm text-muted-foreground">{unit}</div>}
      </div>
      {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      {trend && trend.length > 0 && (
        <div className="h-12 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            {trendType === "area" ? (
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={`grad-${accent}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={a.chart} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={a.chart} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={a.chart} strokeWidth={1.5} fill={`url(#grad-${accent})`} />
              </AreaChart>
            ) : (
              <BarChart data={data}>
                <Bar dataKey="v" fill={a.chart} radius={[2, 2, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

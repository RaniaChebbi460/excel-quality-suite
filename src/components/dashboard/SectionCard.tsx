import { ReactNode } from "react";

export const SectionCard = ({
  title,
  children,
  actions,
  className = "",
}: {
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) => (
  <section className={`bg-card rounded-xl border border-border shadow-card overflow-hidden ${className}`}>
    <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-gradient-to-b from-secondary/40 to-transparent">
      <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
    <div className="p-5">{children}</div>
  </section>
);

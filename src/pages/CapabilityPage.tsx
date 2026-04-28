import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useAppStore, appActions } from "@/store/app-store";
import { computeCapability, buildHistogram, normalPdf } from "@/lib/spc-engine";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SpecsPanel } from "@/components/specs/SpecsPanel";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const CapabilityPage = () => {
  const spcSheet = useAppStore(() => appActions.getSheetForKind("spc"));
  const specs = useAppStore((s) => s.specs);
  const mapping = useAppStore((s) => s.mapping);
  const perColumnSpecs = useAppStore((s) => s.perColumnSpecs);

  const columns = mapping.measureCols.length > 0 ? mapping.measureCols : [];
  const [selectedCol, setSelectedCol] = useState<string | null>(columns[0] ?? null);
  const activeCol = selectedCol ?? columns[0] ?? null;

  const perColumn = useMemo(() => {
    if (!spcSheet || columns.length === 0) return [];
    return columns.map((c) => {
      const values = spcSheet.rows.map((r) => Number(r[c])).filter((v) => !isNaN(v));
      const eff = perColumnSpecs[c] ?? { lsl: specs.lsl, usl: specs.usl, target: specs.target };
      const cap = computeCapability(values, eff.lsl, eff.usl, eff.target, specs.subgroupSize);
      return { col: c, values, spec: eff, cap, hasOverride: !!perColumnSpecs[c] };
    });
  }, [spcSheet, columns, perColumnSpecs, specs]);

  const hasData = perColumn.length > 0 && perColumn.some((p) => p.values.length > 0);

  const active = useMemo(() => {
    if (activeCol && perColumn.length > 0) {
      const found = perColumn.find((p) => p.col === activeCol);
      if (found && found.values.length > 0) return found;
    }
    return perColumn.find((p) => p.values.length > 0) ?? null;
  }, [activeCol, perColumn]);

  const hist = useMemo(() => {
    if (!active) return [];
    const h = buildHistogram(active.values, 25);
    const sigma = active.cap.stdLongTerm || 0.001;
    const maxCount = Math.max(...h.map((d) => d.count), 1);
    const maxPdf = normalPdf(active.cap.mean, active.cap.mean, sigma);
    return h.map((d) => ({ ...d, pdf: maxPdf > 0 ? (normalPdf(d.bin, active.cap.mean, sigma) / maxPdf) * maxCount : 0 }));
  }, [active]);

  if (!hasData || !active) {
    return (
      <AppLayout title="Capabilité Process" subtitle={`${specs.projectName} · Cp · Cpk · Pp · Ppk · Cpm`}>
        <div className="mb-5"><SpecsPanel /></div>
        <EmptyState
          title="Aucune donnée de capabilité"
          message="Importez votre fichier Excel SPC/Capabilité depuis l'onglet « Données ». Les indices Cp, Cpk, Pp, Ppk et l'histogramme avec courbe normale seront calculés directement à partir de vos mesures."
        />
      </AppLayout>
    );
  }

  const cap = active.cap;
  const eff = active.spec;
  const values = active.values;
  const StatusIcon = cap.status === "capable" ? CheckCircle2 : cap.status === "improve" ? AlertTriangle : XCircle;
  const statusColor = cap.status === "capable" ? "text-success" : cap.status === "improve" ? "text-warning" : "text-destructive";

  return (
    <AppLayout title="Capabilité Process" subtitle={`${specs.projectName} · Cp · Cpk · Pp · Ppk · Cpm`}>
      <div className="mb-5"><SpecsPanel /></div>

      {perColumn.length > 1 && (
        <SectionCard title="Synthèse multi-colonnes" className="mb-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-2 px-2">Colonne</th>
                  <th className="text-right py-2 px-2">LSL</th>
                  <th className="text-right py-2 px-2">Cible</th>
                  <th className="text-right py-2 px-2">USL</th>
                  <th className="text-right py-2 px-2">Moyenne</th>
                  <th className="text-right py-2 px-2">σ</th>
                  <th className="text-right py-2 px-2">Cp</th>
                  <th className="text-right py-2 px-2">Cpk</th>
                  <th className="text-right py-2 px-2">Ppk</th>
                  <th className="text-left py-2 px-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {perColumn.map((p) => {
                  const color = p.cap.cpk >= 1.33 ? "text-success" : p.cap.cpk >= 1 ? "text-warning" : "text-destructive";
                  return (
                    <tr
                      key={p.col}
                      className={`border-b border-border/50 hover:bg-muted/30 cursor-pointer ${active.col === p.col ? "bg-accent/30" : ""}`}
                      onClick={() => setSelectedCol(p.col)}
                    >
                      <td className="px-2 py-1.5 font-medium flex items-center gap-2">
                        {p.col}
                        {p.hasOverride && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">Spec dédiée</Badge>}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{p.spec.lsl}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{p.spec.target}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{p.spec.usl}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{p.cap.mean.toFixed(3)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{p.cap.stdLongTerm.toFixed(3)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{p.cap.cp.toFixed(2)}</td>
                      <td className={`px-2 py-1.5 text-right tabular-nums font-semibold ${color}`}>{p.cap.cpk.toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{p.cap.ppk.toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-xs text-muted-foreground">{p.cap.interpretation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <SectionCard title="Source de données">
          <div className="text-xs text-muted-foreground mb-2">
            Mappage actif : <strong className="text-foreground">{mapping.measureCols.join(", ") || "—"}</strong>
          </div>
          <Label className="text-xs">Colonne analysée</Label>
          <select
            value={active.col}
            onChange={(e) => setSelectedCol(e.target.value || null)}
            className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
          >
            {columns.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <div className="mt-3 text-xs text-muted-foreground">N (mesures) : <strong className="text-foreground">{values.length}</strong></div>
          <div className="mt-1 text-xs text-muted-foreground">
            Spec utilisée : LSL={eff.lsl} · Cible={eff.target} · USL={eff.usl}
          </div>
        </SectionCard>

        <SectionCard title={`Indicateurs · ${active.col}`} className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Idx label="Cp" value={cap.cp} />
            <Idx label="Cpk" value={cap.cpk} highlight />
            <Idx label="Pp" value={cap.pp} />
            <Idx label="Ppk" value={cap.ppk} highlight />
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${cap.status === "capable" ? "bg-success/10 border-success/30" : cap.status === "improve" ? "bg-warning/10 border-warning/30" : "bg-destructive/10 border-destructive/30"}`}>
            <StatusIcon className={`w-7 h-7 ${statusColor}`} />
            <div>
              <div className={`font-semibold ${statusColor}`}>{cap.interpretation}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Moyenne = {cap.mean.toFixed(3)} · σ (court terme) = {cap.stdShortTerm.toFixed(3)} · σ (long terme) = {cap.stdLongTerm.toFixed(3)}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Distribution & limites de spécification">
        <div className="h-80">
          <ResponsiveContainer>
            <ComposedChart data={hist} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
              <ReferenceLine x={eff.lsl.toFixed(2)} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `LSL ${eff.lsl}`, fill: "hsl(var(--destructive))", fontSize: 11, position: "top" }} />
              <ReferenceLine x={eff.usl.toFixed(2)} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `USL ${eff.usl}`, fill: "hsl(var(--destructive))", fontSize: 11, position: "top" }} />
              <ReferenceLine x={eff.target.toFixed(2)} stroke="hsl(var(--success))" strokeDasharray="4 4" label={{ value: `Cible ${eff.target}`, fill: "hsl(var(--success))", fontSize: 11, position: "top" }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" opacity={0.7} radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="pdf" stroke="hsl(var(--purple))" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </AppLayout>
  );
};

const Idx = ({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) => {
  const color = value >= 1.33 ? "text-success" : value >= 1 ? "text-warning" : "text-destructive";
  return (
    <div className={`rounded-lg p-3 border ${highlight ? "border-primary/30 bg-accent/30" : "border-border bg-card"}`}>
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value.toFixed(2)}</div>
    </div>
  );
};

export default CapabilityPage;

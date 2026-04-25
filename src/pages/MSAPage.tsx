import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { useAppStore, appActions } from "@/store/app-store";
import { computeMSA, MSAEntry } from "@/lib/spc-engine";
import { DEMO_MSA } from "@/lib/demo-data";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { CheckCircle2, AlertTriangle, XCircle, Wand2 } from "lucide-react";

const MSAPage = () => {
  const sheet = useAppStore(() => appActions.getAnalysisSheet());
  const mapping = useAppStore((s) => s.mapping);

  // Local overrides (default to global mapping)
  const [colPart, setColPart] = useState<string>(mapping.partCol ?? "");
  const [colOp, setColOp] = useState<string>(mapping.operatorCol ?? "");
  const [colTrial, setColTrial] = useState<string>(mapping.trialCol ?? "");
  const [colVal, setColVal] = useState<string>(mapping.valueCol ?? "");

  const entries: MSAEntry[] = useMemo(() => {
    if (sheet && colPart && colOp && colVal) {
      return sheet.rows
        .map((r, i) => ({
          part: r[colPart],
          operator: r[colOp],
          trial: colTrial ? Number(r[colTrial]) : i,
          value: Number(r[colVal]),
        }))
        .filter((e) => e.part != null && e.operator != null && !isNaN(e.value));
    }
    return DEMO_MSA;
  }, [sheet, colPart, colOp, colTrial, colVal]);

  const msa = useMemo(() => computeMSA(entries.length > 0 ? entries : DEMO_MSA), [entries]);
  const usingDemo = entries === DEMO_MSA || entries.length === 0;

  const pieData = [
    { name: `EV ${msa.evPct.toFixed(1)}%`, value: msa.evPct, color: "hsl(var(--primary))" },
    { name: `AV ${msa.avPct.toFixed(1)}%`, value: msa.avPct, color: "hsl(var(--purple))" },
    { name: `PV ${msa.pvPct.toFixed(1)}%`, value: msa.pvPct, color: "hsl(var(--success))" },
  ];
  const barData = [
    { name: "EV", "% Contribution": msa.evContrib, "% Study Var": msa.evPct },
    { name: "AV", "% Contribution": msa.avContrib, "% Study Var": msa.avPct },
    { name: "GRR", "% Contribution": msa.grrContrib, "% Study Var": msa.grrPct },
    { name: "PV", "% Contribution": msa.pvContrib, "% Study Var": msa.pvPct },
  ];

  const StatusIcon = msa.status === "excellent" ? CheckCircle2 : msa.status === "acceptable" ? AlertTriangle : XCircle;
  const statusColor = msa.status === "excellent" ? "text-success" : msa.status === "acceptable" ? "text-warning" : "text-destructive";

  return (
    <AppLayout title="MSA — Gage R&R" subtitle="Répétabilité & Reproductibilité (méthode moyenne & étendue)">
      {sheet && (
        <SectionCard title="Mappage des colonnes (surcharge locale)" className="mb-5"
          actions={
            <Link to="/data">
              <Button variant="outline" size="sm" className="gap-1.5"><Wand2 className="w-3.5 h-3.5" />Assistant</Button>
            </Link>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Pièce", state: colPart, setter: setColPart },
              { label: "Opérateur", state: colOp, setter: setColOp },
              { label: "Essai", state: colTrial, setter: setColTrial },
              { label: "Valeur", state: colVal, setter: setColVal },
            ].map((f) => (
              <div key={f.label}>
                <Label className="text-xs">{f.label}</Label>
                <select value={f.state} onChange={(e) => f.setter(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm">
                  <option value="">— Sélectionner —</option>
                  {sheet.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {usingDemo && (
        <div className="mb-5 px-4 py-2 rounded-md bg-info/10 border border-info/30 text-info text-sm">
          📊 Démonstration : 10 pièces × 3 opérateurs × 3 essais.
        </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <SectionCard title="Configuration">
          <div className="space-y-2 text-sm">
            <Spec label="Nombre de pièces" value={String(msa.parts)} />
            <Spec label="Nombre d'opérateurs" value={String(msa.operators)} />
            <Spec label="Nombre d'essais" value={String(msa.trials)} />
            <Spec label="Nombre catégories distinctes (ndc)" value={String(msa.ndc)} highlight={msa.ndc >= 5} />
          </div>
        </SectionCard>

        <SectionCard title="Résultats" className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-2 font-medium">Source</th>
                <th className="text-right py-2 font-medium">Écart-type</th>
                <th className="text-right py-2 font-medium">% Contribution</th>
                <th className="text-right py-2 font-medium">% Study Var</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <tr className="border-b border-border/50"><td className="py-2">Répétabilité (EV)</td><td className="text-right">{msa.ev.toFixed(4)}</td><td className="text-right">{msa.evContrib.toFixed(2)}%</td><td className="text-right">{msa.evPct.toFixed(2)}%</td></tr>
              <tr className="border-b border-border/50"><td className="py-2">Reproductibilité (AV)</td><td className="text-right">{msa.av.toFixed(4)}</td><td className="text-right">{msa.avContrib.toFixed(2)}%</td><td className="text-right">{msa.avPct.toFixed(2)}%</td></tr>
              <tr className="border-b border-border/50 font-semibold bg-accent/30"><td className="py-2">R&R Total</td><td className="text-right">{msa.grr.toFixed(4)}</td><td className="text-right">{msa.grrContrib.toFixed(2)}%</td><td className="text-right">{msa.grrPct.toFixed(2)}%</td></tr>
              <tr className="border-b border-border/50"><td className="py-2">Pièce à pièce (PV)</td><td className="text-right">{msa.pv.toFixed(4)}</td><td className="text-right">{msa.pvContrib.toFixed(2)}%</td><td className="text-right">{msa.pvPct.toFixed(2)}%</td></tr>
              <tr className="font-semibold"><td className="py-2">Total Variation (TV)</td><td className="text-right">{msa.tv.toFixed(4)}</td><td className="text-right">100%</td><td className="text-right">100%</td></tr>
            </tbody>
          </table>
          <div className={`flex items-center gap-3 mt-4 p-3 rounded-lg border ${msa.status === "excellent" ? "bg-success/10 border-success/30" : msa.status === "acceptable" ? "bg-warning/10 border-warning/30" : "bg-destructive/10 border-destructive/30"}`}>
            <StatusIcon className={`w-7 h-7 ${statusColor}`} />
            <div>
              <div className={`font-semibold ${statusColor}`}>%GRR = {msa.grrPct.toFixed(2)}%</div>
              <div className="text-xs text-muted-foreground">{msa.interpretation}</div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Décomposition de la variation">
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={90} innerRadius={45}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Comparaison des composantes">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="% Contribution" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="% Study Var" fill="hsl(var(--purple))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </AppLayout>
  );
};

const Spec = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex justify-between border-b border-border/50 py-2">
    <span className="text-muted-foreground text-xs">{label}</span>
    <span className={`font-semibold text-sm tabular-nums ${highlight ? "text-success" : ""}`}>{value}</span>
  </div>
);

export default MSAPage;

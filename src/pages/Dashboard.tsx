import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { ControlChart } from "@/components/charts/ControlChart";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw, CheckCircle2, AlertTriangle, BarChart3 } from "lucide-react";
import { useAppStore, appActions } from "@/store/app-store";
import { DEMO_SUBGROUPS, DEMO_SPEC, DEMO_MSA } from "@/lib/demo-data";
import {
  computeXbarR,
  computeCapability,
  computeMSA,
  buildHistogram,
  normalPdf,
  mean,
} from "@/lib/spc-engine";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

const Dashboard = () => {
  // For now, the dashboard runs on demo data. Real data flow goes through /data → analysis pages.
  const subgroups = DEMO_SUBGROUPS;
  const flatValues = useMemo(() => subgroups.flat(), [subgroups]);

  const spc = useMemo(() => computeXbarR(subgroups), [subgroups]);
  const cap = useMemo(
    () => computeCapability(flatValues, DEMO_SPEC.lsl, DEMO_SPEC.usl, DEMO_SPEC.target, 5),
    [flatValues]
  );
  const msa = useMemo(() => computeMSA(DEMO_MSA), []);

  const isInControl = spc.outOfControl.length === 0;

  // tiny trend arrays for KPI cards
  const trendMean = spc.subgroupMeans;
  const trendRange = spc.subgroupRanges;
  const trendCpk = Array.from({ length: 16 }, (_, i) => 1 + Math.sin(i * 0.6) * 0.2 + 0.3);
  const trendPpk = Array.from({ length: 16 }, (_, i) => 1 + Math.cos(i * 0.5) * 0.15 + 0.2);
  const trendU = Array.from({ length: 18 }, (_, i) => 0.005 + Math.sin(i * 0.4) * 0.002);

  // Histogram data
  const hist = useMemo(() => {
    const h = buildHistogram(flatValues, 18);
    const sigma = cap.stdLongTerm;
    const maxCount = Math.max(...h.map((d) => d.count));
    const maxPdf = normalPdf(cap.mean, cap.mean, sigma);
    return h.map((d) => ({
      ...d,
      pdf: (normalPdf(d.bin, cap.mean, sigma) / maxPdf) * maxCount,
    }));
  }, [flatValues, cap]);

  // MSA pie
  const msaPie = [
    { name: `EV (${msa.evPct.toFixed(1)}%)`, value: msa.evPct, color: "hsl(var(--primary))" },
    { name: `AV (${msa.avPct.toFixed(1)}%)`, value: msa.avPct, color: "hsl(var(--purple))" },
    { name: `PV (${msa.pvPct.toFixed(1)}%)`, value: msa.pvPct, color: "hsl(var(--success))" },
  ];

  // Subgroup table (first 5)
  const tableRows = subgroups.slice(0, 5);

  return (
    <AppLayout title="Tableau de bord" subtitle="Vue d'ensemble du processus">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
        <div className="bg-card rounded-xl border border-border shadow-card p-4 flex flex-col gap-2">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">État du processus</div>
          <div className="flex items-center gap-3 py-2">
            {isInControl ? (
              <CheckCircle2 className="w-10 h-10 text-success" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-warning" />
            )}
            <div>
              <div className={`font-bold text-sm ${isInControl ? "text-success" : "text-warning"}`}>
                {isInControl ? "SOUS CONTRÔLE" : "HORS CONTRÔLE"}
              </div>
              <div className="text-xs text-muted-foreground">
                {spc.outOfControl.length === 0 ? "Aucun point hors limites" : `${spc.outOfControl.length} point(s) détecté(s)`}
              </div>
            </div>
          </div>
        </div>

        <KpiCard label="Moyenne globale (X̄)" value={cap.mean.toFixed(3)} unit="mm" accent="success" trend={trendMean} />
        <KpiCard label="Écart type global (σ)" value={cap.stdLongTerm.toFixed(3)} unit="mm" accent="info" trend={trendRange} />
        <KpiCard label="Pp" value={cap.pp.toFixed(2)} subtitle="Process Performance" accent="primary" trend={trendCpk} trendType="bar" />
        <KpiCard label="Ppk" value={cap.ppk.toFixed(2)} subtitle="Performance réelle" accent="purple" trend={trendPpk} trendType="bar" />
        <KpiCard label="Incertitude (U)" value={cap.stdLongTerm > 0 ? (cap.stdLongTerm / Math.sqrt(flatValues.length) * 2).toFixed(4) : "-"} unit="mm" accent="orange" trend={trendU} />
      </div>

      {/* Row: data table + control charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <SectionCard title="1. Données (sous-groupes)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="px-2 py-2 text-left font-medium">Sous-groupe</th>
                  {Array.from({ length: spc.n }).map((_, i) => (
                    <th key={i} className="px-2 py-2 text-left font-medium">Mesure {i + 1}</th>
                  ))}
                  <th className="px-2 py-2 text-left font-medium">Moyenne (X̄)</th>
                  <th className="px-2 py-2 text-left font-medium">Étendue (R)</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((g, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-2 py-2 font-medium">{i + 1}</td>
                    {g.map((v, j) => (
                      <td key={j} className="px-2 py-2 tabular-nums">{v.toFixed(2)}</td>
                    ))}
                    <td className="px-2 py-2 tabular-nums font-semibold text-primary">{mean(g).toFixed(3)}</td>
                    <td className="px-2 py-2 tabular-nums">{(Math.max(...g) - Math.min(...g)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Total sous-groupes : <span className="font-semibold text-foreground">{subgroups.length}</span></div>
              <div>Taille du sous-groupe : <span className="font-semibold text-foreground">{spc.n}</span></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5"><Trash2 className="w-3.5 h-3.5" />Effacer</Button>
              <Button size="sm" className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Recalculer</Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="2. Cartes de contrôle (X̄ - R)">
          <div className="text-xs text-muted-foreground mb-1 font-medium">Carte X̄ (Moyennes)</div>
          <ControlChart
            values={spc.subgroupMeans}
            ucl={spc.uclX}
            cl={spc.clX}
            lcl={spc.lclX}
            outOfControl={spc.outOfControl}
            height={180}
          />
          <div className="text-xs text-muted-foreground mb-1 mt-3 font-medium">Carte R (Étendues)</div>
          <ControlChart
            values={spc.subgroupRanges}
            ucl={spc.uclR}
            cl={spc.clR}
            lcl={spc.lclR}
            color="hsl(var(--info))"
            height={150}
          />
        </SectionCard>
      </div>

      {/* Row: capability + uncertainty */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <SectionCard title="3. Capabilité Process">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 space-y-2 text-sm">
              <Spec label="USL (Limite sup.)" value={`${cap.usl.toFixed(2)} mm`} />
              <Spec label="LSL (Limite inf.)" value={`${cap.lsl.toFixed(2)} mm`} />
              <Spec label="Cible (Target)" value={`${cap.target?.toFixed(2)} mm`} />
              <Spec label="Moyenne (X̄)" value={`${cap.mean.toFixed(3)} mm`} />
              <Spec label="Écart type (σ)" value={`${cap.stdLongTerm.toFixed(3)} mm`} />
            </div>
            <div className="col-span-1 h-44">
              <ResponsiveContainer>
                <ComposedChart data={hist} margin={{ top: 10, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                  <ReferenceLine x={cap.lsl.toFixed(2)} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: "LSL", fill: "hsl(var(--destructive))", fontSize: 10 }} />
                  <ReferenceLine x={cap.usl.toFixed(2)} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: "USL", fill: "hsl(var(--destructive))", fontSize: 10 }} />
                  <ReferenceLine x={cap.target?.toFixed(2)} stroke="hsl(var(--success))" strokeDasharray="3 3" label={{ value: "Cible", fill: "hsl(var(--success))", fontSize: 10 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" opacity={0.8} radius={[2, 2, 0, 0]} />
                  <Line type="monotone" dataKey="pdf" stroke="hsl(var(--purple))" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="col-span-1 grid grid-cols-2 gap-2 text-sm content-start">
              <Stat label="Cp" value={cap.cp.toFixed(2)} accent="primary" />
              <Stat label="Cpk" value={cap.cpk.toFixed(2)} accent={cap.cpk >= 1.33 ? "success" : cap.cpk >= 1 ? "warning" : "destructive"} />
              <Stat label="Pp" value={cap.pp.toFixed(2)} accent="primary" />
              <Stat label="Ppk" value={cap.ppk.toFixed(2)} accent={cap.ppk >= 1.33 ? "success" : cap.ppk >= 1 ? "warning" : "destructive"} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="4. Incertitude de mesure">
          <div className="grid grid-cols-2 gap-4 items-center">
            <UncertaintyGauge value={cap.stdLongTerm / Math.sqrt(flatValues.length) * 2} max={0.02} />
            <div className="space-y-2 text-sm">
              <Spec label="Type d'incertitude" value="Type A" />
              <Spec label="N (mesures)" value={String(flatValues.length)} />
              <Spec label="Écart type (s)" value={cap.stdLongTerm.toFixed(3) + " mm"} />
              <Spec label="Incertitude (u)" value={(cap.stdLongTerm / Math.sqrt(flatValues.length)).toFixed(4) + " mm"} />
              <Spec label="Incertitude élargie (U)" value={(cap.stdLongTerm / Math.sqrt(flatValues.length) * 2).toFixed(4) + " mm"} />
              <Spec label="Facteur k" value="2" />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Row: MSA + interpretation */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <SectionCard title="5. MSA – R&R (Répétabilité & Reproductibilité)">
          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-2 font-medium">Source</th>
                    <th className="text-right py-2 font-medium">Écart (s)</th>
                    <th className="text-right py-2 font-medium">% Contrib.</th>
                    <th className="text-right py-2 font-medium">% Study</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  <tr className="border-b border-border/50"><td className="py-1.5">Répétabilité (EV)</td><td className="text-right">{msa.ev.toFixed(3)}</td><td className="text-right">{msa.evContrib.toFixed(1)}%</td><td className="text-right">{msa.evPct.toFixed(1)}%</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5">Reproductibilité (AV)</td><td className="text-right">{msa.av.toFixed(3)}</td><td className="text-right">{msa.avContrib.toFixed(1)}%</td><td className="text-right">{msa.avPct.toFixed(1)}%</td></tr>
                  <tr className="border-b border-border/50 font-medium"><td className="py-1.5">R&R (GRR)</td><td className="text-right">{msa.grr.toFixed(3)}</td><td className="text-right">{msa.grrContrib.toFixed(1)}%</td><td className="text-right">{msa.grrPct.toFixed(1)}%</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5">Pièce à pièce (PV)</td><td className="text-right">{msa.pv.toFixed(3)}</td><td className="text-right">{msa.pvContrib.toFixed(1)}%</td><td className="text-right">{msa.pvPct.toFixed(1)}%</td></tr>
                  <tr className="font-semibold"><td className="py-1.5">Total Variation (TV)</td><td className="text-right">{msa.tv.toFixed(3)}</td><td className="text-right">100%</td><td className="text-right">100%</td></tr>
                </tbody>
              </table>
              <div className={`mt-3 text-sm font-semibold flex items-center gap-2 ${msa.status === "excellent" ? "text-success" : msa.status === "acceptable" ? "text-warning" : "text-destructive"}`}>
                %GRR = {msa.grrPct.toFixed(1)}%
                <span className="text-xs font-normal">· {msa.interpretation}</span>
              </div>
            </div>
            <div className="h-44">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={msaPie} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {msaPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="6. État du processus & interprétation">
          <div className="grid grid-cols-3 gap-4 items-start">
            <div className="col-span-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-2 font-medium">Critère</th>
                    <th className="text-left py-2 font-medium">Résultat</th>
                    <th className="text-left py-2 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  <Row label="Points hors limites" value={String(spc.outOfControl.length)} ok={spc.outOfControl.length === 0} />
                  <Row label="Tendance / règles SPC" value={spc.westernElectric.length === 0 ? "Aucune anomalie" : `${spc.westernElectric.length} alerte(s)`} ok={spc.westernElectric.length === 0} />
                  <Row label="Capabilité (Cpk ≥ 1.33)" value={cap.cpk.toFixed(2)} ok={cap.cpk >= 1.33} warn={cap.cpk >= 1 && cap.cpk < 1.33} />
                  <Row label="MSA (%GRR ≤ 30%)" value={`${msa.grrPct.toFixed(1)}%`} ok={msa.grrPct < 10} warn={msa.grrPct >= 10 && msa.grrPct <= 30} />
                  <Row label="Incertitude" value={(cap.stdLongTerm / Math.sqrt(flatValues.length) * 2).toFixed(4)} ok />
                </tbody>
              </table>
            </div>
            <div className="bg-success/10 border border-success/30 rounded-lg p-3 flex flex-col items-center text-center gap-2">
              <div className="text-xs font-semibold text-success uppercase tracking-wider">Conclusion</div>
              <p className="text-xs text-foreground/80 leading-relaxed">
                Le processus est globalement {isInControl ? "sous contrôle" : "à surveiller"}. La capabilité et le système de mesure peuvent être améliorés pour atteindre les objectifs.
              </p>
              <div className="w-12 h-12 rounded-full bg-success flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-success-foreground" />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppLayout>
  );
};

const Spec = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between border-b border-border/50 py-1.5">
    <span className="text-muted-foreground text-xs">{label}</span>
    <span className="font-semibold text-xs tabular-nums">{value}</span>
  </div>
);

const Stat = ({ label, value, accent }: { label: string; value: string; accent: string }) => {
  const colorMap: Record<string, string> = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  };
  return (
    <div className="bg-secondary/40 rounded-md p-2 border border-border">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className={`text-xl font-bold ${colorMap[accent] || "text-foreground"}`}>{value}</div>
    </div>
  );
};

const Row = ({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) => (
  <tr className="border-b border-border/50">
    <td className="py-2 text-xs">{label}</td>
    <td className="py-2 text-xs tabular-nums">{value}</td>
    <td className="py-2">
      {ok ? (
        <span className="inline-flex items-center gap-1 text-success text-xs font-medium"><CheckCircle2 className="w-3.5 h-3.5" />OK</span>
      ) : warn ? (
        <span className="inline-flex items-center gap-1 text-warning text-xs font-medium"><AlertTriangle className="w-3.5 h-3.5" />À améliorer</span>
      ) : (
        <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium"><AlertTriangle className="w-3.5 h-3.5" />Critique</span>
      )}
    </td>
  </tr>
);

const UncertaintyGauge = ({ value, max }: { value: number; max: number }) => {
  const pct = Math.min(100, (value / max) * 100);
  const angle = -90 + (pct / 100) * 180;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-44 h-24 overflow-hidden">
        <div className="absolute inset-0 rounded-t-full" style={{
          background: "conic-gradient(from 270deg, hsl(var(--success)) 0deg, hsl(var(--warning)) 90deg, hsl(var(--destructive)) 180deg, transparent 180deg)",
        }} />
        <div className="absolute inset-2 rounded-t-full bg-card" />
        <div className="absolute left-1/2 bottom-0 w-1 h-20 bg-foreground origin-bottom rounded-full transition-transform" style={{ transform: `translateX(-50%) rotate(${angle}deg)` }} />
        <div className="absolute left-1/2 bottom-0 w-3 h-3 bg-foreground rounded-full -translate-x-1/2 translate-y-1/2" />
      </div>
      <div className="text-center mt-2">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">U</div>
        <div className="text-2xl font-bold text-orange">{value.toFixed(4)}</div>
        <div className="text-xs text-muted-foreground">mm</div>
      </div>
    </div>
  );
};

export default Dashboard;

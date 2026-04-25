import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { useAppStore } from "@/store/app-store";
import { computeCapability, buildHistogram, normalPdf } from "@/lib/spc-engine";
import { DEMO_SUBGROUPS, DEMO_SPEC } from "@/lib/demo-data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const CapabilityPage = () => {
  const files = useAppStore((s) => s.files);
  const activeFileIndex = useAppStore((s) => s.activeFileIndex);
  const activeSheetIndex = useAppStore((s) => s.activeSheetIndex);
  const sheet = activeFileIndex !== null && activeSheetIndex !== null ? files[activeFileIndex]?.sheets[activeSheetIndex] : null;
  const [selectedCol, setSelectedCol] = useState<string | null>(null);

  const [lsl, setLsl] = useState(DEMO_SPEC.lsl);
  const [usl, setUsl] = useState(DEMO_SPEC.usl);
  const [target, setTarget] = useState(DEMO_SPEC.target);
  const [subSize, setSubSize] = useState(5);

  const values: number[] = useMemo(() => {
    if (sheet && selectedCol) {
      return sheet.rows.map((r) => Number(r[selectedCol])).filter((v) => !isNaN(v));
    }
    return DEMO_SUBGROUPS.flat();
  }, [sheet, selectedCol]);

  const cap = useMemo(() => computeCapability(values, lsl, usl, target, subSize), [values, lsl, usl, target, subSize]);

  const hist = useMemo(() => {
    const h = buildHistogram(values, 25);
    const sigma = cap.stdLongTerm;
    const maxCount = Math.max(...h.map((d) => d.count));
    const maxPdf = normalPdf(cap.mean, cap.mean, sigma);
    return h.map((d) => ({ ...d, pdf: (normalPdf(d.bin, cap.mean, sigma) / maxPdf) * maxCount }));
  }, [values, cap]);

  const StatusIcon = cap.status === "capable" ? CheckCircle2 : cap.status === "improve" ? AlertTriangle : XCircle;
  const statusColor = cap.status === "capable" ? "text-success" : cap.status === "improve" ? "text-warning" : "text-destructive";

  return (
    <AppLayout title="Capabilité Process" subtitle="Cp · Cpk · Pp · Ppk · Cpm">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <SectionCard title="Paramètres">
          {sheet && (
            <div className="mb-4">
              <Label className="text-xs">Colonne de valeurs</Label>
              <select
                value={selectedCol ?? ""}
                onChange={(e) => setSelectedCol(e.target.value || null)}
                className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="">— Démo —</option>
                {sheet.headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-3">
            <div><Label className="text-xs">LSL</Label><Input type="number" step="0.01" value={lsl} onChange={(e) => setLsl(Number(e.target.value))} /></div>
            <div><Label className="text-xs">USL</Label><Input type="number" step="0.01" value={usl} onChange={(e) => setUsl(Number(e.target.value))} /></div>
            <div><Label className="text-xs">Cible</Label><Input type="number" step="0.01" value={target} onChange={(e) => setTarget(Number(e.target.value))} /></div>
            <div><Label className="text-xs">Taille sous-groupe (2-10)</Label><Input type="number" min={2} max={10} value={subSize} onChange={(e) => setSubSize(Number(e.target.value))} /></div>
          </div>
        </SectionCard>

        <SectionCard title="Indicateurs" className="lg:col-span-2">
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
              <ReferenceLine x={lsl.toFixed(2)} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `LSL ${lsl}`, fill: "hsl(var(--destructive))", fontSize: 11, position: "top" }} />
              <ReferenceLine x={usl.toFixed(2)} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `USL ${usl}`, fill: "hsl(var(--destructive))", fontSize: 11, position: "top" }} />
              <ReferenceLine x={target.toFixed(2)} stroke="hsl(var(--success))" strokeDasharray="4 4" label={{ value: `Cible ${target}`, fill: "hsl(var(--success))", fontSize: 11, position: "top" }} />
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

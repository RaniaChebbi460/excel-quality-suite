import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { useAppStore } from "@/store/app-store";
import { computeUncertaintyTypeA, combineUncertainties, UncertaintyComponent } from "@/lib/spc-engine";
import { DEMO_SUBGROUPS } from "@/lib/demo-data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

const UncertaintyPage = () => {
  const sheet = useAppStore(() => appActions.getAnalysisSheet());
  const mapping = useAppStore((s) => s.mapping);
  const [overrideCol, setOverrideCol] = useState<string | null>(null);

  const values = useMemo(() => {
    const col = overrideCol ?? mapping.measureCols[0];
    if (sheet && col) return sheet.rows.map((r) => Number(r[col])).filter((v) => !isNaN(v));
    return DEMO_SUBGROUPS.flat();
  }, [sheet, overrideCol, mapping.measureCols]);

  const [k, setK] = useState(2);
  const [components, setComponents] = useState<UncertaintyComponent[]>([
    { name: "Résolution instrument", type: "B", value: 0.0029, distribution: "uniform" },
    { name: "Étalonnage", type: "B", value: 0.002, distribution: "normal" },
  ]);

  const typeA = useMemo(() => computeUncertaintyTypeA(values), [values]);
  const result = useMemo(() => combineUncertainties(typeA.uA, components, k), [typeA, components, k]);

  const addComponent = () =>
    setComponents([...components, { name: "Nouveau", type: "B", value: 0.001, distribution: "normal" }]);
  const removeComponent = (i: number) => setComponents(components.filter((_, idx) => idx !== i));
  const updateComponent = (i: number, patch: Partial<UncertaintyComponent>) =>
    setComponents(components.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  return (
    <AppLayout title="Incertitude de mesure" subtitle="Type A · Type B · Combinée · Élargie">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <SectionCard title="Incertitude Type A (statistique)">
          {sheet && (
            <div className="mb-3">
              <Label className="text-xs">Colonne</Label>
              <select value={selectedCol ?? ""} onChange={(e) => setSelectedCol(e.target.value || null)} className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm">
                <option value="">— Démo —</option>
                {sheet.headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-2 text-sm">
            <Spec label="N (nombre de mesures)" value={String(typeA.n)} />
            <Spec label="Moyenne" value={typeA.mean.toFixed(4)} />
            <Spec label="Écart-type expérimental (s)" value={typeA.s.toFixed(4)} />
            <Spec label="Incertitude type A (uA = s/√n)" value={typeA.uA.toFixed(5)} highlight />
          </div>
        </SectionCard>

        <SectionCard
          title="Composantes Type B (sources externes)"
          actions={<Button size="sm" variant="outline" onClick={addComponent} className="gap-1.5"><Plus className="w-3.5 h-3.5" />Ajouter</Button>}
        >
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-2 font-medium">Nom</th>
                <th className="text-left py-2 font-medium">Distribution</th>
                <th className="text-right py-2 font-medium">u (std)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {components.map((c, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1.5"><Input value={c.name} onChange={(e) => updateComponent(i, { name: e.target.value })} className="h-7 text-xs" /></td>
                  <td className="py-1.5">
                    <select value={c.distribution} onChange={(e) => updateComponent(i, { distribution: e.target.value as any })} className="h-7 text-xs px-2 rounded-md border border-input bg-background">
                      <option value="normal">Normale</option>
                      <option value="uniform">Uniforme</option>
                      <option value="triangular">Triangulaire</option>
                    </select>
                  </td>
                  <td className="py-1.5"><Input type="number" step="0.0001" value={c.value} onChange={(e) => updateComponent(i, { value: Number(e.target.value) })} className="h-7 text-xs text-right" /></td>
                  <td className="py-1.5"><Button size="sm" variant="ghost" onClick={() => removeComponent(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>

      <SectionCard title="Budget d'incertitude — résultat">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Big label="uA" value={result.uA.toFixed(5)} accent="text-primary" />
          <Big label="uB" value={result.uB.toFixed(5)} accent="text-purple" />
          <Big label="uC (combinée)" value={result.uC.toFixed(5)} accent="text-info" />
          <div className="rounded-lg p-3 border border-border bg-card">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Facteur k</div>
            <Input type="number" step="0.1" value={k} onChange={(e) => setK(Number(e.target.value))} className="mt-1 text-2xl font-bold h-12 px-2" />
          </div>
          <Big label="U élargie" value={result.U.toFixed(5)} accent="text-orange" highlight />
        </div>
        <div className="text-xs text-muted-foreground italic">
          Résultat : valeur mesurée = <span className="font-semibold text-foreground">{typeA.mean.toFixed(4)} ± {result.U.toFixed(5)}</span> (k = {k}, niveau de confiance ≈ 95%)
        </div>
      </SectionCard>
    </AppLayout>
  );
};

const Spec = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex justify-between border-b border-border/50 py-2">
    <span className="text-muted-foreground text-xs">{label}</span>
    <span className={`font-semibold text-sm tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</span>
  </div>
);

const Big = ({ label, value, accent, highlight }: { label: string; value: string; accent: string; highlight?: boolean }) => (
  <div className={`rounded-lg p-3 border ${highlight ? "border-orange/40 bg-orange/5" : "border-border bg-card"}`}>
    <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
    <div className={`text-2xl font-bold ${accent} tabular-nums`}>{value}</div>
  </div>
);

export default UncertaintyPage;

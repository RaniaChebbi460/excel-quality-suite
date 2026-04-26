import { useAppStore, appActions } from "@/store/app-store";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, Trash2 } from "lucide-react";

export const SpecsPanel = ({ compact = false }: { compact?: boolean }) => {
  const specs = useAppStore((s) => s.specs);
  const perColumnSpecs = useAppStore((s) => s.perColumnSpecs);
  const mapping = useAppStore((s) => s.mapping);

  const measureCols = mapping.measureCols;

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Spécifications du projet
        </span>
      }
    >
      <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"} gap-3`}>
        <div>
          <Label className="text-xs">Nom du projet</Label>
          <Input value={specs.projectName} onChange={(e) => appActions.setSpecs({ projectName: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Unité</Label>
          <Input value={specs.unit} onChange={(e) => appActions.setSpecs({ unit: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Taille sous-groupe (n)</Label>
          <Input
            type="number"
            min={2}
            max={10}
            value={specs.subgroupSize}
            onChange={(e) => appActions.setSpecs({ subgroupSize: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs text-destructive">LSL</Label>
          <Input type="number" step="0.001" value={specs.lsl} onChange={(e) => appActions.setSpecs({ lsl: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs text-success">Cible</Label>
          <Input type="number" step="0.001" value={specs.target} onChange={(e) => appActions.setSpecs({ target: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs text-destructive">USL</Label>
          <Input type="number" step="0.001" value={specs.usl} onChange={(e) => appActions.setSpecs({ usl: Number(e.target.value) })} />
        </div>
      </div>

      {measureCols.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Spécifications par colonne de mesure
            </Label>
            <Badge variant="outline">{Object.keys(perColumnSpecs).length} surcharge(s)</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-1.5 px-2">Colonne</th>
                  <th className="text-left py-1.5 px-2">LSL</th>
                  <th className="text-left py-1.5 px-2">Cible</th>
                  <th className="text-left py-1.5 px-2">USL</th>
                  <th className="text-left py-1.5 px-2 w-20">Action</th>
                </tr>
              </thead>
              <tbody>
                {measureCols.map((col) => {
                  const cs = perColumnSpecs[col];
                  const active = !!cs;
                  const v = cs ?? { lsl: specs.lsl, usl: specs.usl, target: specs.target };
                  return (
                    <tr key={col} className={`border-b border-border/50 ${active ? "bg-accent/20" : ""}`}>
                      <td className="px-2 py-1.5 font-medium">{col}</td>
                      <td className="px-2 py-1.5">
                        <Input
                          className="h-8 text-xs"
                          type="number"
                          step="0.001"
                          value={v.lsl}
                          onChange={(e) => appActions.setColumnSpec(col, { lsl: Number(e.target.value), usl: v.usl, target: v.target })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          className="h-8 text-xs"
                          type="number"
                          step="0.001"
                          value={v.target}
                          onChange={(e) => appActions.setColumnSpec(col, { target: Number(e.target.value), usl: v.usl, lsl: v.lsl })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          className="h-8 text-xs"
                          type="number"
                          step="0.001"
                          value={v.usl}
                          onChange={(e) => appActions.setColumnSpec(col, { usl: Number(e.target.value), lsl: v.lsl, target: v.target })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        {active ? (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => appActions.removeColumnSpec(col)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => appActions.setColumnSpec(col, v)}>
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Les colonnes avec spécifications dédiées utilisent leurs propres LSL/USL/Cible pour le calcul de capabilité.
            Les autres utilisent les spécifications globales ci-dessus.
          </p>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Ces paramètres sont appliqués automatiquement à toutes les analyses et rapports. Sauvegardés localement.
      </p>
    </SectionCard>
  );
};

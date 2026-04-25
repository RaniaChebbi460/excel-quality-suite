import { useAppStore, appActions } from "@/store/app-store";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target } from "lucide-react";

export const SpecsPanel = ({ compact = false }: { compact?: boolean }) => {
  const specs = useAppStore((s) => s.specs);

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Spécifications du projet
        </span> as any
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
          <Input
            type="number"
            step="0.001"
            value={specs.lsl}
            onChange={(e) => appActions.setSpecs({ lsl: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs text-success">Cible</Label>
          <Input
            type="number"
            step="0.001"
            value={specs.target}
            onChange={(e) => appActions.setSpecs({ target: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs text-destructive">USL</Label>
          <Input
            type="number"
            step="0.001"
            value={specs.usl}
            onChange={(e) => appActions.setSpecs({ usl: Number(e.target.value) })}
          />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Ces paramètres sont appliqués automatiquement à toutes les analyses de capabilité, SPC et rapports. Ils sont
        sauvegardés localement.
      </p>
    </SectionCard>
  );
};

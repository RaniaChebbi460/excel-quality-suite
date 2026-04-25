import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { ControlChart } from "@/components/charts/ControlChart";
import { useAppStore } from "@/store/app-store";
import { computeXbarR, computeXbarS, computeIMR } from "@/lib/spc-engine";
import { DEMO_SUBGROUPS } from "@/lib/demo-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

const SPCPage = () => {
  const files = useAppStore((s) => s.files);
  const activeFileIndex = useAppStore((s) => s.activeFileIndex);
  const activeSheetIndex = useAppStore((s) => s.activeSheetIndex);
  const sheet = activeFileIndex !== null && activeSheetIndex !== null ? files[activeFileIndex]?.sheets[activeSheetIndex] : null;

  const [selectedCols, setSelectedCols] = useState<string[]>([]);

  const subgroups: number[][] = useMemo(() => {
    if (sheet && selectedCols.length > 0) {
      return sheet.rows
        .map((r) => selectedCols.map((c) => Number(r[c])))
        .filter((row) => row.every((v) => !isNaN(v)));
    }
    return DEMO_SUBGROUPS;
  }, [sheet, selectedCols]);

  const xbarR = useMemo(() => computeXbarR(subgroups), [subgroups]);
  const xbarS = useMemo(() => computeXbarS(subgroups), [subgroups]);
  const imr = useMemo(() => computeIMR(subgroups.flat()), [subgroups]);

  const usingDemo = !sheet || selectedCols.length === 0;

  return (
    <AppLayout title="Cartes SPC" subtitle="Contrôle statistique du procédé">
      {sheet && (
        <SectionCard title="Configuration de l'analyse" className="mb-5">
          <div className="text-sm text-muted-foreground mb-2">Sélectionnez les colonnes de mesures (Mesure1, Mesure2…) :</div>
          <div className="flex flex-wrap gap-2">
            {sheet.headers.map((h) => (
              <button
                key={h}
                onClick={() =>
                  setSelectedCols((prev) => (prev.includes(h) ? prev.filter((c) => c !== h) : [...prev, h]))
                }
                className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                  selectedCols.includes(h)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-accent"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {usingDemo && (
        <div className="mb-5 px-4 py-2 rounded-md bg-info/10 border border-info/30 text-info text-sm">
          📊 Démonstration avec données d'exemple. Importez un fichier Excel via la page <strong>Données</strong> pour analyser vos mesures.
        </div>
      )}

      <Tabs defaultValue="xbar-r">
        <TabsList className="mb-4">
          <TabsTrigger value="xbar-r">X̄ - R</TabsTrigger>
          <TabsTrigger value="xbar-s">X̄ - S</TabsTrigger>
          <TabsTrigger value="i-mr">I-MR</TabsTrigger>
        </TabsList>

        <TabsContent value="xbar-r">
          <SectionCard title="Carte X̄ - R" className="mb-5">
            <div className="text-xs text-muted-foreground font-medium mb-1">Carte X̄ (Moyennes)</div>
            <ControlChart values={xbarR.subgroupMeans} ucl={xbarR.uclX} cl={xbarR.clX} lcl={xbarR.lclX} outOfControl={xbarR.outOfControl} height={250} />
            <div className="text-xs text-muted-foreground font-medium mb-1 mt-3">Carte R (Étendues)</div>
            <ControlChart values={xbarR.subgroupRanges} ucl={xbarR.uclR} cl={xbarR.clR} lcl={xbarR.lclR} color="hsl(var(--info))" height={200} />
          </SectionCard>
          <RulesCard rules={xbarR.westernElectric} ooc={xbarR.outOfControl.length} />
        </TabsContent>

        <TabsContent value="xbar-s">
          <SectionCard title="Carte X̄ - S" className="mb-5">
            <div className="text-xs text-muted-foreground font-medium mb-1">Carte X̄ (Moyennes)</div>
            <ControlChart values={xbarS.subgroupMeans} ucl={xbarS.uclX} cl={xbarS.clX} lcl={xbarS.lclX} outOfControl={xbarS.outOfControl} height={250} />
            <div className="text-xs text-muted-foreground font-medium mb-1 mt-3">Carte S (Écarts-types)</div>
            <ControlChart values={xbarS.subgroupStds} ucl={xbarS.uclS} cl={xbarS.clS} lcl={xbarS.lclS} color="hsl(var(--purple))" height={200} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="i-mr">
          <SectionCard title="Carte Individuals - Moving Range (I-MR)" className="mb-5">
            <div className="text-xs text-muted-foreground font-medium mb-1">Valeurs individuelles (I)</div>
            <ControlChart values={imr.values} ucl={imr.uclI} cl={imr.clI} lcl={imr.lclI} outOfControl={imr.outOfControl} height={250} />
            <div className="text-xs text-muted-foreground font-medium mb-1 mt-3">Étendues mobiles (MR)</div>
            <ControlChart values={imr.movingRanges} ucl={imr.uclMR} cl={imr.clMR} lcl={imr.lclMR} color="hsl(var(--orange))" height={200} />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

const RulesCard = ({ rules, ooc }: { rules: { rule: number; index: number; description: string }[]; ooc: number }) => (
  <SectionCard title="Règles de Western Electric & Anomalies">
    {rules.length === 0 && ooc === 0 ? (
      <div className="flex items-center gap-2 text-success text-sm">
        <CheckCircle2 className="w-5 h-5" />
        Aucune anomalie détectée — le procédé est sous contrôle statistique.
      </div>
    ) : (
      <ul className="space-y-2">
        {rules.map((r, i) => (
          <li key={i} className="flex items-center gap-2 text-sm border-b border-border/50 py-2">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
            <span className="font-medium text-warning">Règle {r.rule}</span>
            <span className="text-muted-foreground">·</span>
            <span>Sous-groupe #{r.index + 1}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{r.description}</span>
          </li>
        ))}
      </ul>
    )}
  </SectionCard>
);

export default SPCPage;

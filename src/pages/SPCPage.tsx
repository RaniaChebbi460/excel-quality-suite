import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { ControlChart } from "@/components/charts/ControlChart";
import { useAppStore, appActions } from "@/store/app-store";
import { computeXbarR, computeXbarS, computeIMR } from "@/lib/spc-engine";
import { DEMO_SUBGROUPS } from "@/lib/demo-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SPCPage = () => {
  const sheet = useAppStore(() => appActions.getAnalysisSheet());
  const mapping = useAppStore((s) => s.mapping);
  const specs = useAppStore((s) => s.specs);

  const subgroups: number[][] = useMemo(() => {
    if (sheet && mapping.measureCols.length > 0) {
      if (mapping.measureCols.length >= 2) {
        return sheet.rows
          .map((r) => mapping.measureCols.map((c) => Number(r[c])))
          .filter((row) => row.every((v) => !isNaN(v)));
      }
      const flat = sheet.rows.map((r) => Number(r[mapping.measureCols[0]])).filter((v) => !isNaN(v));
      const n = Math.max(2, Math.min(10, specs.subgroupSize));
      const groups: number[][] = [];
      for (let i = 0; i + n <= flat.length; i += n) groups.push(flat.slice(i, i + n));
      return groups.length > 0 ? groups : DEMO_SUBGROUPS;
    }
    return DEMO_SUBGROUPS;
  }, [sheet, mapping.measureCols, specs.subgroupSize]);

  const xbarR = useMemo(() => computeXbarR(subgroups), [subgroups]);
  const xbarS = useMemo(() => computeXbarS(subgroups), [subgroups]);
  const imr = useMemo(() => computeIMR(subgroups.flat()), [subgroups]);

  const usingDemo = !sheet || mapping.measureCols.length === 0;

  return (
    <AppLayout title="Cartes SPC" subtitle={`${specs.projectName} · Contrôle statistique du procédé`}>
      {usingDemo && (
        <div className="mb-5 px-4 py-3 rounded-md bg-info/10 border border-info/30 flex items-center justify-between gap-3">
          <div className="text-sm text-info">
            📊 Démonstration. Importez un fichier et configurez le mappage des colonnes pour analyser vos mesures.
          </div>
          <Link to="/data">
            <Button size="sm" className="gap-1.5"><Wand2 className="w-3.5 h-3.5" />Assistant</Button>
          </Link>
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

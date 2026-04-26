import { useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { ControlChart } from "@/components/charts/ControlChart";
import { useAppStore, appActions } from "@/store/app-store";
import { computeXbarR, computeXbarS, computeIMR } from "@/lib/spc-engine";
import { DEMO_SUBGROUPS } from "@/lib/demo-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Wand2, ZoomIn } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type ChartKind = "xbar-r" | "xbar-s" | "i-mr";

const SPCPage = () => {
  const sheet = useAppStore(() => appActions.getAnalysisSheet());
  const mapping = useAppStore((s) => s.mapping);
  const specs = useAppStore((s) => s.specs);

  const [zoomTarget, setZoomTarget] = useState<{ kind: ChartKind; index: number } | null>(null);
  const xbarRef = useRef<HTMLDivElement>(null);

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

  // Build anomalies table from all charts (X̄-R drives WE rules)
  const anomalies = useMemo(() => {
    const list: {
      kind: ChartKind;
      chartLabel: string;
      rule: string;
      ruleNumber: number | null;
      pointIndex: number; // 0-based
      value: number;
      type: "OOC" | "WE";
    }[] = [];
    xbarR.outOfControl.forEach((i) =>
      list.push({
        kind: "xbar-r",
        chartLabel: "X̄ (Moyennes)",
        rule: "Point hors limites de contrôle",
        ruleNumber: null,
        pointIndex: i,
        value: xbarR.subgroupMeans[i],
        type: "OOC",
      })
    );
    xbarR.westernElectric.forEach((r) =>
      list.push({
        kind: "xbar-r",
        chartLabel: "X̄ (Moyennes)",
        rule: r.description,
        ruleNumber: r.rule,
        pointIndex: r.index,
        value: xbarR.subgroupMeans[r.index],
        type: "WE",
      })
    );
    xbarS.outOfControl.forEach((i) =>
      list.push({
        kind: "xbar-s",
        chartLabel: "X̄ (X̄-S)",
        rule: "Point hors limites",
        ruleNumber: null,
        pointIndex: i,
        value: xbarS.subgroupMeans[i],
        type: "OOC",
      })
    );
    imr.outOfControl.forEach((i) =>
      list.push({
        kind: "i-mr",
        chartLabel: "Individuals (I)",
        rule: "Point hors limites",
        ruleNumber: null,
        pointIndex: i,
        value: imr.values[i],
        type: "OOC",
      })
    );
    return list;
  }, [xbarR, xbarS, imr]);

  // For zoom view: subset of subgroupMeans around pointIndex
  const zoomData = useMemo(() => {
    if (!zoomTarget) return null;
    const W = 6; // window before/after
    if (zoomTarget.kind === "xbar-r") {
      const start = Math.max(0, zoomTarget.index - W);
      const end = Math.min(xbarR.subgroupMeans.length, zoomTarget.index + W + 1);
      return {
        values: xbarR.subgroupMeans.slice(start, end),
        ucl: xbarR.uclX,
        cl: xbarR.clX,
        lcl: xbarR.lclX,
        outOfControl: [zoomTarget.index - start],
        startOffset: start,
        chartLabel: "X̄-R · Moyennes",
      };
    }
    if (zoomTarget.kind === "xbar-s") {
      const start = Math.max(0, zoomTarget.index - W);
      const end = Math.min(xbarS.subgroupMeans.length, zoomTarget.index + W + 1);
      return {
        values: xbarS.subgroupMeans.slice(start, end),
        ucl: xbarS.uclX,
        cl: xbarS.clX,
        lcl: xbarS.lclX,
        outOfControl: [zoomTarget.index - start],
        startOffset: start,
        chartLabel: "X̄-S · Moyennes",
      };
    }
    const start = Math.max(0, zoomTarget.index - W);
    const end = Math.min(imr.values.length, zoomTarget.index + W + 1);
    return {
      values: imr.values.slice(start, end),
      ucl: imr.uclI,
      cl: imr.clI,
      lcl: imr.lclI,
      outOfControl: [zoomTarget.index - start],
      startOffset: start,
      chartLabel: "I-MR · Individuals",
    };
  }, [zoomTarget, xbarR, xbarS, imr]);

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
            <div ref={xbarRef}>
              <div className="text-xs text-muted-foreground font-medium mb-1">Carte X̄ (Moyennes)</div>
              <ControlChart values={xbarR.subgroupMeans} ucl={xbarR.uclX} cl={xbarR.clX} lcl={xbarR.lclX} outOfControl={xbarR.outOfControl} height={250} />
              <div className="text-xs text-muted-foreground font-medium mb-1 mt-3">Carte R (Étendues)</div>
              <ControlChart values={xbarR.subgroupRanges} ucl={xbarR.uclR} cl={xbarR.clR} lcl={xbarR.lclR} color="hsl(var(--info))" height={200} />
            </div>
          </SectionCard>
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

      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Anomalies détectées
            <Badge variant="outline">{anomalies.length}</Badge>
          </span>
        }
        className="mb-5"
      >
        {anomalies.length === 0 ? (
          <div className="flex items-center gap-2 text-success text-sm">
            <CheckCircle2 className="w-5 h-5" /> Aucune anomalie — procédé sous contrôle statistique.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-left py-2 px-2">Carte</th>
                  <th className="text-left py-2 px-2">Règle</th>
                  <th className="text-left py-2 px-2">Point</th>
                  <th className="text-right py-2 px-2">Valeur</th>
                  <th className="text-left py-2 px-2 w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-2 py-1.5">
                      <Badge variant="outline" className={a.type === "OOC" ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-warning/10 text-warning border-warning/30"}>
                        {a.type === "OOC" ? "Hors limites" : `Règle WE ${a.ruleNumber ?? ""}`}
                      </Badge>
                    </td>
                    <td className="px-2 py-1.5">{a.chartLabel}</td>
                    <td className="px-2 py-1.5 text-xs text-muted-foreground">{a.rule}</td>
                    <td className="px-2 py-1.5">#{a.pointIndex + 1}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{a.value.toFixed(4)}</td>
                    <td className="px-2 py-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 gap-1"
                        onClick={() => setZoomTarget({ kind: a.kind, index: a.pointIndex })}
                      >
                        <ZoomIn className="w-3 h-3" /> Zoom
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {zoomData && zoomTarget && (
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <ZoomIn className="w-4 h-4 text-primary" />
              Zoom sur le point #{zoomTarget.index + 1} — {zoomData.chartLabel}
            </span>
          }
          actions={
            <Button size="sm" variant="ghost" onClick={() => setZoomTarget(null)}>Fermer</Button>
          }
        >
          <div className="text-xs text-muted-foreground mb-2">
            Fenêtre ±6 sous-groupes autour du point en alerte (indices {zoomData.startOffset + 1} à {zoomData.startOffset + zoomData.values.length}).
          </div>
          <ControlChart
            values={zoomData.values}
            ucl={zoomData.ucl}
            cl={zoomData.cl}
            lcl={zoomData.lcl}
            outOfControl={zoomData.outOfControl}
            height={280}
          />
        </SectionCard>
      )}
    </AppLayout>
  );
};

export default SPCPage;

import { useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore, appActions } from "@/store/app-store";
import {
  computeXbarR,
  computeCapability,
  computeMSA,
  computeUncertaintyTypeA,
  combineUncertainties,
  buildHistogram,
  normalPdf,
  MSAEntry,
} from "@/lib/spc-engine";
import { DEMO_SUBGROUPS, DEMO_MSA } from "@/lib/demo-data";
import { downloadXLSX } from "@/lib/excel";
import { ControlChart } from "@/components/charts/ControlChart";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

type ReportSection = "spc" | "capability" | "msa" | "uncertainty";

const ReportsPage = () => {
  const specs = useAppStore((s) => s.specs);
  const mapping = useAppStore((s) => s.mapping);
  const sheet = useAppStore(() => appActions.getAnalysisSheet());
  const filesCount = useAppStore((s) => s.files.length);

  const [selected, setSelected] = useState<Record<ReportSection, boolean>>({
    spc: true,
    capability: true,
    msa: true,
    uncertainty: true,
  });
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);

  // refs for chart capture
  const xbarChartRef = useRef<HTMLDivElement>(null);
  const rChartRef = useRef<HTMLDivElement>(null);
  const histRef = useRef<HTMLDivElement>(null);
  const msaPieRef = useRef<HTMLDivElement>(null);

  // ===== Build datasets (live) =====
  const subgroups = useMemo<number[][]>(() => {
    if (sheet && mapping.measureCols.length > 0) {
      if (mapping.measureCols.length >= 2) {
        const g = sheet.rows
          .map((r) => mapping.measureCols.map((c) => Number(r[c])))
          .filter((row) => row.every((v) => !isNaN(v)));
        if (g.length) return g;
      } else {
        const flat = sheet.rows.map((r) => Number(r[mapping.measureCols[0]])).filter((v) => !isNaN(v));
        const n = Math.max(2, Math.min(10, specs.subgroupSize));
        const groups: number[][] = [];
        for (let i = 0; i + n <= flat.length; i += n) groups.push(flat.slice(i, i + n));
        if (groups.length) return groups;
      }
    }
    return DEMO_SUBGROUPS;
  }, [sheet, mapping.measureCols, specs.subgroupSize]);

  const flatValues = useMemo(() => subgroups.flat(), [subgroups]);
  const spc = useMemo(() => computeXbarR(subgroups), [subgroups]);
  const cap = useMemo(
    () => computeCapability(flatValues, specs.lsl, specs.usl, specs.target, specs.subgroupSize),
    [flatValues, specs]
  );

  const msaEntries = useMemo<MSAEntry[]>(() => {
    if (sheet && mapping.partCol && mapping.operatorCol && mapping.valueCol) {
      const e = sheet.rows
        .map((r, i) => ({
          part: r[mapping.partCol!] ?? "",
          operator: r[mapping.operatorCol!] ?? "",
          trial: mapping.trialCol ? Number(r[mapping.trialCol]) : i,
          value: Number(r[mapping.valueCol!]),
        }))
        .filter((x) => x.part !== "" && x.operator !== "" && !isNaN(x.value));
      if (e.length) return e;
    }
    return DEMO_MSA;
  }, [sheet, mapping]);

  const msa = useMemo(() => computeMSA(msaEntries), [msaEntries]);
  const typeA = useMemo(() => computeUncertaintyTypeA(flatValues), [flatValues]);
  const uncertainty = useMemo(
    () =>
      combineUncertainties(typeA.uA, [
        { name: "Résolution instrument", type: "B", value: 0.0029 },
        { name: "Étalonnage", type: "B", value: 0.002 },
      ]),
    [typeA]
  );

  const hist = useMemo(() => {
    const h = buildHistogram(flatValues, 22);
    const sigma = cap.stdLongTerm || 0.001;
    const maxCount = Math.max(...h.map((d) => d.count), 1);
    const maxPdf = normalPdf(cap.mean, cap.mean, sigma);
    return h.map((d) => ({
      ...d,
      pdf: maxPdf > 0 ? (normalPdf(d.bin, cap.mean, sigma) / maxPdf) * maxCount : 0,
    }));
  }, [flatValues, cap]);

  const msaPie = [
    { name: `EV ${msa.evPct.toFixed(1)}%`, value: msa.evPct, color: "#2563eb" },
    { name: `AV ${msa.avPct.toFixed(1)}%`, value: msa.avPct, color: "#9333ea" },
    { name: `PV ${msa.pvPct.toFixed(1)}%`, value: msa.pvPct, color: "#16a34a" },
  ];

  const toggle = (k: ReportSection) => setSelected((s) => ({ ...s, [k]: !s[k] }));

  const captureNode = async (node: HTMLDivElement | null): Promise<string | null> => {
    if (!node) return null;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(node, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
      });
      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("Chart capture failed", err);
      return null;
    }
  };

  // ===== PDF Export =====
  const exportPdf = async () => {
    setBusy("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();

      // Cover
      doc.setFontSize(20);
      doc.setTextColor(37, 99, 235);
      doc.text("Rapport SPC / MSA / Capabilité", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(80);
      doc.text(`Projet : ${specs.projectName}`, 14, 32);
      doc.text(`Généré le ${new Date().toLocaleString()}`, 14, 38);
      doc.text(`Spécifications : LSL=${specs.lsl} · Target=${specs.target} · USL=${specs.usl} · Unité ${specs.unit}`, 14, 44);
      doc.setTextColor(0);

      let y = 54;
      const sectionsList = [
        selected.spc && "SPC (X̄-R)",
        selected.capability && "Capabilité (Cp/Cpk/Pp/Ppk)",
        selected.msa && "MSA (Gage R&R)",
        selected.uncertainty && "Incertitude de mesure",
      ].filter(Boolean);

      autoTable(doc, {
        startY: y,
        head: [["Sections incluses dans le rapport"]],
        body: sectionsList.map((s) => [s as string]),
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235] },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ===== SPC =====
      if (selected.spc) {
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(37, 99, 235);
        doc.text("1. Contrôle statistique du procédé (SPC)", 14, 18);
        doc.setTextColor(0);
        autoTable(doc, {
          startY: 24,
          head: [["Paramètre", "Valeur"]],
          body: [
            ["Nombre de sous-groupes", String(subgroups.length)],
            ["Taille de sous-groupe (n)", String(spc.n)],
            ["Moyenne X̄", spc.xbar.toFixed(4)],
            ["R̄", spc.rbar.toFixed(4)],
            ["UCL X̄", spc.uclX.toFixed(4)],
            ["LCL X̄", spc.lclX.toFixed(4)],
            ["UCL R", spc.uclR.toFixed(4)],
            ["LCL R", spc.lclR.toFixed(4)],
            ["σ̂ (court terme)", spc.sigmaHat.toFixed(4)],
            ["Points hors contrôle", String(spc.outOfControl.length)],
            ["Règles Western Electric déclenchées", String(spc.westernElectric.length)],
          ],
          theme: "grid",
          headStyles: { fillColor: [37, 99, 235] },
        });
        let cy = (doc as any).lastAutoTable.finalY + 6;
        const xbarImg = await captureNode(xbarChartRef.current);
        if (xbarImg) {
          doc.addImage(xbarImg, "PNG", 14, cy, pageW - 28, 70);
          cy += 74;
        }
        const rImg = await captureNode(rChartRef.current);
        if (rImg) {
          doc.addImage(rImg, "PNG", 14, cy, pageW - 28, 60);
        }
      }

      // ===== Capability =====
      if (selected.capability) {
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(37, 99, 235);
        doc.text("2. Capabilité du processus", 14, 18);
        doc.setTextColor(0);
        autoTable(doc, {
          startY: 24,
          head: [["Indice", "Valeur", "Statut"]],
          body: [
            ["Cp", cap.cp.toFixed(3), cap.cp >= 1.33 ? "Capable" : cap.cp >= 1 ? "À améliorer" : "Non capable"],
            ["Cpk", cap.cpk.toFixed(3), cap.cpk >= 1.33 ? "Capable" : cap.cpk >= 1 ? "À améliorer" : "Non capable"],
            ["Pp", cap.pp.toFixed(3), "-"],
            ["Ppk", cap.ppk.toFixed(3), cap.ppk >= 1.33 ? "Capable" : cap.ppk >= 1 ? "À améliorer" : "Non capable"],
            ["Cpm", cap.cpm?.toFixed(3) ?? "-", "-"],
            ["Moyenne", cap.mean.toFixed(4), "-"],
            ["σ court terme", cap.stdShortTerm.toFixed(4), "-"],
            ["σ long terme", cap.stdLongTerm.toFixed(4), "-"],
          ],
          theme: "striped",
          headStyles: { fillColor: [37, 99, 235] },
        });
        const histImg = await captureNode(histRef.current);
        if (histImg) {
          const cy = (doc as any).lastAutoTable.finalY + 6;
          doc.addImage(histImg, "PNG", 14, cy, pageW - 28, 80);
        }
        doc.setFontSize(10);
        doc.setTextColor(60);
        doc.text(`Interprétation : ${cap.interpretation}`, 14, 270);
        doc.setTextColor(0);
      }

      // ===== MSA =====
      if (selected.msa) {
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(37, 99, 235);
        doc.text("3. MSA — Gage R&R", 14, 18);
        doc.setTextColor(0);
        autoTable(doc, {
          startY: 24,
          head: [["Source", "Écart-type", "% Contribution", "% Study Var"]],
          body: [
            ["Répétabilité (EV)", msa.ev.toFixed(4), msa.evContrib.toFixed(2) + "%", msa.evPct.toFixed(2) + "%"],
            ["Reproductibilité (AV)", msa.av.toFixed(4), msa.avContrib.toFixed(2) + "%", msa.avPct.toFixed(2) + "%"],
            ["R&R (GRR)", msa.grr.toFixed(4), msa.grrContrib.toFixed(2) + "%", msa.grrPct.toFixed(2) + "%"],
            ["Pièce à pièce (PV)", msa.pv.toFixed(4), msa.pvContrib.toFixed(2) + "%", msa.pvPct.toFixed(2) + "%"],
            ["Total Variation (TV)", msa.tv.toFixed(4), "100%", "100%"],
          ],
          theme: "grid",
          headStyles: { fillColor: [37, 99, 235] },
        });
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 4,
          body: [
            ["Pièces", String(msa.parts)],
            ["Opérateurs", String(msa.operators)],
            ["Essais", String(msa.trials)],
            ["ndc (catégories distinctes)", String(msa.ndc)],
            ["%GRR", msa.grrPct.toFixed(2) + "%"],
            ["Statut", msa.interpretation],
          ],
          theme: "plain",
          styles: { fontSize: 9 },
        });
        const pieImg = await captureNode(msaPieRef.current);
        if (pieImg) {
          const cy = (doc as any).lastAutoTable.finalY + 6;
          doc.addImage(pieImg, "PNG", 30, cy, 150, 70);
        }
      }

      // ===== Uncertainty =====
      if (selected.uncertainty) {
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(37, 99, 235);
        doc.text("4. Incertitude de mesure", 14, 18);
        doc.setTextColor(0);
        autoTable(doc, {
          startY: 24,
          head: [["Composante", "Valeur"]],
          body: [
            ["N (mesures)", String(typeA.n)],
            ["Moyenne", typeA.mean.toFixed(4)],
            ["Écart-type s", typeA.s.toFixed(5)],
            ["uA (Type A)", uncertainty.uA.toFixed(5)],
            ["uB (Type B)", uncertainty.uB.toFixed(5)],
            ["uC (combinée)", uncertainty.uC.toFixed(5)],
            ["Facteur k", String(uncertainty.k)],
            ["U (élargie)", uncertainty.U.toFixed(5)],
            ["Résultat", `${typeA.mean.toFixed(4)} ± ${uncertainty.U.toFixed(5)} ${specs.unit}`],
          ],
          theme: "grid",
          headStyles: { fillColor: [37, 99, 235] },
        });
      }

      doc.save(`rapport_${specs.projectName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Rapport PDF généré");
    } catch (err: any) {
      toast.error("Erreur PDF", { description: err.message });
    } finally {
      setBusy(null);
    }
  };

  // ===== Excel Export =====
  const exportXlsx = async () => {
    setBusy("xlsx");
    try {
      const sheets: { name: string; rows: any[][] }[] = [];

      sheets.push({
        name: "Synthèse",
        rows: [
          ["Rapport SPC / MSA / Capabilité"],
          ["Projet", specs.projectName],
          ["Généré le", new Date().toLocaleString()],
          ["Unité", specs.unit],
          ["LSL", specs.lsl],
          ["Target", specs.target],
          ["USL", specs.usl],
          ["Taille sous-groupe", specs.subgroupSize],
          [],
          ["Sections incluses"],
          ...Object.entries(selected).filter(([, v]) => v).map(([k]) => [k]),
        ],
      });

      if (selected.spc) {
        sheets.push({
          name: "SPC - Données",
          rows: [
            ["Sous-groupe", ...Array.from({ length: spc.n }, (_, i) => `Mesure ${i + 1}`), "Moyenne", "Étendue"],
            ...subgroups.map((g, i) => [i + 1, ...g, spc.subgroupMeans[i], spc.subgroupRanges[i]]),
          ],
        });
        sheets.push({
          name: "SPC - Limites",
          rows: [
            ["Paramètre", "Valeur"],
            ["X̄ global", spc.xbar],
            ["R̄", spc.rbar],
            ["UCL X̄", spc.uclX],
            ["CL X̄", spc.clX],
            ["LCL X̄", spc.lclX],
            ["UCL R", spc.uclR],
            ["CL R", spc.clR],
            ["LCL R", spc.lclR],
            ["Sigma estimé", spc.sigmaHat],
            ["Points hors contrôle", spc.outOfControl.length],
            [],
            ["Règles Western Electric"],
            ["Règle", "Sous-groupe", "Description"],
            ...spc.westernElectric.map((r) => [r.rule, r.index + 1, r.description]),
          ],
        });
      }

      if (selected.capability) {
        sheets.push({
          name: "Capabilité",
          rows: [
            ["Indice", "Valeur"],
            ["Cp", cap.cp],
            ["Cpk", cap.cpk],
            ["Pp", cap.pp],
            ["Ppk", cap.ppk],
            ["Cpm", cap.cpm ?? ""],
            ["Moyenne", cap.mean],
            ["Sigma court terme", cap.stdShortTerm],
            ["Sigma long terme", cap.stdLongTerm],
            ["LSL", cap.lsl],
            ["USL", cap.usl],
            ["Target", cap.target ?? ""],
            ["Statut", cap.interpretation],
            [],
            ["Histogramme"],
            ["Bin centre", "Effectif", "Densité normale"],
            ...hist.map((h) => [h.bin, h.count, h.pdf]),
          ],
        });
      }

      if (selected.msa) {
        sheets.push({
          name: "MSA",
          rows: [
            ["Source", "Écart-type", "% Contribution", "% Study Var"],
            ["EV", msa.ev, msa.evContrib, msa.evPct],
            ["AV", msa.av, msa.avContrib, msa.avPct],
            ["GRR", msa.grr, msa.grrContrib, msa.grrPct],
            ["PV", msa.pv, msa.pvContrib, msa.pvPct],
            ["TV", msa.tv, 100, 100],
            [],
            ["Pièces", msa.parts],
            ["Opérateurs", msa.operators],
            ["Essais", msa.trials],
            ["ndc", msa.ndc],
            ["%GRR", msa.grrPct],
            ["Statut", msa.interpretation],
          ],
        });
      }

      if (selected.uncertainty) {
        sheets.push({
          name: "Incertitude",
          rows: [
            ["Composante", "Valeur"],
            ["N", typeA.n],
            ["Moyenne", typeA.mean],
            ["s", typeA.s],
            ["uA", uncertainty.uA],
            ["uB", uncertainty.uB],
            ["uC", uncertainty.uC],
            ["k", uncertainty.k],
            ["U (élargie)", uncertainty.U],
            ["Résultat", `${typeA.mean.toFixed(4)} ± ${uncertainty.U.toFixed(5)} ${specs.unit}`],
          ],
        });
      }

      downloadXLSX(`rapport_${specs.projectName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`, sheets);
      toast.success("Export Excel multi-feuilles généré");
    } catch (err: any) {
      toast.error("Erreur Excel", { description: err.message });
    } finally {
      setBusy(null);
    }
  };

  const sectionDefs: { key: ReportSection; label: string; desc: string }[] = [
    { key: "spc", label: "SPC", desc: "Cartes de contrôle X̄-R, limites, règles Western Electric" },
    { key: "capability", label: "Capabilité", desc: "Cp, Cpk, Pp, Ppk, Cpm, histogramme + courbe normale" },
    { key: "msa", label: "MSA (R&R)", desc: "Répétabilité, reproductibilité, %GRR, ndc" },
    { key: "uncertainty", label: "Incertitude", desc: "Type A + Type B, combinée, élargie (U)" },
  ];

  const anySelected = Object.values(selected).some(Boolean);

  return (
    <AppLayout title="Rapports" subtitle={`${specs.projectName} · Génération PDF & Excel multi-feuilles`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <SectionCard title="1. Sélection des sections" className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sectionDefs.map((s) => (
              <label
                key={s.key}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected[s.key] ? "border-primary bg-accent/30" : "border-border hover:bg-accent/10"
                }`}
              >
                <Checkbox checked={selected[s.key]} onCheckedChange={() => toggle(s.key)} className="mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">{s.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="2. Génération">
          <div className="space-y-3">
            <Button
              onClick={exportPdf}
              disabled={!anySelected || busy !== null}
              className="w-full gap-2"
              size="lg"
            >
              {busy === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Générer le PDF
            </Button>
            <Button
              onClick={exportXlsx}
              disabled={!anySelected || busy !== null}
              variant="outline"
              className="w-full gap-2"
              size="lg"
            >
              {busy === "xlsx" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Exporter en Excel
            </Button>
            <div className="text-xs text-muted-foreground pt-2 border-t border-border">
              Source : <strong className="text-foreground">{filesCount > 0 ? `${filesCount} fichier(s) importé(s)` : "Données de démonstration"}</strong>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Live preview / capture canvas */}
      <SectionCard title="3. Aperçu des graphiques inclus">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {selected.spc && (
            <>
              <div ref={xbarChartRef} className="bg-card p-3 rounded-lg border border-border">
                <div className="text-xs font-medium text-muted-foreground mb-1">Carte X̄</div>
                <ControlChart values={spc.subgroupMeans} ucl={spc.uclX} cl={spc.clX} lcl={spc.lclX} outOfControl={spc.outOfControl} height={200} />
              </div>
              <div ref={rChartRef} className="bg-card p-3 rounded-lg border border-border">
                <div className="text-xs font-medium text-muted-foreground mb-1">Carte R</div>
                <ControlChart values={spc.subgroupRanges} ucl={spc.uclR} cl={spc.clR} lcl={spc.lclR} color="hsl(var(--info))" height={200} />
              </div>
            </>
          )}
          {selected.capability && (
            <div ref={histRef} className="bg-card p-3 rounded-lg border border-border lg:col-span-2">
              <div className="text-xs font-medium text-muted-foreground mb-1">Histogramme + courbe normale</div>
              <div className="h-64">
                <ResponsiveContainer>
                  <ComposedChart data={hist} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                    <ReferenceLine x={specs.lsl.toFixed(2)} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `LSL`, fill: "hsl(var(--destructive))", fontSize: 10 }} />
                    <ReferenceLine x={specs.usl.toFixed(2)} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `USL`, fill: "hsl(var(--destructive))", fontSize: 10 }} />
                    <ReferenceLine x={specs.target.toFixed(2)} stroke="hsl(var(--success))" strokeDasharray="4 4" label={{ value: `Cible`, fill: "hsl(var(--success))", fontSize: 10 }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" opacity={0.7} radius={[2, 2, 0, 0]} />
                    <Line type="monotone" dataKey="pdf" stroke="hsl(var(--purple))" strokeWidth={2.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {selected.msa && (
            <div ref={msaPieRef} className="bg-card p-3 rounded-lg border border-border lg:col-span-2">
              <div className="text-xs font-medium text-muted-foreground mb-1">Décomposition de la variation (MSA)</div>
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={msaPie} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                      {msaPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {selected.uncertainty && (
            <div className="bg-card p-3 rounded-lg border border-border lg:col-span-2 text-sm">
              <div className="text-xs font-medium text-muted-foreground mb-2">Budget d'incertitude</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Mini label="uA" v={uncertainty.uA.toFixed(5)} />
                <Mini label="uB" v={uncertainty.uB.toFixed(5)} />
                <Mini label="uC" v={uncertainty.uC.toFixed(5)} />
                <Mini label="k" v={String(uncertainty.k)} />
                <Mini label="U élargie" v={uncertainty.U.toFixed(5)} highlight />
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </AppLayout>
  );
};

const Mini = ({ label, v, highlight }: { label: string; v: string; highlight?: boolean }) => (
  <div className={`rounded-md p-2 border ${highlight ? "border-orange/40 bg-orange/5" : "border-border bg-card"}`}>
    <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
    <div className={`text-xl font-bold tabular-nums ${highlight ? "text-orange" : "text-primary"}`}>{v}</div>
  </div>
);

export default ReportsPage;

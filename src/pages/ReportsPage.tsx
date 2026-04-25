import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { computeXbarR, computeCapability, computeMSA } from "@/lib/spc-engine";
import { DEMO_SUBGROUPS, DEMO_SPEC, DEMO_MSA } from "@/lib/demo-data";
import { downloadCSV, downloadXLSX } from "@/lib/excel";
import { FileText, FileSpreadsheet, FileDown } from "lucide-react";
import { toast } from "sonner";

const ReportsPage = () => {
  const files = useAppStore((s) => s.files);

  const subgroups = DEMO_SUBGROUPS;
  const spc = useMemo(() => computeXbarR(subgroups), [subgroups]);
  const cap = useMemo(() => computeCapability(subgroups.flat(), DEMO_SPEC.lsl, DEMO_SPEC.usl, DEMO_SPEC.target, 5), [subgroups]);
  const msa = useMemo(() => computeMSA(DEMO_MSA), []);

  const exportCsv = () => {
    const rows: any[][] = [
      ["Rapport SPC / MSA / Capabilité"],
      ["Généré le", new Date().toLocaleString()],
      [],
      ["=== SPC ==="],
      ["Sous-groupe", "Moyenne", "Étendue"],
      ...spc.subgroupMeans.map((m, i) => [i + 1, m.toFixed(4), spc.subgroupRanges[i].toFixed(4)]),
      [],
      ["=== Capabilité ==="],
      ["Cp", cap.cp.toFixed(3)],
      ["Cpk", cap.cpk.toFixed(3)],
      ["Pp", cap.pp.toFixed(3)],
      ["Ppk", cap.ppk.toFixed(3)],
      [],
      ["=== MSA ==="],
      ["EV", msa.ev.toFixed(4)],
      ["AV", msa.av.toFixed(4)],
      ["GRR", msa.grr.toFixed(4)],
      ["%GRR", msa.grrPct.toFixed(2) + "%"],
      ["ndc", msa.ndc],
    ];
    downloadCSV("rapport_spc_msa.csv", rows);
    toast.success("Export CSV terminé");
  };

  const exportXlsx = () => {
    downloadXLSX("rapport_spc_msa.xlsx", [
      {
        name: "SPC",
        rows: [
          ["Sous-groupe", "Moyenne", "Étendue"],
          ...spc.subgroupMeans.map((m, i) => [i + 1, m, spc.subgroupRanges[i]]),
          [],
          ["UCL X̄", spc.uclX], ["CL X̄", spc.clX], ["LCL X̄", spc.lclX],
          ["UCL R", spc.uclR], ["CL R", spc.clR], ["LCL R", spc.lclR],
        ],
      },
      {
        name: "Capabilité",
        rows: [
          ["Indice", "Valeur"],
          ["Cp", cap.cp], ["Cpk", cap.cpk], ["Pp", cap.pp], ["Ppk", cap.ppk],
          ["Moyenne", cap.mean], ["Sigma court", cap.stdShortTerm], ["Sigma long", cap.stdLongTerm],
        ],
      },
      {
        name: "MSA",
        rows: [
          ["Source", "Std", "% Contrib", "% Study"],
          ["EV", msa.ev, msa.evContrib, msa.evPct],
          ["AV", msa.av, msa.avContrib, msa.avPct],
          ["GRR", msa.grr, msa.grrContrib, msa.grrPct],
          ["PV", msa.pv, msa.pvContrib, msa.pvPct],
          ["TV", msa.tv, 100, 100],
          [],
          ["ndc", msa.ndc],
        ],
      },
    ]);
    toast.success("Export Excel terminé");
  };

  const exportPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Rapport SPC / MSA / Capabilité", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Généré le ${new Date().toLocaleString()}`, 14, 25);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 35,
      head: [["Indicateur", "Valeur", "Statut"]],
      body: [
        ["Cp", cap.cp.toFixed(3), cap.cp >= 1.33 ? "OK" : "À améliorer"],
        ["Cpk", cap.cpk.toFixed(3), cap.cpk >= 1.33 ? "OK" : "À améliorer"],
        ["Pp", cap.pp.toFixed(3), "-"],
        ["Ppk", cap.ppk.toFixed(3), "-"],
        ["%GRR", msa.grrPct.toFixed(2) + "%", msa.grrPct < 10 ? "Excellent" : msa.grrPct <= 30 ? "Acceptable" : "À améliorer"],
        ["ndc", String(msa.ndc), msa.ndc >= 5 ? "OK" : "Insuffisant"],
        ["Points hors contrôle", String(spc.outOfControl.length), spc.outOfControl.length === 0 ? "OK" : "Alerte"],
      ],
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save("rapport_spc_msa.pdf");
    toast.success("Export PDF terminé");
  };

  return (
    <AppLayout title="Rapports" subtitle="Exporter les analyses">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <button onClick={exportPdf} className="text-left bg-card hover:bg-accent/30 border border-border rounded-xl p-5 shadow-card transition-all hover:shadow-elegant">
          <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 text-destructive" />
          </div>
          <div className="font-semibold">Rapport PDF</div>
          <div className="text-xs text-muted-foreground mt-1">Synthèse complète SPC, capabilité, MSA</div>
        </button>

        <button onClick={exportXlsx} className="text-left bg-card hover:bg-accent/30 border border-border rounded-xl p-5 shadow-card transition-all hover:shadow-elegant">
          <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center mb-3">
            <FileSpreadsheet className="w-6 h-6 text-success" />
          </div>
          <div className="font-semibold">Export Excel</div>
          <div className="text-xs text-muted-foreground mt-1">Données brutes + résultats par feuille</div>
        </button>

        <button onClick={exportCsv} className="text-left bg-card hover:bg-accent/30 border border-border rounded-xl p-5 shadow-card transition-all hover:shadow-elegant">
          <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center mb-3">
            <FileDown className="w-6 h-6 text-info" />
          </div>
          <div className="font-semibold">Export CSV</div>
          <div className="text-xs text-muted-foreground mt-1">Format universel, compatible tous outils</div>
        </button>
      </div>

      <SectionCard title="Aperçu des résultats">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Stat label="Cp" v={cap.cp} />
          <Stat label="Cpk" v={cap.cpk} />
          <Stat label="Ppk" v={cap.ppk} />
          <Stat label="%GRR" v={msa.grrPct} suffix="%" />
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          Fichiers importés : <strong className="text-foreground">{files.length}</strong>
        </div>
      </SectionCard>
    </AppLayout>
  );
};

const Stat = ({ label, v, suffix }: { label: string; v: number; suffix?: string }) => (
  <div className="bg-secondary/40 rounded-md p-3 border border-border">
    <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
    <div className="text-2xl font-bold text-primary tabular-nums">{v.toFixed(2)}{suffix}</div>
  </div>
);

export default ReportsPage;

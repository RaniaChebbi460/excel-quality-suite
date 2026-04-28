import { useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";
import { useAppStore, appActions } from "@/store/app-store";
import { parseExcelFile } from "@/lib/excel";
import { Upload, FileSpreadsheet, Trash2, Eye, Wand2, Layers, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { MappingWizard } from "@/components/wizard/MappingWizard";
import { SpecsPanel } from "@/components/specs/SpecsPanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DataPage = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const files = useAppStore((s) => s.files);
  const activeFileIndex = useAppStore((s) => s.activeFileIndex);
  const activeSheetIndex = useAppStore((s) => s.activeSheetIndex);
  const mergedSheet = useAppStore((s) => s.mergedSheet);
  const mapping = useAppStore((s) => s.mapping);
  const [showMerged, setShowMerged] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const activeFile = activeFileIndex !== null ? files[activeFileIndex] : null;
  const activeSheet = activeFile && activeSheetIndex !== null ? activeFile.sheets[activeSheetIndex] : null;
  const displaySheet = showMerged && mergedSheet ? mergedSheet : activeSheet;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    let imported = 0;
    for (const f of Array.from(list)) {
      try {
        const parsed = await parseExcelFile(f);
        appActions.addFile(parsed);
        imported++;
      } catch (err: any) {
        toast.error("Erreur d'import", { description: err.message });
      }
    }
    if (imported > 0) {
      const det = (appActions as any)._lastDetection as
        | { spc: any; msa: any; unknown: boolean }
        | undefined;
      const parts: string[] = [];
      if (det?.spc) parts.push(`SPC : ${det.spc.measures} colonne(s) de mesure`);
      if (det?.msa) parts.push(`MSA : Pièce/Opérateur détectés`);
      const desc = parts.length
        ? `Mappage automatique appliqué — ${parts.join(" · ")}. Calculs prêts.`
        : "Aucune structure SPC/MSA reconnue — utilisez l'assistant de mappage.";
      if (parts.length) {
        toast.success(`${imported} fichier(s) importé(s)`, { description: desc });
      } else {
        toast.warning(`${imported} fichier(s) importé(s)`, { description: desc });
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <AppLayout title="Données" subtitle="Importation, fusion et configuration des fichiers Excel">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <SectionCard title="Importer un ou plusieurs fichiers" className="lg:col-span-2">
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary hover:bg-accent/30 transition-colors"
          >
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <div className="font-semibold text-foreground">Glisser-déposer ou cliquer pour importer</div>
            <div className="text-sm text-muted-foreground mt-1">
              Formats : .xlsx, .xls, .csv · Sélection multiple supportée
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={() => setWizardOpen(true)} variant="default" size="sm" className="gap-2">
              <Wand2 className="w-3.5 h-3.5" />
              Assistant de mappage
            </Button>
            {files.length > 1 && (
              <Button
                variant={showMerged ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMerged((v) => !v)}
                className="gap-2"
              >
                <Layers className="w-3.5 h-3.5" />
                {showMerged ? "Vue : fusion globale" : "Voir la fusion globale"}
              </Button>
            )}
            {mapping.validated && (
              <span className="inline-flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="w-3.5 h-3.5" /> Mappage validé
              </span>
            )}
          </div>
          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <p><strong>SPC :</strong> Sous-groupe | Mesure1 | Mesure2 | …</p>
            <p><strong>MSA :</strong> Pièce | Opérateur | Essai | Valeur</p>
            <p><strong>Capabilité :</strong> Valeur (une colonne)</p>
          </div>
        </SectionCard>

        <SectionCard title={`Fichiers (${files.length})`}>
          {files.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">Aucun fichier importé</div>
          ) : (
            <ul className="space-y-2">
              {files.map((f, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-2 p-2 rounded-md border ${i === activeFileIndex ? "border-primary bg-accent/30" : "border-border"}`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{f.sheets.length} feuille(s)</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { appActions.setActiveFile(i); setShowMerged(false); }} title="Ouvrir">
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => appActions.removeFile(i)} title="Supprimer">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {files.length > 1 && mergedSheet && (
            <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
              <Layers className="w-3.5 h-3.5 inline-block mr-1 text-primary" />
              Fusion auto : <strong className="text-foreground">{mergedSheet.rows.length}</strong> lignes ·{" "}
              <strong className="text-foreground">{mergedSheet.headers.length}</strong> colonnes uniques.
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mb-5">
        <SpecsPanel />
      </div>

      {displaySheet && (
        <SectionCard
          title={
            showMerged && mergedSheet
              ? `Fusion globale (${files.length} fichiers)`
              : `Prévisualisation : ${activeFile?.name}`
          }
          actions={
            !showMerged && activeFile ? (
              <Select value={String(activeSheetIndex)} onValueChange={(v) => appActions.setActiveSheet(Number(v))}>
                <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activeFile.sheets.map((s, i) => (
                    <SelectItem key={i} value={String(i)}>{s.name} ({s.rows.length} lignes)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null
          }
        >
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="text-muted-foreground border-b border-border">
                  <th className="px-3 py-2 text-left font-medium w-12">#</th>
                  {displaySheet.headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displaySheet.rows.slice(0, 200).map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                    {displaySheet.headers.map((h, j) => (
                      <td key={j} className="px-3 py-1.5 tabular-nums">{r[h] ?? "-"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {displaySheet.rows.length > 200 && (
              <div className="text-xs text-muted-foreground text-center py-3">
                Affichage des 200 premières lignes sur {displaySheet.rows.length}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      <MappingWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </AppLayout>
  );
};

export default DataPage;

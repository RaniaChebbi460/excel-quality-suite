import { useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";
import { useAppStore, appActions } from "@/store/app-store";
import { parseExcelFile } from "@/lib/excel";
import { Upload, FileSpreadsheet, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
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
  const activeFile = activeFileIndex !== null ? files[activeFileIndex] : null;
  const activeSheet = activeFile && activeSheetIndex !== null ? activeFile.sheets[activeSheetIndex] : null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    for (const f of Array.from(list)) {
      try {
        const parsed = await parseExcelFile(f);
        appActions.addFile(parsed);
        toast.success(`Fichier importé : ${f.name}`, {
          description: `${parsed.sheets.length} feuille(s) détectée(s)`,
        });
      } catch (err: any) {
        toast.error("Erreur d'import", { description: err.message });
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <AppLayout title="Données" subtitle="Importation et gestion des fichiers Excel">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <SectionCard title="Importer un fichier" className="lg:col-span-2">
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary hover:bg-accent/30 transition-colors"
          >
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <div className="font-semibold text-foreground">Glisser-déposer ou cliquer pour importer</div>
            <div className="text-sm text-muted-foreground mt-1">Formats supportés : .xlsx, .xls, .csv</div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
          </div>
          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <p><strong>SPC :</strong> Sous-groupe | Mesure1 | Mesure2 | …</p>
            <p><strong>MSA :</strong> Pièce | Opérateur | Essai | Valeur</p>
            <p><strong>Capabilité :</strong> Valeur (une colonne)</p>
          </div>
        </SectionCard>

        <SectionCard title="Historique des imports">
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
                  <Button size="sm" variant="ghost" onClick={() => appActions.setActiveFile(i)} title="Ouvrir">
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => appActions.removeFile(i)} title="Supprimer">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {activeFile && activeSheet && (
        <SectionCard
          title={`Prévisualisation : ${activeFile.name}`}
          actions={
            <Select value={String(activeSheetIndex)} onValueChange={(v) => appActions.setActiveSheet(Number(v))}>
              <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {activeFile.sheets.map((s, i) => (
                  <SelectItem key={i} value={String(i)}>{s.name} ({s.rows.length} lignes)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="text-muted-foreground border-b border-border">
                  <th className="px-3 py-2 text-left font-medium w-12">#</th>
                  {activeSheet.headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeSheet.rows.slice(0, 200).map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                    {activeSheet.headers.map((h, j) => (
                      <td key={j} className="px-3 py-1.5 tabular-nums">{r[h] ?? "-"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {activeSheet.rows.length > 200 && (
              <div className="text-xs text-muted-foreground text-center py-3">
                Affichage des 200 premières lignes sur {activeSheet.rows.length}
              </div>
            )}
          </div>
        </SectionCard>
      )}
    </AppLayout>
  );
};

export default DataPage;

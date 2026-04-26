import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore, appActions, analyzeCompatibility } from "@/store/app-store";
import { CheckCircle2, AlertTriangle, Eye, Layers, Play, FileSpreadsheet, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const ImportPlanPage = () => {
  const files = useAppStore((s) => s.files);
  const plan = useAppStore((s) => s.importPlan);
  const merged = useAppStore((s) => s.mergedSheet);

  const compat = useMemo(() => analyzeCompatibility(files, plan), [files, plan]);
  const [aliasDraft, setAliasDraft] = useState<Record<string, string>>({});

  const allHeadersByOrigin = useMemo(() => {
    const map = new Map<string, { sheets: string[]; canonical: string }>();
    files.forEach((f, fi) =>
      f.sheets.forEach((s, si) => {
        const key = `${fi}::${si}`;
        if (plan.enabledSheets[key] === false) return;
        const label = `${f.name} / ${s.name}`;
        s.headers.forEach((h) => {
          const canonical = plan.columnAliases[h] ?? h;
          const ex = map.get(h) ?? { sheets: [], canonical };
          ex.sheets.push(label);
          ex.canonical = canonical;
          map.set(h, ex);
        });
      })
    );
    return Array.from(map.entries()).map(([orig, v]) => ({ original: orig, ...v }));
  }, [files, plan]);

  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const enabled = Object.entries(plan.enabledSheets).filter(([, v]) => v).length;
    if (files.length === 0) errors.push("Aucun fichier importé.");
    else if (enabled === 0) errors.push("Aucune feuille sélectionnée pour la fusion.");
    if (compat.commonHeaders.length === 0 && enabled > 1)
      warnings.push("Aucune colonne commune entre les feuilles sélectionnées.");
    if (compat.unionHeaders.length === 0 && enabled > 0)
      errors.push("Aucune colonne disponible après filtrage.");
    return { errors, warnings, ok: errors.length === 0 };
  }, [plan, files, compat]);

  const applyAlias = (orig: string) => {
    const v = aliasDraft[orig] ?? "";
    appActions.setColumnAlias(orig, v.trim());
    toast.success("Alias appliqué", { description: v ? `${orig} → ${v}` : `${orig} : alias supprimé` });
  };

  return (
    <AppLayout title="Plan d'import" subtitle="Choisissez les feuilles et les champs à fusionner avant analyse">
      {files.length === 0 && (
        <SectionCard title="Démarrer">
          <div className="text-sm text-muted-foreground mb-4">
            Importez d'abord un ou plusieurs fichiers Excel.
          </div>
          <Link to="/data">
            <Button>Aller à la page Données</Button>
          </Link>
        </SectionCard>
      )}

      {files.length > 0 && (
        <Tabs defaultValue="sheets">
          <TabsList className="mb-4">
            <TabsTrigger value="sheets">1. Feuilles</TabsTrigger>
            <TabsTrigger value="columns">2. Colonnes</TabsTrigger>
            <TabsTrigger value="validation">3. Validation</TabsTrigger>
            <TabsTrigger value="preview">4. Aperçu fusion</TabsTrigger>
          </TabsList>

          {/* SHEETS */}
          <TabsContent value="sheets">
            <SectionCard title="Feuilles à inclure dans la fusion">
              <div className="space-y-3">
                {files.map((f, fi) => (
                  <div key={fi} className="border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 font-medium text-sm mb-2">
                      <FileSpreadsheet className="w-4 h-4 text-success" />
                      {f.name}
                      <Badge variant="outline" className="ml-auto">{f.sheets.length} feuille(s)</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                      {f.sheets.map((s, si) => {
                        const key = `${fi}::${si}`;
                        const checked = plan.enabledSheets[key] !== false;
                        return (
                          <label key={si} className="flex items-center gap-2 text-sm p-2 rounded border border-border/50 hover:bg-accent/30 cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => appActions.setSheetEnabled(fi, si, !!v)}
                            />
                            <span className="flex-1">{s.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {s.rows.length}L · {s.headers.length}C
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </TabsContent>

          {/* COLUMNS */}
          <TabsContent value="columns">
            <SectionCard title="Renommer / exclure des colonnes">
              <p className="text-xs text-muted-foreground mb-3">
                Donnez le même alias à des colonnes équivalentes pour les fusionner. Excluez celles qui ne doivent pas
                apparaître dans le dataset final.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                      <th className="text-left py-2 px-2">Colonne d'origine</th>
                      <th className="text-left py-2 px-2">Présente dans</th>
                      <th className="text-left py-2 px-2">Alias (nom canonique)</th>
                      <th className="text-left py-2 px-2 w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allHeadersByOrigin.map(({ original, sheets, canonical }) => {
                      const excluded = plan.excludedColumns.includes(canonical);
                      return (
                        <tr key={original} className={`border-b border-border/50 ${excluded ? "opacity-50" : ""}`}>
                          <td className="px-2 py-2 font-medium">{original}</td>
                          <td className="px-2 py-2 text-xs text-muted-foreground">
                            {sheets.length} feuille(s)
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              className="h-8 text-xs"
                              placeholder={original}
                              value={aliasDraft[original] ?? (canonical !== original ? canonical : "")}
                              onChange={(e) => setAliasDraft({ ...aliasDraft, [original]: e.target.value })}
                              onBlur={() => applyAlias(original)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              }}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Button
                              size="sm"
                              variant={excluded ? "default" : "ghost"}
                              onClick={() => appActions.toggleExcludedColumn(canonical)}
                            >
                              <X className="w-3.5 h-3.5 mr-1" />
                              {excluded ? "Réintégrer" : "Exclure"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </TabsContent>

          {/* VALIDATION */}
          <TabsContent value="validation">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SectionCard title="Rapport de compatibilité">
                <div className="space-y-2 text-sm">
                  <div>Colonnes union : <strong>{compat.unionHeaders.length}</strong></div>
                  <div>Colonnes communes à toutes les feuilles : <strong className="text-success">{compat.commonHeaders.length}</strong></div>
                  <div>Colonnes ignorées : <strong className="text-destructive">{compat.ignored.length}</strong></div>
                  <div>Colonnes renommées : <strong className="text-info">{compat.renamed.length}</strong></div>
                </div>

                {compat.commonHeaders.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Communes</div>
                    <div className="flex flex-wrap gap-1.5">
                      {compat.commonHeaders.map((h) => (
                        <Badge key={h} className="bg-success/20 text-success border-success/30" variant="outline">{h}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {compat.ignored.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Ignorées</div>
                    <div className="flex flex-wrap gap-1.5">
                      {compat.ignored.map((h) => (
                        <Badge key={h} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">{h}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {compat.renamed.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Renommées</div>
                    <ul className="text-xs space-y-1">
                      {compat.renamed.map((r, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-muted-foreground">{r.from}</span>
                          <span>→</span>
                          <strong>{r.to}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Colonnes propres à une seule feuille">
                {compat.perSheetUnique.filter((s) => s.unique.length > 0).length === 0 ? (
                  <div className="text-sm text-muted-foreground">Aucune colonne unique — toutes apparaissent dans plusieurs feuilles.</div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {compat.perSheetUnique
                      .filter((s) => s.unique.length > 0)
                      .map((s, i) => (
                        <div key={i}>
                          <div className="text-xs font-semibold mb-1">{s.sheetLabel}</div>
                          <div className="flex flex-wrap gap-1">
                            {s.unique.map((u) => (
                              <Badge key={u} variant="outline" className="bg-warning/10 text-warning border-warning/30">{u}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-border">
                  {validation.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-destructive mb-1">
                      <AlertTriangle className="w-4 h-4" /> {e}
                    </div>
                  ))}
                  {validation.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-warning mb-1">
                      <AlertTriangle className="w-4 h-4" /> {w}
                    </div>
                  ))}
                  {validation.ok && (
                    <div className="flex items-center gap-2 text-success text-sm">
                      <CheckCircle2 className="w-5 h-5" /> Plan d'import valide.
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          </TabsContent>

          {/* PREVIEW */}
          <TabsContent value="preview">
            <SectionCard
              title={
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Aperçu du dataset fusionné
                  {merged && <Badge variant="outline">{merged.rows.length}L · {merged.headers.length}C</Badge>}
                </span>
              }
              actions={
                <Link to="/spc">
                  <Button size="sm" disabled={!validation.ok} className="gap-1">
                    <Play className="w-3.5 h-3.5" /> Lancer les analyses
                  </Button>
                </Link>
              }
            >
              {!merged ? (
                <div className="text-sm text-muted-foreground">Aucune fusion disponible. Vérifiez les feuilles sélectionnées.</div>
              ) : (
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card">
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="px-2 py-2 text-left font-medium w-10">#</th>
                        {merged.headers.map((h) => (
                          <th key={h} className="px-2 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {merged.rows.slice(0, 100).map((r, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                          {merged.headers.map((h) => (
                            <td key={h} className="px-2 py-1 tabular-nums">{r[h] ?? "-"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {merged.rows.length > 100 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      Affichage 100 / {merged.rows.length} lignes
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
};

export default ImportPlanPage;

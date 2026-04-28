// Auto-detection of Excel file structure (MSA vs SPC/Capabilité)
// Returns a suggested ColumnMapping based purely on the imported data — no hardcoding.
import type { ParsedSheet } from "@/lib/excel";
import type { ColumnMapping } from "@/store/app-store";

export type DetectedKind = "msa" | "spc" | "unknown";

export interface DetectionResult {
  kind: DetectedKind;
  mapping: Partial<ColumnMapping>;
  suggestedSubgroupSize: number | null;
  reason: string;
}

const isNumericColumn = (sheet: ParsedSheet, col: string, threshold = 0.7): boolean => {
  const sample = sheet.rows.slice(0, 100);
  if (sample.length === 0) return false;
  const ok = sample.filter((r) => r[col] != null && r[col] !== "" && !isNaN(Number(r[col]))).length;
  return ok / sample.length >= threshold;
};

const matchHeader = (headers: string[], patterns: RegExp[]): string | null => {
  for (const p of patterns) {
    const found = headers.find((h) => p.test(String(h).toLowerCase().trim()));
    if (found) return found;
  }
  return null;
};

export function detectSheet(sheet: ParsedSheet): DetectionResult {
  const headers = sheet.headers.filter((h) => h && !h.startsWith("__"));

  // Try MSA detection: requires Part + Operator + a numeric value column
  const partCol = matchHeader(headers, [/^part$/i, /^pi[èe]ce$/i, /^sample$/i, /^échantillon$/i]);
  const operatorCol = matchHeader(headers, [/^operator$/i, /^op[eé]rateur$/i, /^op$/i, /^appraiser$/i]);
  const trialCol = matchHeader(headers, [/^trial$/i, /^essai$/i, /^repet/i, /^run$/i]);
  const valueCol = matchHeader(headers, [
    /^measurement$/i,
    /^mesure$/i,
    /^value$/i,
    /^valeur$/i,
    /^reading$/i,
  ]);

  if (partCol && operatorCol && (valueCol || headers.some((h) => isNumericColumn(sheet, h)))) {
    const finalValueCol =
      valueCol ?? headers.find((h) => h !== partCol && h !== operatorCol && h !== trialCol && isNumericColumn(sheet, h)) ?? null;
    if (finalValueCol) {
      return {
        kind: "msa",
        mapping: {
          partCol,
          operatorCol,
          trialCol,
          valueCol: finalValueCol,
          measureCols: [finalValueCol],
        },
        suggestedSubgroupSize: null,
        reason: `Format MSA détecté (Pièce/Opérateur/Mesure).`,
      };
    }
  }

  // SPC detection: numeric measure columns (M1..Mn, Mesure1.., or just numeric series)
  const measureCols = headers.filter((h) => {
    if (!isNumericColumn(sheet, h)) return false;
    // Exclude obvious index/id columns
    if (/^(nb|n°|num|index|id|sub|sous.?groupe|sample)$/i.test(h)) return false;
    return true;
  });

  if (measureCols.length >= 2) {
    return {
      kind: "spc",
      mapping: {
        measureCols,
        partCol: null,
        operatorCol: null,
        trialCol: null,
        valueCol: null,
      },
      suggestedSubgroupSize: measureCols.length,
      reason: `Format SPC/Capabilité détecté (${measureCols.length} colonnes de mesures par sous-groupe).`,
    };
  }

  if (measureCols.length === 1) {
    return {
      kind: "spc",
      mapping: {
        measureCols,
        valueCol: measureCols[0],
        partCol: null,
        operatorCol: null,
        trialCol: null,
      },
      suggestedSubgroupSize: 5,
      reason: `Une seule colonne numérique détectée — sera scindée en sous-groupes.`,
    };
  }

  return {
    kind: "unknown",
    mapping: {},
    suggestedSubgroupSize: null,
    reason: "Structure non reconnue — utilisez l'assistant de mappage.",
  };
}

// Detect across all sheets of all files: prefer the most informative one.
// If we find both kinds (e.g. MSA + SPC), merge them into a single mapping.
export function detectMulti(sheets: { fileIdx: number; sheetIdx: number; sheet: ParsedSheet }[]): {
  combined: Partial<ColumnMapping>;
  perSheet: { fileIdx: number; sheetIdx: number; result: DetectionResult }[];
  suggestedSubgroupSize: number | null;
} {
  const perSheet = sheets.map((s) => ({ fileIdx: s.fileIdx, sheetIdx: s.sheetIdx, result: detectSheet(s.sheet) }));
  const msa = perSheet.find((p) => p.result.kind === "msa");
  const spc = perSheet.find((p) => p.result.kind === "spc");

  const combined: Partial<ColumnMapping> = {};
  if (spc) Object.assign(combined, spc.result.mapping);
  if (msa) {
    // MSA fields complement SPC measure fields
    combined.partCol = msa.result.mapping.partCol ?? combined.partCol ?? null;
    combined.operatorCol = msa.result.mapping.operatorCol ?? combined.operatorCol ?? null;
    combined.trialCol = msa.result.mapping.trialCol ?? combined.trialCol ?? null;
    combined.valueCol = msa.result.mapping.valueCol ?? combined.valueCol ?? null;
    if (!combined.measureCols || combined.measureCols.length === 0) {
      combined.measureCols = msa.result.mapping.measureCols ?? [];
    }
  }

  return {
    combined,
    perSheet,
    suggestedSubgroupSize: spc?.result.suggestedSubgroupSize ?? null,
  };
}

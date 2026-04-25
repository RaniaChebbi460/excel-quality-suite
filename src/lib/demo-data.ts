// Demo dataset to show the dashboard fully populated when no Excel file is loaded
export const DEMO_SUBGROUPS: number[][] = [
  [10.02, 10.01, 10.03, 10.0, 10.04],
  [10.01, 10.02, 10.0, 9.99, 10.03],
  [10.03, 10.02, 10.05, 10.01, 10.03],
  [9.99, 10.02, 10.01, 10.0, 10.0],
  [10.02, 10.01, 10.03, 10.0, 10.04],
  [10.0, 10.03, 10.02, 10.01, 10.04],
  [10.04, 10.02, 10.01, 10.03, 10.0],
  [10.01, 10.0, 10.02, 10.03, 10.02],
  [10.02, 10.04, 10.01, 10.0, 10.03],
  [10.05, 10.03, 10.02, 10.04, 10.01],
  [10.01, 10.02, 10.0, 10.03, 10.04],
  [10.0, 10.01, 10.02, 10.03, 10.0],
  [10.02, 10.05, 10.04, 10.01, 10.03],
  [10.03, 10.02, 10.01, 10.0, 10.04],
  [10.18, 10.05, 10.04, 10.02, 10.03], // an outlier subgroup
  [10.02, 10.01, 10.03, 10.0, 10.04],
  [10.01, 10.02, 10.0, 9.98, 10.03],
  [10.04, 10.03, 10.02, 10.01, 10.0],
  [10.02, 10.0, 10.03, 10.01, 10.04],
  [10.01, 10.02, 10.0, 10.03, 10.02],
  [10.03, 10.04, 10.02, 10.01, 10.0],
  [10.02, 10.01, 10.03, 10.0, 10.02],
  [10.0, 10.02, 10.01, 10.03, 10.04],
  [10.01, 10.03, 10.02, 10.0, 10.02],
  [10.02, 10.01, 10.03, 10.0, 10.04],
];

export const DEMO_SPEC = { lsl: 9.5, usl: 10.5, target: 10 };

// Build demo MSA dataset: 10 parts × 3 operators × 3 trials
export const DEMO_MSA = (() => {
  const data: { part: number; operator: string; trial: number; value: number }[] = [];
  const opBias = { A: 0, B: 0.05, C: -0.03 };
  for (let p = 1; p <= 10; p++) {
    const partTrue = 10 + (p - 5.5) * 0.04;
    (Object.keys(opBias) as (keyof typeof opBias)[]).forEach((op) => {
      for (let t = 1; t <= 3; t++) {
        const noise = (Math.sin(p * 7 + t * 11 + op.charCodeAt(0)) * 0.04);
        data.push({ part: p, operator: op, trial: t, value: partTrue + opBias[op] + noise });
      }
    });
  }
  return data;
})();

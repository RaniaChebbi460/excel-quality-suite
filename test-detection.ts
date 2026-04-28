import { detectSheet } from "./src/lib/auto-detect.js";
import type { ParsedSheet } from "./src/lib/excel.js";

// Test data simulating typical Excel files
const testSheets: { name: string; data: ParsedSheet }[] = [
  {
    name: "Dashboard Example",
    data: {
      name: "Dashboard",
      headers: ["KPI", "Target", "Actual", "Performance", "Status"],
      rows: [
        { KPI: "Yield", Target: "95%", Actual: "93.2%", Performance: "98.1%", Status: "Good" },
        { KPI: "Defects", Target: "50", Actual: "45", Performance: "90%", Status: "Excellent" },
        { KPI: "CPK", Target: "1.33", Actual: "1.45", Performance: "109%", Status: "Good" }
      ],
      matrix: []
    }
  },
  {
    name: "SPC Card Example",
    data: {
      name: "SPC_Data",
      headers: ["Subgroup", "X1", "X2", "X3", "X4", "X5", "Mean", "Range", "UCL", "LCL"],
      rows: [
        { Subgroup: 1, X1: 10.1, X2: 10.2, X3: 9.9, X4: 10.0, X5: 10.1, Mean: 10.06, Range: 0.3, UCL: 10.5, LCL: 9.5 },
        { Subgroup: 2, X1: 10.0, X2: 9.8, X3: 10.1, X4: 9.9, X5: 10.2, Mean: 10.0, Range: 0.4, UCL: 10.5, LCL: 9.5 }
      ],
      matrix: []
    }
  },
  {
    name: "MSA R&R Example",
    data: {
      name: "MSA_RR",
      headers: ["Part", "Operator", "Trial", "Measurement"],
      rows: [
        { Part: "P1", Operator: "Op1", Trial: 1, Measurement: 10.1 },
        { Part: "P1", Operator: "Op1", Trial: 2, Measurement: 10.2 },
        { Part: "P1", Operator: "Op2", Trial: 1, Measurement: 9.9 },
        { Part: "P1", Operator: "Op2", Trial: 2, Measurement: 10.0 },
        { Part: "P2", Operator: "Op1", Trial: 1, Measurement: 10.3 }
      ],
      matrix: []
    }
  },
  {
    name: "Capability Example",
    data: {
      name: "Capability",
      headers: ["Measurement"],
      rows: [
        { Measurement: 10.1 },
        { Measurement: 9.8 },
        { Measurement: 10.2 },
        { Measurement: 9.9 },
        { Measurement: 10.0 }
      ],
      matrix: []
    }
  },
  {
    name: "Uncertainty Example",
    data: {
      name: "Uncertainty",
      headers: ["Parameter", "Value", "Uncertainty", "Type"],
      rows: [
        { Parameter: "Length", Value: 100.0, Uncertainty: 0.5, Type: "Standard" },
        { Parameter: "Width", Value: 50.0, Uncertainty: 0.2, Type: "Expanded" }
      ],
      matrix: []
    }
  }
];

// Test the detection system
console.log("=== Testing Excel File Detection System ===\n");

testSheets.forEach(({ name, data }) => {
  console.log(`\n--- Testing: ${name} ---`);
  const detection = detectSheet(data);
  console.log(`Detected type: ${detection.kind}`);
  console.log(`Confidence: ${(detection.confidence * 100).toFixed(1)}%`);
  console.log(`Reason: ${detection.reason}`);

  if (detection.mapping.measureCols?.length) {
    console.log(`Measure columns: ${detection.mapping.measureCols.join(', ')}`);
  }
  if (detection.mapping.partCol) {
    console.log(`Part column: ${detection.mapping.partCol}`);
  }
  if (detection.mapping.operatorCol) {
    console.log(`Operator column: ${detection.mapping.operatorCol}`);
  }
  if (detection.mapping.trialCol) {
    console.log(`Trial column: ${detection.mapping.trialCol}`);
  }
  if (detection.mapping.valueCol) {
    console.log(`Value column: ${detection.mapping.valueCol}`);
  }
});

console.log("\n=== Test Complete ===");
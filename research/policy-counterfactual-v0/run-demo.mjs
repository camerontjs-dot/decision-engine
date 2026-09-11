import { OUTCOME, SEVERITY, defineBar } from "../../src/gate/gateHead.js";
import { classifyGateUnknowns } from "./policyCounterfactual.mjs";

const outcomeFor = (value) => value === "pass" ? OUTCOME.PASS : value === "fail" ? OUTCOME.FAIL : OUTCOME.UNKNOWN;

const bar = defineBar({
  id: "research.policy-counterfactual.demo",
  version: "0.1.0",
  requiresHumanApproval: true,
  criteria: [
    { id: "evidence-ready", description: "Required evidence is ready.", severity: SEVERITY.BLOCKING, evaluate: (item) => ({ outcome: outcomeFor(item.evidenceStatus), observed: item.evidenceStatus }) },
    { id: "authority-known", description: "Required authority condition is known.", severity: SEVERITY.BLOCKING, evaluate: (item) => ({ outcome: outcomeFor(item.authorityStatus), observed: item.authorityStatus }) },
    { id: "documentation-note", description: "Documentation note is present.", severity: SEVERITY.ADVISORY, evaluate: (item) => ({ outcome: outcomeFor(item.documentationStatus), observed: item.documentationStatus }) },
    { id: "retention-recorded", description: "Retention metadata is recorded.", severity: SEVERITY.ADVISORY, evaluate: (item) => ({ outcome: outcomeFor(item.retentionStatus), observed: item.retentionStatus }) },
  ],
});

const item = {
  id: "case-001",
  evidenceStatus: "unknown",
  authorityStatus: "pass",
  documentationStatus: "unknown",
  retentionStatus: "unknown",
};

const result = classifyGateUnknowns({
  item,
  bar,
  candidates: [
    { id: "evidence-status", path: ["evidenceStatus"], admissibleValues: ["pass", "fail"] },
    { id: "documentation-status", path: ["documentationStatus"], admissibleValues: ["pass", "fail"] },
    { id: "retention-status", path: ["retentionStatus"], admissibleValues: ["pass", "fail"], policyMandatory: true },
  ],
});

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

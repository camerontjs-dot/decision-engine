import { exportContractD } from "../src/contractD.js";
import { contractDDecisionStates } from "../tests/fixtures/contractDDecisionStates.mjs";

const decisions = Object.fromEntries(
  Object.entries(contractDDecisionStates).map(([name, state]) => [name, exportContractD(state)])
);

process.stdout.write(JSON.stringify({ producer: "decision-engine-contract-d-v1", decisions }, null, 2) + "\n");
